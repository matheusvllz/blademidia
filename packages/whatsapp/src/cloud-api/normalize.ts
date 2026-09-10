import { normalizePhoneToE164 } from "../phone";
import type { MessageOrigin, MessageType, NormalizedWebhookEvent } from "../types";

/**
 * Normalização do payload da Cloud API (design.md, Decision 1 e Decision 5). Formato conforme
 * a documentação oficial da Meta for Developers (plano § 4.4): `entry[].changes[].value`.
 *
 * Detecção de `origin` (Decision 5): uma mensagem cujo remetente (`from`) é o PRÓPRIO número
 * do negócio (`metadata.display_phone_number`) só pode existir, na Cloud API clássica, como
 * espelho de uma resposta enviada pelo barbeiro no WhatsApp Business App sob coexistência —
 * a API clássica nunca gera esse tipo de evento sozinha. É uma inferência, não uma confirmação
 * do formato exato do BSP escolhido — reconfirmar na task 9.2 do tasks.md contra a
 * documentação real do BSP contratado.
 */

interface CloudApiMessage {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
}

interface CloudApiValue {
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: Array<{ wa_id?: string }>;
  messages?: CloudApiMessage[];
}

interface CloudApiChange {
  value?: CloudApiValue;
  field?: string;
}

interface CloudApiEntry {
  changes?: CloudApiChange[];
}

interface CloudApiWebhookPayload {
  entry?: CloudApiEntry[];
}

function isCloudApiWebhookPayload(raw: unknown): raw is CloudApiWebhookPayload {
  return typeof raw === "object" && raw !== null && "entry" in raw;
}

export function normalizeCloudApiPayload(rawBody: unknown): NormalizedWebhookEvent[] {
  if (!isCloudApiWebhookPayload(rawBody) || !Array.isArray(rawBody.entry)) {
    return [{ kind: "ignorado", reason: "payload sem campo entry[] reconhecível" }];
  }

  const events: NormalizedWebhookEvent[] = [];

  for (const entry of rawBody.entry) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      if (!value.messages || value.messages.length === 0) {
        events.push({
          kind: "ignorado",
          reason:
            change.field === "messages"
              ? "evento de messages sem nenhuma mensagem (provável status de entrega)"
              : `campo não tratado: ${change.field ?? "desconhecido"}`,
        });
        continue;
      }

      const phoneNumberId = value.metadata?.phone_number_id;
      const businessDisplayPhone = value.metadata?.display_phone_number;
      const contactPhone = value.contacts?.[0]?.wa_id;
      const businessNormalized = businessDisplayPhone
        ? normalizePhoneToE164(businessDisplayPhone)
        : null;

      for (const msg of value.messages) {
        if (!msg.id || !msg.from) {
          events.push({ kind: "ignorado", reason: "mensagem sem id ou remetente" });
          continue;
        }
        if (!phoneNumberId) {
          events.push({ kind: "ignorado", reason: "evento sem phone_number_id" });
          continue;
        }

        const fromNormalized = normalizePhoneToE164(msg.from);
        const isFromBusinessOwnNumber =
          businessNormalized !== null && fromNormalized === businessNormalized;

        const origin: MessageOrigin = isFromBusinessOwnNumber ? "negocio_via_app" : "cliente";
        const clientPhone = isFromBusinessOwnNumber
          ? contactPhone
            ? normalizePhoneToE164(contactPhone)
            : fromNormalized
          : fromNormalized;

        const type: MessageType = msg.type === "text" ? "texto" : "outro";
        const body = msg.type === "text" ? (msg.text?.body ?? null) : null;
        const occurredAt = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date();

        events.push({
          kind: "mensagem",
          message: {
            waPhoneNumberId: phoneNumberId,
            clientPhone,
            wamid: msg.id,
            type,
            body,
            origin,
            occurredAt,
          },
        });
      }
    }
  }

  return events;
}
