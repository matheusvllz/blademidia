import { afterEach, describe, expect, it, vi } from "vitest";
import { createCloudApiAdapter, type CloudApiAdapterConfig } from "./adapter";

const CONFIG: CloudApiAdapterConfig = {
  accessToken: "token-de-teste",
  appSecret: "segredo-de-teste",
  verifyToken: "verify-de-teste",
  apiBaseUrl: "https://example.invalid/v99.0",
};

function mockFetchOnce(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );
}

describe("createCloudApiAdapter — sendText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("monta o corpo e a URL corretos, sem chamar a rede de verdade em teste", async () => {
    const fetchSpy = mockFetchOnce(200, { messages: [{ id: "wamid.abc" }] });
    const adapter = createCloudApiAdapter(CONFIG);

    const result = await adapter.sendText({
      waPhoneNumberId: "123456",
      toPhone: "+5511998765432",
      body: "seu horário é amanhã às 14h",
    });

    expect(result).toEqual({ ok: true, wamid: "wamid.abc" });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://example.invalid/v99.0/123456/messages");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer token-de-teste" });
    const sentBody = JSON.parse(init?.body as string);
    expect(sentBody).toEqual({
      messaging_product: "whatsapp",
      to: "+5511998765432",
      type: "text",
      text: { body: "seu horário é amanhã às 14h" },
    });
  });

  it("retorna erro_provedor em resposta HTTP não-ok", async () => {
    mockFetchOnce(401, { error: "unauthorized" });
    const adapter = createCloudApiAdapter(CONFIG);
    const result = await adapter.sendText({
      waPhoneNumberId: "123456",
      toPhone: "+5511998765432",
      body: "oi",
    });
    expect(result).toEqual({ ok: false, reason: "erro_provedor", detail: "HTTP 401" });
  });
});

describe("createCloudApiAdapter — sendTemplate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("monta o corpo de template com parâmetros posicionais", async () => {
    const fetchSpy = mockFetchOnce(200, { messages: [{ id: "wamid.tpl" }] });
    const adapter = createCloudApiAdapter(CONFIG);

    await adapter.sendTemplate({
      waPhoneNumberId: "123456",
      toPhone: "+5511998765432",
      templateName: "confirmacao_agendamento",
      languageCode: "pt_BR",
      bodyParams: ["Rafael", "amanhã", "14:00"],
    });

    const [, init] = fetchSpy.mock.calls[0]!;
    const sentBody = JSON.parse(init?.body as string);
    expect(sentBody).toEqual({
      messaging_product: "whatsapp",
      to: "+5511998765432",
      type: "template",
      template: {
        name: "confirmacao_agendamento",
        language: { code: "pt_BR" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Rafael" },
              { type: "text", text: "amanhã" },
              { type: "text", text: "14:00" },
            ],
          },
        ],
      },
    });
  });
});

describe("createCloudApiAdapter — respondToChallenge", () => {
  it("devolve o challenge quando mode e verify_token batem", () => {
    const adapter = createCloudApiAdapter(CONFIG);
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "verify-de-teste",
      "hub.challenge": "abc123",
    });
    expect(adapter.respondToChallenge(params)).toBe("abc123");
  });

  it("recusa (null) quando o verify_token não bate", () => {
    const adapter = createCloudApiAdapter(CONFIG);
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "token-errado",
      "hub.challenge": "abc123",
    });
    expect(adapter.respondToChallenge(params)).toBeNull();
  });
});
