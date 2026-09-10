/**
 * @blademidia/ai — bot de atendimento por IA do produto (ADR-0005).
 *
 * Fase 5.2 (`add-atendimento-ia`): loop de conversa completo sobre o canal WhatsApp
 * (`whatsapp-canal`) e as tools de domínio (`packages/core`). `AiClient` é a fronteira
 * injetável — real (Anthropic) ou dry-run — mesmo padrão de `WhatsAppProvider`.
 */
export * from "./types";
export * from "./client";
export * from "./anthropic-client";
export * from "./dry-run-client";
export * from "./errors";
export * from "./escalation";
export * from "./loop";
export * from "./prompts/messages";
export * from "./prompts/system-prompt";
export * from "./tools/index";
