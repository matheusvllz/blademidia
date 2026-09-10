import type { WhatsAppAdapter } from "./provider";
import type { NormalizedWebhookEvent, SendResult, SendTemplateInput, SendTextInput } from "./types";

/**
 * Adapter que loga em vez de enviar — usado em dev sem credencial de provedor (§ 5.10 do
 * plano de execução: "o adapter pode ser desenvolvido e testado em modo dry-run antes das
 * credenciais existirem"). Nunca loga conteúdo de mensagem nem telefone completo (regra do
 * repositório) — só o suficiente para confirmar que o envio *teria* acontecido.
 */

/** Mantém só os 4 últimos dígitos — mesmo padrão de `automation/lib/engine.mjs` (`maskPhone`). */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `***${digits.slice(-4)}`;
}

let counter = 0;
function nextDryRunWamid(): string {
  counter += 1;
  return `dryrun.${Date.now()}.${counter}`;
}

export function createDryRunAdapter(): WhatsAppAdapter {
  return {
    async sendText(input: SendTextInput): Promise<SendResult> {
      const wamid = nextDryRunWamid();
      console.log(
        `[whatsapp:dry-run] enviaria texto (${input.body.length} caractere(s)) para ${maskPhone(input.toPhone)} via ${input.waPhoneNumberId} — wamid=${wamid}`,
      );
      return { ok: true, wamid };
    },

    async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
      const wamid = nextDryRunWamid();
      console.log(
        `[whatsapp:dry-run] enviaria template "${input.templateName}" (${input.languageCode}, ${input.bodyParams.length} parâmetro(s)) para ${maskPhone(input.toPhone)} via ${input.waPhoneNumberId} — wamid=${wamid}`,
      );
      return { ok: true, wamid };
    },

    verifySignature(): boolean {
      // Sem credencial real, dry-run aceita qualquer coisa — usado só em dev local.
      return true;
    },

    respondToChallenge(params: URLSearchParams): string | null {
      return params.get("hub.challenge");
    },

    normalizeWebhookPayload(): NormalizedWebhookEvent[] {
      console.log("[whatsapp:dry-run] normalização de payload chamada em modo dry-run — sem parser real");
      return [];
    },
  };
}
