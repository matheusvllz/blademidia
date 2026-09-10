import type { WhatsAppAdapter } from "../provider";
import type { NormalizedWebhookEvent, SendResult, SendTemplateInput, SendTextInput } from "../types";
import { verifyCloudApiSignature } from "./signature";
import { normalizeCloudApiPayload } from "./normalize";

/**
 * Adapter concreto contra o formato documentado da Meta Cloud API (design.md, Decision 1).
 * O BSP específico ainda não foi contratado (§ 5.9 do plano de execução) — este adapter é a
 * referência de contrato mais estável e publicamente documentada; muitos BSPs de mensalidade
 * fixa espelham esse formato quase sem alteração. Confirmar contra a documentação real do BSP
 * contratado antes do primeiro envio de produção (task 9.2 do tasks.md).
 */

export interface CloudApiAdapterConfig {
  /** Token de acesso da API (Bearer). */
  accessToken: string;
  /** Segredo usado para verificar a assinatura do webhook (`X-Hub-Signature-256`). */
  appSecret: string;
  /** Token combinado na verificação do webhook (`hub.verify_token`). */
  verifyToken: string;
  /**
   * URL base da API, incluindo a versão (ex.: `https://graph.facebook.com/v21.0`).
   * DELIBERADAMENTE sem valor padrão embutido no código — a versão da Graph API muda ao
   * longo do tempo e o plano de execução proíbe "chutar" a versão (§ 4.4). Confirme a versão
   * corrente na documentação oficial (ou do BSP escolhido) e configure via
   * `WHATSAPP_API_BASE_URL`.
   */
  apiBaseUrl: string;
}

interface CloudApiSendResponse {
  messages?: Array<{ id?: string }>;
}

async function postMessage(
  config: CloudApiAdapterConfig,
  waPhoneNumberId: string,
  body: Record<string, unknown>,
): Promise<SendResult> {
  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/${waPhoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return {
      ok: false,
      reason: "erro_provedor",
      detail: error instanceof Error ? error.message : "falha de rede desconhecida",
    };
  }

  if (!response.ok) {
    return { ok: false, reason: "erro_provedor", detail: `HTTP ${response.status}` };
  }

  const data = (await response.json().catch(() => null)) as CloudApiSendResponse | null;
  const wamid = data?.messages?.[0]?.id;
  if (!wamid) {
    return { ok: false, reason: "erro_provedor", detail: "resposta sem id de mensagem" };
  }
  return { ok: true, wamid };
}

export function createCloudApiAdapter(config: CloudApiAdapterConfig): WhatsAppAdapter {
  return {
    async sendText(input: SendTextInput): Promise<SendResult> {
      return postMessage(config, input.waPhoneNumberId, {
        messaging_product: "whatsapp",
        to: input.toPhone,
        type: "text",
        text: { body: input.body },
      });
    },

    async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
      return postMessage(config, input.waPhoneNumberId, {
        messaging_product: "whatsapp",
        to: input.toPhone,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.languageCode },
          components: [
            {
              type: "body",
              parameters: input.bodyParams.map((text) => ({ type: "text", text })),
            },
          ],
        },
      });
    },

    verifySignature(rawBody: string, signatureHeader: string | null): boolean {
      return verifyCloudApiSignature(rawBody, signatureHeader, config.appSecret);
    },

    respondToChallenge(params: URLSearchParams): string | null {
      const mode = params.get("hub.mode");
      const token = params.get("hub.verify_token");
      const challenge = params.get("hub.challenge");
      if (mode !== "subscribe" || token !== config.verifyToken || !challenge) return null;
      return challenge;
    },

    normalizeWebhookPayload(rawBody: unknown): NormalizedWebhookEvent[] {
      return normalizeCloudApiPayload(rawBody);
    },
  };
}
