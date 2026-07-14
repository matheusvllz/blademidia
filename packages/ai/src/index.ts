/**
 * @blademidia/ai — esqueleto do bot de IA do produto (ADR-0005).
 *
 * Fase 2: apenas o contrato (config do cliente + slot de tools da agenda).
 * Nenhuma chamada à Claude API nem canal de mensagem nesta fase (D2/D3 → Fase 5).
 */
export * from "./client";
export * from "./tools/index";
