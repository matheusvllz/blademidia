import Anthropic from "@anthropic-ai/sdk";

/**
 * Único ponto fora de `anthropic-client.ts` que sabe da existência do SDK — expõe a checagem
 * por classe tipada (`Anthropic.AnthropicError`, base de `RateLimitError`/`APIConnectionError`/
 * `APIError` — plano § 4.1: "use as classes tipadas do SDK... nunca casar string de mensagem
 * de erro") sem obrigar `apps/worker` a importar `@anthropic-ai/sdk` diretamente (mesmo
 * princípio de ADR-0004 generalizado ao provedor de IA — design.md Decision 8).
 */
export function isAiProviderError(error: unknown): boolean {
  return error instanceof Anthropic.AnthropicError;
}
