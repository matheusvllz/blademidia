import type { ConversationMessage } from "../types";

/**
 * Converte o histórico já persistido (`whatsapp_messages`, ordenado por `occurredAt asc` —
 * `listMessages` de `@blademidia/db`) para o formato de mensagens do provedor de IA. Função
 * pura: recebe dados já carregados pelo orquestrador (design.md Decision 10 — `packages/ai`
 * não busca no banco).
 *
 * Duas garantias exigidas pela Messages API da Anthropic:
 * 1. Mensagens consecutivas do MESMO papel são unidas em uma só (a API espera papéis
 *    alternados) — pode acontecer, por exemplo, se o cliente mandar duas mensagens seguidas
 *    antes de qualquer resposta.
 * 2. A conversa começa por uma mensagem `user` — qualquer mensagem de saída antes da primeira
 *    de entrada (não deveria acontecer no fluxo normal, mas é defesa barata) é descartada.
 */

export interface HistoryMessageInput {
  direction: "entrada" | "saida";
  type: "texto" | "template" | "outro";
  body: string | null;
}

/**
 * Dado volátil (data de hoje, nome do cliente) vai na MENSAGEM, nunca no system prompt (plano
 * § 4.2) — esta nota é prefixada à última mensagem do cliente antes de enviar ao modelo
 * (`loop.ts`), nunca persistida em `whatsapp_messages` (é metadado de execução, não conteúdo
 * da conversa).
 */
export function buildContextNote(context: { todayIso: string; clientName: string | null }): string {
  const clientPart = context.clientName ? `cliente: ${context.clientName}` : "cliente ainda não identificado pelo nome";
  return `[contexto interno, não repita isso na resposta — hoje é ${context.todayIso}; ${clientPart}]`;
}

export function mapHistoryToMessages(history: HistoryMessageInput[]): ConversationMessage[] {
  const withBody = history.filter(
    (m): m is HistoryMessageInput & { body: string } => typeof m.body === "string" && m.body.trim().length > 0,
  );

  const firstUserIndex = withBody.findIndex((m) => m.direction === "entrada");
  const trimmed = firstUserIndex === -1 ? [] : withBody.slice(firstUserIndex);

  const messages: ConversationMessage[] = [];
  for (const item of trimmed) {
    const role = item.direction === "entrada" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    if (last && last.role === role) {
      last.content = `${last.content}\n${item.body}`;
    } else {
      messages.push({ role, content: item.body });
    }
  }
  return messages;
}
