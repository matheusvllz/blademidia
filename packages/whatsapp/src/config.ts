import { createCloudApiAdapter } from "./cloud-api/adapter";
import { createDryRunAdapter } from "./dry-run";
import { WhatsAppProvider } from "./provider";

/**
 * Resolve o `WhatsAppProvider` a partir do ambiente (mesmo padrão de `resolveAiConfig` em
 * `packages/ai/src/client.ts`). SEM as 4 variáveis de credencial, cai para o adapter dry-run
 * — é o que permite desenvolver e testar esta capability antes de o BSP estar contratado
 * (§ 5.10 do plano de execução), sem lançar erro.
 */
export function resolveWhatsAppProvider(env: NodeJS.ProcessEnv = process.env): WhatsAppProvider {
  const accessToken = env.WHATSAPP_ACCESS_TOKEN?.trim();
  const appSecret = env.WHATSAPP_APP_SECRET?.trim();
  const verifyToken = env.WHATSAPP_VERIFY_TOKEN?.trim();
  const apiBaseUrl = env.WHATSAPP_API_BASE_URL?.trim();

  if (accessToken && appSecret && verifyToken && apiBaseUrl) {
    return new WhatsAppProvider(
      createCloudApiAdapter({ accessToken, appSecret, verifyToken, apiBaseUrl }),
    );
  }

  console.log(
    "[whatsapp] credenciais não configuradas (WHATSAPP_ACCESS_TOKEN/APP_SECRET/VERIFY_TOKEN/API_BASE_URL) — usando adapter dry-run",
  );
  return new WhatsAppProvider(createDryRunAdapter());
}
