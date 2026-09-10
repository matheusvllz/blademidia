import {
  createMessage,
  getBarbershop,
  getClient,
  getConversation,
  incrementBotStallCount,
  listMessages,
  listServices,
  listWorkSchedulesForBarbershop,
  markHandover,
  markOptOut,
  recordUsage,
  resetBotStallCount,
  updateLastInboundAt,
} from "@blademidia/db";
import {
  DEFAULT_AI_MODEL,
  HANDOFF_MESSAGE,
  buildContextNote,
  buildSystemPrompt,
  isAiProviderError,
  mapHistoryToMessages,
  resolveAiClient,
  runConversationTurn,
  shouldForceStallEscalation,
} from "@blademidia/ai";
import { WHATSAPP_INBOUND_QUEUE, resolveWhatsAppProvider, type MessageOrigin } from "@blademidia/whatsapp";
import type PgBoss from "pg-boss";

/**
 * Job REAL da Fase 5 (`add-whatsapp-canal`, design.md Flow 1/2, ADR-0011): consome a fila que
 * o webhook (`apps/web`) enfileira após persistir cada mensagem recebida. Atualiza
 * `last_inbound_at` (só para mensagem do cliente — é o que abre/renova a janela de 24h),
 * detecta/marca `handover` quando a mensagem veio do próprio número do negócio via app
 * (coexistência), e — Fase 5.2 (`add-atendimento-ia`, design.md "Proposed Architecture") —
 * aciona o loop de conversa por IA quando a conversa está com `handover = bot` e sem opt-out.
 *
 * Enfileirado com `singletonKey = conversationId` (design.md Decision 4 de `add-whatsapp-canal`):
 * duas mensagens da mesma conversa em sequência rápida nunca processam em paralelo.
 */

interface ProcessInboundJobData {
  barbershopId: string;
  conversationId: string;
  origin: MessageOrigin;
  occurredAt: string; // ISO 8601
  /** Corpo da mensagem de TEXTO, só para checagem de opt-out — nunca logado; usado só para
   * comparação, nunca persistido de novo (já está em whatsapp_messages). */
  body: string | null;
}

/** "PARE"/"SAIR" (case-insensitive, com ou sem espaço/pontuação nas bordas) — vocabulário do
 * cliente final, não do barbeiro (guia de copy não se aplica aqui: é comando, não conteúdo de
 * marca). */
const OPT_OUT_PATTERN = /^\s*(pare|sair)[\s.!]*$/i;

export function isOptOutMessage(body: string | null): boolean {
  if (!body) return false;
  return OPT_OUT_PATTERN.test(body);
}

const MAX_TOKENS = 1024; // plano § 4.1 — mensagem de WhatsApp é curta, deliberadamente abaixo do padrão geral
const MAX_TOOL_ITERATIONS = 6; // design.md da change `add-atendimento-ia`, Decision 9

export async function processInboundMessage(data: ProcessInboundJobData): Promise<void> {
  const { barbershopId, conversationId, origin, occurredAt, body } = data;

  if (origin === "cliente") {
    await updateLastInboundAt(barbershopId, conversationId, new Date(occurredAt));

    if (isOptOutMessage(body)) {
      await markOptOut(barbershopId, conversationId);
      console.log(`[worker] ${WHATSAPP_INBOUND_QUEUE}: conversation=${conversationId} opt-out registrado`);
      return; // opt-out nunca aciona o bot, mesmo no mesmo turno em que foi registrado
    }

    await respondWithAiIfApplicable(barbershopId, conversationId);
  }

  if (origin === "negocio_via_app") {
    // Barbeiro respondeu pelo próprio WhatsApp Business App sob coexistência — o bot silencia
    // até devolução explícita (mecanismo de devolução é fora do escopo desta change).
    await markHandover(barbershopId, conversationId, "humano");
  }

  console.log(
    `[worker] ${WHATSAPP_INBOUND_QUEUE}: conversation=${conversationId} origin=${origin}`,
  );
}

/**
 * Orquestra um turno de IA para a conversa (design.md "Proposed Architecture", Flows 1-3, Error
 * Flows 1/4). Só roda se a conversa ainda estiver com o bot; falhas do provedor de IA degradam
 * para humano sem lançar (Decision 8) — a mensagem do cliente já está persistida desde o
 * webhook, então nada se perde mesmo se este bloco inteiro falhar silenciosamente.
 */
