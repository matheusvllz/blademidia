import { afterEach, describe, expect, it, vi } from "vitest";
import { createDryRunAdapter, maskPhone } from "./dry-run";

describe("maskPhone", () => {
  it("mantém só os últimos 4 dígitos", () => {
    expect(maskPhone("+5511998765432")).toBe("***5432");
  });
});

describe("createDryRunAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sendText não faz chamada de rede, mascara o telefone e não loga o corpo da mensagem", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const adapter = createDryRunAdapter();
    const result = await adapter.sendText({
      waPhoneNumberId: "123",
      toPhone: "+5511998765432",
      body: "segredo do cliente que não pode vazar",
    });

    expect(result.ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();

    const loggedLines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(loggedLines.some((line) => line.includes("998765432"))).toBe(false);
    expect(loggedLines.some((line) => line.includes("***5432"))).toBe(true);
    expect(loggedLines.some((line) => line.includes("segredo do cliente"))).toBe(false);
  });

  it("sendTemplate não faz chamada de rede nem loga os parâmetros do template", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const adapter = createDryRunAdapter();
    const result = await adapter.sendTemplate({
      waPhoneNumberId: "123",
      toPhone: "+5511998765432",
      templateName: "confirmacao_agendamento",
      languageCode: "pt_BR",
      bodyParams: ["Nome Real do Cliente", "amanhã 14h"],
    });

    expect(result.ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();

    const loggedLines = logSpy.mock.calls.map((call) => String(call[0]));
    expect(loggedLines.some((line) => line.includes("Nome Real do Cliente"))).toBe(false);
  });

  it("respondToChallenge devolve o valor do challenge recebido", () => {
    const adapter = createDryRunAdapter();
    const params = new URLSearchParams({ "hub.challenge": "abc123" });
    expect(adapter.respondToChallenge(params)).toBe("abc123");
  });
});
