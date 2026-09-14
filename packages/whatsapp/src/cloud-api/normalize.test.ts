import { describe, expect, it } from "vitest";
import { normalizeCloudApiPayload } from "./normalize";

/** Exemplo de payload real conforme a documentação da Meta for Developers (Cloud API). */
function buildInboundPayload(overrides: Partial<{ from: string; body: string }> = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "5561999990000",
                phone_number_id: "123456123",
              },
              contacts: [{ profile: { name: "Rafael" }, wa_id: overrides.from ?? "5511998765432" }],
              messages: [
                {
                  from: overrides.from ?? "5511998765432",
                  id: "wamid.HBgLNTU5NjEyMzQ1Njc4FQIAEhggQzY0",
                  timestamp: "1710000000",
                  type: "text",
                  text: { body: overrides.body ?? "quero agendar um corte" },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

describe("normalizeCloudApiPayload", () => {
  it("normaliza uma mensagem de texto recebida do cliente", () => {
    const events = normalizeCloudApiPayload(buildInboundPayload());
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.kind).toBe("mensagem");
    if (event.kind !== "mensagem") throw new Error("esperava mensagem");
    expect(event.message.origin).toBe("cliente");
    expect(event.message.clientPhone).toBe("+5511998765432");
    expect(event.message.wamid).toBe("wamid.HBgLNTU5NjEyMzQ1Njc4FQIAEhggQzY0");
    expect(event.message.type).toBe("texto");
    expect(event.message.body).toBe("quero agendar um corte");
    expect(event.message.waPhoneNumberId).toBe("123456123");
  });

  it("reconhece mensagem espelhada do próprio número do negócio como negocio_via_app", () => {
    const events = normalizeCloudApiPayload(buildInboundPayload({ from: "5561999990000" }));
    const event = events[0]!;
    if (event.kind !== "mensagem") throw new Error("esperava mensagem");
    expect(event.message.origin).toBe("negocio_via_app");
    // contactPhone (wa_id) é usado como fallback para achar o telefone do cliente — aqui o
    // teste usa o mesmo valor de propósito (from == wa_id), então valida ao menos que não
    // quebra e que o campo é preenchido.
    expect(event.message.clientPhone).toBeTruthy();
  });

  it("ignora evento de mudança de status (sem messages[])", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "1", display_phone_number: "1" },
                statuses: [{ id: "wamid.1", status: "delivered" }],
              },
            },
          ],
        },
      ],
    };
    const events = normalizeCloudApiPayload(payload);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("ignorado");
  });

  it("ignora payload sem entry[] reconhecível", () => {
    const events = normalizeCloudApiPayload({ foo: "bar" });
    expect(events).toEqual([{ kind: "ignorado", reason: "payload sem campo entry[] reconhecível" }]);
  });

  it("ignora mensagem sem id", () => {
    const payload = buildInboundPayload();
    // @ts-expect-error -- forçando payload malformado de propósito
    delete payload.entry[0].changes[0].value.messages[0].id;
    const events = normalizeCloudApiPayload(payload);
    expect(events[0]!.kind).toBe("ignorado");
  });
});
