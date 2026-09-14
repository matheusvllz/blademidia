import {
  createMessage,
  findBarbershopByWhatsappPhoneNumberId,
  findClientByPhone,
  findOrCreateConversation,
  linkClientToConversation,
} from "@blademidia/db";
import {
  phoneCandidates,
  resolveWhatsAppProvider,
  WHATSAPP_INBOUND_QUEUE,
  type NormalizedMessageEvent,
} from "@blademidia/whatsapp";
import { NextResponse } from "next/server";
import { enqueue } from "@/lib/queue";

/**
 * Webhook único do canal WhatsApp (ADR-0011, design.md Flow 1/2/Error Flow 4). Único ponto de
 * entrada de mensagem para TODAS as barbearias — a Meta/BSP identifica o número de destino
 * via `phone_number_id`, resolvido para a barbearia dona (design.md Decision 7).
 *
 * O que este handler faz — e só isso: verifica assinatura, normaliza, resolve/cria a
 * conversa, persiste a mensagem (dedupe por wamid) e enfileira o processamento (last_inbound_at
 * + detecção de handover). NUNCA roda o loop de IA nem qualquer lógica lenta aqui — isso é
 * `add-atendimento-ia` (Fase 5.2), sempre no worker.
 */

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const provider = resolveWhatsAppProvider();
  const challenge = provider.respondToChallenge(url.searchParams);
  if (challenge === null) {
    return new Response("forbidden", { status: 403 });
  }
  return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

async function handleInboundMessage(message: NormalizedMessageEvent): Promise<void> {
  const barbershop = await findBarbershopByWhatsappPhoneNumberId(message.waPhoneNumberId);
  if (!barbershop) {
    // Error Flow 4 (design.md): número não reconhecido por nenhuma barbearia. Não é falha
    // transitória — não relançar, não reentregar. Sem conteúdo de mensagem no log.
    console.log(`[whatsapp] evento para phone_number_id não reconhecido — ignorado`);
    return;
  }

  let clientId: string | null = null;
  for (const candidate of phoneCandidates(message.clientPhone)) {
    const found = await findClientByPhone(barbershop.id, candidate);
    if (found) {
      clientId = found.id;
      break;
    }
  }

  const conversation = await findOrCreateConversation(
    barbershop.id,
    message.waPhoneNumberId,
    message.clientPhone,
    clientId,
  );

  if (clientId && !conversation.clientId) {
    await linkClientToConversation(barbershop.id, conversation.id, clientId);
  }

  const direction = message.origin === "cliente" ? "entrada" : "saida";
  const created = await createMessage(barbershop.id, {
    conversationId: conversation.id,
    wamid: message.wamid,
    direction,
    type: message.type,
    body: message.body,
    occurredAt: message.occurredAt,
  });

  if (created.alreadyProcessed) {
    // Error Flow 3 (design.md): reentrega da mesma mensagem — já tratada, não reenfileira.
    console.log(`[whatsapp] mensagem duplicada (reentrega) tenant=${barbershop.id} — ignorada`);
    return;
  }

  console.log(
    `[whatsapp] webhook recebido tenant=${barbershop.id} conversation=${conversation.id} origin=${message.origin}`,
  );

  await enqueue(
    WHATSAPP_INBOUND_QUEUE,
    {
      barbershopId: barbershop.id,
      conversationId: conversation.id,
      origin: message.origin,
      occurredAt: message.occurredAt.toISOString(),
      // Só para o worker checar opt-out (PARE/SAIR) — já está persistido em whatsapp_messages;
      // isto não é um log, é payload de job.
      body: message.type === "texto" ? message.body : null,
    },
    { singletonKey: conversation.id },
  );
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-hub-signature-256");
  const provider = resolveWhatsAppProvider();

  // Verificação SEMPRE sobre o corpo cru — nunca sobre JSON re-serializado (plano § 4.4).
  if (!provider.verifySignature(rawBody, signatureHeader)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    // Assinado mas corpo não é JSON válido — não é falha transitória; responde 200 para não
    // gerar reentrega inútil, mas não há nada para processar.
    return NextResponse.json({ ok: true });
  }

  const events = provider.normalizeWebhookPayload(parsedBody);

  for (const event of events) {
    if (event.kind !== "mensagem") continue;
    await handleInboundMessage(event.message);
  }

  return NextResponse.json({ ok: true });
}