async function respondWithAiIfApplicable(barbershopId: string, conversationId: string): Promise<void> {
  const conversation = await getConversation(barbershopId, conversationId);
  if (!conversation) return;
  if (conversation.handover !== "bot") return; // humano no controle — bot fica em silêncio
  if (conversation.optedOutAt) return; // defesa em profundidade

  const [barbershop, services, workSchedules, history, client] = await Promise.all([
    getBarbershop(barbershopId),
    listServices(barbershopId),
    listWorkSchedulesForBarbershop(barbershopId),
    listMessages(barbershopId, conversationId),
    conversation.clientId ? getClient(barbershopId, conversation.clientId) : Promise.resolve(null),
  ]);
  if (!barbershop) return; // não deveria acontecer — defesa

  const systemPrompt = buildSystemPrompt({
    barbershopName: barbershop.name,
    services: services.map((s) => ({ name: s.name, durationMin: s.durationMin, priceCents: s.priceCents })),
    workSchedules: workSchedules.map((w) => ({ weekday: w.weekday, startTime: w.startTime, endTime: w.endTime })),
    hasClientOnFile: Boolean(conversation.clientId),
  });

  const messages = mapHistoryToMessages(history);
  const last = messages[messages.length - 1];
  if (last && last.role === "user") {
    const contextNote = buildContextNote({
      todayIso: new Date().toISOString().slice(0, 10),
      clientName: client?.name ?? null,
    });
    last.content = `${contextNote}\n${last.content}`;
  }

  const aiClient = resolveAiClient(process.env);
  const phone = conversation.phone;
  if (!phone) return; // conversa anonimizada (LGPD) — não deveria mais receber turno de IA

  let turn: Awaited<ReturnType<typeof runConversationTurn>>;
  try {
    turn = await runConversationTurn({
      aiClient,
      model: process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL,
      maxTokens: MAX_TOKENS,
      maxToolIterations: MAX_TOOL_ITERATIONS,
      systemPrompt,
      messages,
      barbershopId,
      domainContext: { conversationId, phone },
    });
  } catch (error) {
    if (isAiProviderError(error)) {
      await markHandover(barbershopId, conversationId, "humano");
      const errorType = error instanceof Error ? error.constructor.name : "erro_desconhecido";
      console.log(
        `[worker] ${WHATSAPP_INBOUND_QUEUE}: conversation=${conversationId} erro_ia=${errorType} — handover=humano`,
      );
      return;
    }
    throw error; // erro inesperado (bug nosso) — deixa o pg-boss reter/retentar, não é degradação
  }

  await recordUsage(barbershopId, {
    conversationId,
    model: process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL,
    inputTokens: turn.usage.inputTokens,
    outputTokens: turn.usage.outputTokens,
    cacheReadTokens: turn.usage.cacheReadTokens,
    cacheCreationTokens: turn.usage.cacheCreationTokens,
  });

  let replyText = turn.finalText;
  let mustEscalate = turn.escalate.requested;

  if (turn.domainToolCalled) {
    await resetBotStallCount(barbershopId, conversationId);
  } else if (!mustEscalate) {
    const stallCount = await incrementBotStallCount(barbershopId, conversationId);
    if (shouldForceStallEscalation(stallCount)) {
      mustEscalate = true;
    }
  }

  if (mustEscalate) {
    await markHandover(barbershopId, conversationId, "humano");
    replyText = HANDOFF_MESSAGE;
    console.log(
      `[worker] ${WHATSAPP_INBOUND_QUEUE}: conversation=${conversationId} escalado motivo=${turn.escalate.reason ?? "estagnacao"}`,
    );
  }

  if (!replyText) return; // sem texto e sem escalação (ex.: limite de iterações) — próximo turno tenta de novo

  const provider = resolveWhatsAppProvider(process.env);
  const sendResult = await provider.sendText(
    { waPhoneNumberId: conversation.waPhoneNumberId, toPhone: phone, body: replyText },
    { lastInboundAt: new Date(), optedOutAt: conversation.optedOutAt },
  );

  if (!sendResult.ok) {
    console.log(`[worker] ${WHATSAPP_INBOUND_QUEUE}: conversation=${conversationId} envio_recusado=${sendResult.reason}`);
    return;
  }

  await createMessage(barbershopId, {
    conversationId,
    wamid: sendResult.wamid,
    direction: "saida",
    type: "texto",
    body: replyText,
    occurredAt: new Date(),
  });
}

export async function registerProcessInbound(boss: PgBoss): Promise<void> {
  await boss.createQueue(WHATSAPP_INBOUND_QUEUE);
  await boss.work<ProcessInboundJobData>(WHATSAPP_INBOUND_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await processInboundMessage(job.data);
    }
  });
}
