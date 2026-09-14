import { markHandover, markOptOut, updateLastInboundAt } from "@blademidia/db";
import { WHATSAPP_INBOUND_QUEUE, type MessageOrigin } from "@blademidia/whatsapp";
import type PgBoss from "pg-boss";

/**
 * Job REAL da Fase 5 (`add-whatsapp-canal`, design.md Flow 1/2, ADR-0011): consome a fila que
 * o webhook (`apps/web`) enfileira após persistir cada mensagem recebida. Só faz o que o
 * webhook deliberadamente NÃO faz inline: atualizar `last_inbound_at` (só para mensagem do
 * cliente — é o que abre/renova a janela de 24h) e detectar/marcar `handover` quando a
 * mensagem veio do próprio número do negócio via app (coexistência, Decision 5 do design.md).
 *
 * Enfileirado com `singletonKey = conversationId` (design.md Decision 4): duas mensagens da
 * mesma conversa em sequência rápida nunca processam em paralelo.
 *
 * O loop de IA (`add-atendimento-ia`) entra aqui na Fase 5.2 — nesta change não há resposta
 * automática.
 */

interface ProcessInboundJobData {
  barbershopId: string;
  conversationId: string;
  origin: MessageOrigin;
  occurredAt: string; // ISO 8601
  /** Corpo da mensagem de TEXTO, só para checagem de opt-out (design.md § tasks 5.1) — nunca
   * logado; usado só para comparação, nunca persistido de novo (já está em whatsapp_messages). */
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

export async function processInboundMessage(data: ProcessInboundJobData): Promise<void> {
  const { barbershopId, conversationId, origin, occurredAt, body } = data;

  if (origin === "cliente") {
    await updateLastInboundAt(barbershopId, conversationId, new Date(occurredAt));

    if (isOptOutMessage(body)) {
      await markOptOut(barbershopId, conversationId);
      console.log(`[worker] ${WHATSAPP_INBOUND_QUEUE}: conversation=${conversationId} opt-out registrado`);
    }
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

export async function registerProcessInbound(boss: PgBoss): Promise<void> {
  await boss.createQueue(WHATSAPP_INBOUND_QUEUE);
  await boss.work<ProcessInboundJobData>(WHATSAPP_INBOUND_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await processInboundMessage(job.data);
    }
  });
}
