import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDryRunAiClient } from "./dry-run-client";

describe("createDryRunAiClient", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch" as never);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("nunca chama fetch", async () => {
    const client = createDryRunAiClient();
    await client.converse({
      model: "claude-haiku-4-5",
      maxTokens: 1024,
      systemPrompt: "system",
      messages: [{ role: "user", content: "oi" }],
      tools: [],
      executeTool: async () => ({ ok: true }),
      maxToolIterations: 6,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sem script, simula escalação em vez de inventar resposta", async () => {
    const client = createDryRunAiClient();
    const result = await client.converse({
      model: "claude-haiku-4-5",
      maxTokens: 1024,
      systemPrompt: "system",
      messages: [{ role: "user", content: "oi" }],
      tools: [],
      executeTool: async () => ({ ok: true }),
      maxToolIterations: 6,
    });
    expect(result.finalText).toBeNull();
    expect(result.toolCalls).toEqual([
      { name: "escalar_para_humano", input: { motivo: "modo dry-run: IA não configurada" }, output: { ok: true } },
    ]);
  });

  it("com script, executa as tool calls roteirizadas via executeTool", async () => {
    const executeTool = vi.fn(async (name: string) => ({ echoed: name }));
    const client = createDryRunAiClient([
      {
        toolCalls: [{ name: "consultar_disponibilidade", input: { date: "2026-09-11" } }],
        finalText: "aqui estão os horários",
      },
    ]);
    const result = await client.converse({
      model: "claude-haiku-4-5",
      maxTokens: 1024,
      systemPrompt: "system",
      messages: [{ role: "user", content: "quero agendar" }],
      tools: [],
      executeTool,
      maxToolIterations: 6,
    });
    expect(executeTool).toHaveBeenCalledWith("consultar_disponibilidade", { date: "2026-09-11" });
    expect(result.finalText).toBe("aqui estão os horários");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    });
  });

  it("não loga conteúdo de mensagem, só metadados", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const client = createDryRunAiClient();
    await client.converse({
      model: "claude-haiku-4-5",
      maxTokens: 1024,
      systemPrompt: "system",
      messages: [{ role: "user", content: "meu telefone é 11999999999 e quero cancelar" }],
      tools: [],
      executeTool: async () => ({ ok: true }),
      maxToolIterations: 6,
    });
    const loggedText = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(loggedText).not.toContain("11999999999");
    expect(loggedText).not.toContain("cancelar");
    logSpy.mockRestore();
  });
});
