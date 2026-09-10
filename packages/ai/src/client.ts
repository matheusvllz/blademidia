/**
 * Configuração e resolução do cliente de IA (ADR-0005). `resolveAiConfig` lê modelo/chave do
 * ambiente; `resolveAiClient` decide qual `AiClient` instanciar — o adapter real
 * (`anthropic-client.ts`) se `ANTHROPIC_API_KEY` existir, ou o dry-run (`dry-run-client.ts`)
 * caso contrário. Mesmo padrão de `resolveWhatsAppProvider` em `packages/whatsapp/src/config.ts`
 * (design.md da change `add-atendimento-ia`, Decision 1) — permite construir e verificar o loop
 * inteiro antes de existir credencial real.
 */
import { createAnthropicAiClient } from "./anthropic-client";
import { createDryRunAiClient } from "./dry-run-client";
import type { AiClient } from "./types";

/** Modelo padrão de atendimento (ADR-0005): econômico e suficiente para agendar/tirar dúvida. */
export const DEFAULT_AI_MODEL = "claude-haiku-4-5";

export interface AiConfig {
  apiKey: string;
  model: string;
}

/**
 * Lê a configuração de IA do ambiente. Lança se a chave não estiver presente — só é chamado
 * pelo caminho real de `resolveAiClient`, nunca pelo dry-run.
 */
export function resolveAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurado (ver .env.example)");
  }
  return { apiKey, model: env.AI_MODEL?.trim() || DEFAULT_AI_MODEL };
}

/**
 * Resolve o `AiClient` a partir do ambiente: real se `ANTHROPIC_API_KEY` estiver presente,
 * dry-run caso contrário. É o único ponto do produto que decide isso — o worker nunca escolhe
 * o adapter diretamente.
 */
export function resolveAiClient(env: NodeJS.ProcessEnv = process.env): AiClient {
  if (!env.ANTHROPIC_API_KEY) {
    return createDryRunAiClient();
  }
  return createAnthropicAiClient(resolveAiConfig(env));
}
