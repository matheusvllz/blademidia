/**
 * Esqueleto do cliente de IA (ADR-0005). Nesta fase (Fase 2) NÃO há chamada à
 * Claude API em runtime — o produto só deixa a estrutura pronta para o bot
 * (Fase 5). Este módulo resolve a configuração (modelo, chave) que a Fase 5 vai
 * usar para instanciar o SDK da Anthropic; o SDK em si só entra quando o loop de
 * conversa (`atendimento-ia`) for implementado, sobre `whatsapp-canal`.
 */

/** Modelo padrão de atendimento (ADR-0005): econômico e suficiente para agendar/tirar dúvida. */
export const DEFAULT_AI_MODEL = "claude-haiku-4-5";

export interface AiConfig {
  apiKey: string;
  model: string;
}

/**
 * Lê a configuração de IA do ambiente. Lança se a chave não estiver presente —
 * mas NÃO é chamado em runtime na Fase 2 (nenhum canal conectado ainda).
 */
export function resolveAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurado (ver .env.example)");
  }
  return { apiKey, model: env.AI_MODEL?.trim() || DEFAULT_AI_MODEL };
}
