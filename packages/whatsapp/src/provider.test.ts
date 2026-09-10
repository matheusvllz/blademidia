import { describe, expect, it, vi } from "vitest";
import { isWithin24hWindow, WhatsAppProvider, type WhatsAppAdapter } from "./provider";

function makeAdapter(): WhatsAppAdapter {
  return {
    sendText: vi.fn().mockResolvedValue({ ok: true, wamid: "wamid.text" }),
    sendTemplate: vi.fn().mockResolvedValue({ ok: true, wamid: "wamid.template" }),
    verifySignature: vi.fn().mockReturnValue(true),
    respondToChallenge: vi.fn().mockReturnValue("challenge-value"),
    normalizeWebhookPayload: vi.fn().mockReturnValue([]),
  };
}

describe("isWithin24hWindow", () => {
  it("é false sem nenhuma mensagem recebida ainda", () => {
    expect(isWithin24hWindow(null)).toBe(false);
  });

  it("é true dentro das 24h", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    const lastInboundAt = new Date("2026-09-10T00:00:01Z");
    expect(isWithin24hWindow(lastInboundAt, now)).toBe(true);
  });

  it("é false após 24h", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    const lastInboundAt = new Date("2026-09-09T11:00:00Z");
    expect(isWithin24hWindow(lastInboundAt, now)).toBe(false);
  });
});

describe("WhatsAppProvider.sendText", () => {
  it("recusa fora da janela SEM chamar o adapter", async () => {
    const adapter = makeAdapter();
    const provider = new WhatsAppProvider(adapter);
    const result = await provider.sendText(
      { waPhoneNumberId: "1", toPhone: "+5511999999999", body: "oi" },
      { lastInboundAt: null, optedOutAt: null },
    );
    expect(result).toEqual({ ok: false, reason: "janela_fechada" });
    expect(adapter.sendText).not.toHaveBeenCalled();
  });

  it("recusa por opt-out SEM chamar o adapter, mesmo dentro da janela", async () => {
    const adapter = makeAdapter();
    const provider = new WhatsAppProvider(adapter);
    const result = await provider.sendText(
      { waPhoneNumberId: "1", toPhone: "+5511999999999", body: "oi" },
      { lastInboundAt: new Date(), optedOutAt: new Date() },
    );
    expect(result).toEqual({ ok: false, reason: "opt_out" });
    expect(adapter.sendText).not.toHaveBeenCalled();
  });

  it("envia dentro da janela, sem opt-out", async () => {
    const adapter = makeAdapter();
    const provider = new WhatsAppProvider(adapter);
    const result = await provider.sendText(
      { waPhoneNumberId: "1", toPhone: "+5511999999999", body: "oi" },
      { lastInboundAt: new Date(), optedOutAt: null },
    );
    expect(result).toEqual({ ok: true, wamid: "wamid.text" });
    expect(adapter.sendText).toHaveBeenCalledOnce();
  });
});

describe("WhatsAppProvider.sendTemplate", () => {
  it("envia mesmo fora da janela (é para isso que templates existem)", async () => {
    const adapter = makeAdapter();
    const provider = new WhatsAppProvider(adapter);
    const result = await provider.sendTemplate(
      {
        waPhoneNumberId: "1",
        toPhone: "+5511999999999",
        templateName: "confirmacao_agendamento",
        languageCode: "pt_BR",
        bodyParams: ["Rafael", "amanhã", "14:00"],
      },
      { lastInboundAt: null, optedOutAt: null },
    );
    expect(result).toEqual({ ok: true, wamid: "wamid.template" });
    expect(adapter.sendTemplate).toHaveBeenCalledOnce();
  });

  it("recusa por opt-out mesmo sendo template", async () => {
    const adapter = makeAdapter();
    const provider = new WhatsAppProvider(adapter);
    const result = await provider.sendTemplate(
      {
        waPhoneNumberId: "1",
        toPhone: "+5511999999999",
        templateName: "confirmacao_agendamento",
        languageCode: "pt_BR",
        bodyParams: [],
      },
      { lastInboundAt: null, optedOutAt: new Date() },
    );
    expect(result).toEqual({ ok: false, reason: "opt_out" });
    expect(adapter.sendTemplate).not.toHaveBeenCalled();
  });
});
