import { describe, expect, it, vi } from "vitest";
import { createDryRunAiClient } from "./dry-run-client";
import { runConversationTurn } from "./loop";

vi.mock("./tools/index", async () => {
  const actual = await vi.importActual<typeof import("./tools/index")>("./tools/index");
  return {
    ...actual,
    getBotTools: () => [
      { name: "consultar_disponibilidade", description: "...", inputSchema: {} },
      { name: "criar_agendamento", description: "...", inputSchema: {} },
      { name: "remarcar_agendamento", description: "...", inputSchema: {} },
      { name: "cancelar_agendamento", description: "...", inputSchema: {} },
      { name: "cadastrar_cliente_basico", description: "...", inputSchema: {} },
    ],
    executeDomainTool: vi.fn(async (_barbershopId: string, name: string, input: unknown) => {
      if (name === "consultar_disponibilidade") return { ok: true, value: { slots: ["2026-09-11T12:00:00Z"] } };
      if (name === "criar_agendamento") return { ok: true, value: { id: "appt-1" } };
      if (name === "cadastrar_cliente_basico") return { error: null, client: { id: "client-1" } };
      return { ok: false, reason: "erro_generico" };
    }),
  };
});

const baseInput = {
  aiClient: createDryRunAiClient(),
  model: "claude-haiku-4-5",
  maxTokens: 1024,
  maxToolIterations: 6,
  systemPrompt: "system",
  messages: [{ role: "user" as const, content: "oi" }],
  barbershopId: "shop-1",
  domainContext: { conversationId: "conv-1", phone: "+5511900000000" },
};

describe("runConversationTurn", () => {
  it("resposta simples sem tool: nenhuma tool chamada, sem escalação, considerado estagnação", async () => {
    const aiClient = createDryRunAiClient([{ toolCalls: [], finalText: "beleza, e aí, posso ajudar?" }]);
    const result = await runConversationTurn({ ...baseInput, aiClient });
    expect(result.finalText).toBe("beleza, e aí, posso ajudar?");
    expect(result.domainToolCalled).toBe(false);
    expect(result.escalate.requested).toBe(false);
  });

  it("agendar do zero: consultar depois criar — domainToolCalled true", async () => {
    const aiClient = createDryRunAiClient([
      {
        toolCalls: [
          { name: "consultar_disponibilidade", input: { date: "2026-09-11", serviceId: "s1" } },
          { name: "criar_agendamento", input: { clientId: "c1", serviceId: "s1", barberId: "b1", startsAt: "2026-09-11T12:00:00Z" } },
        ],
        finalText: "marcado! te espero lá",
      },
    ]);
    const result = await runConversationTurn({ ...baseInput, aiClient });
    expect(result.domainToolCalled).toBe(true);
    expect(result.toolCalls).toHaveLength(2);
    expect(result.finalText).toBe("marcado! te espero lá");
  });

  it("cadastro + agendamento (cliente novo): ambas as tools contam como domínio", async () => {
    const aiClient = createDryRunAiClient([
      {
        toolCalls: [
          { name: "cadastrar_cliente_basico", input: { nome: "João" } },
          { name: "criar_agendamento", input: { clientId: "client-1", serviceId: "s1", barberId: "b1", startsAt: "2026-09-11T12:00:00Z" } },
        ],
        finalText: "prontinho João, te espero!",
      },
    ]);
    const result = await runConversationTurn({ ...baseInput, aiClient });
    expect(result.domainToolCalled).toBe(true);
  });

  it("escalação explícita: extrai o motivo e não conta como tool de domínio", async () => {
    const aiClient = createDryRunAiClient([
      { toolCalls: [{ name: "escalar_para_humano", input: { motivo: "cliente pediu falar com humano" } }], finalText: null },
    ]);
    const result = await runConversationTurn({ ...baseInput, aiClient });
    expect(result.escalate).toEqual({ requested: true, reason: "cliente pediu falar com humano" });
    expect(result.domainToolCalled).toBe(false);
  });

  it("propaga erro do AiClient sem engolir (degradação é responsabilidade do orquestrador)", async () => {
    const boom = new Error("rede fora do ar");
    const aiClient = { converse: vi.fn().mockRejectedValue(boom) };
    await expect(runConversationTurn({ ...baseInput, aiClient })).rejects.toThrow("rede fora do ar");
  });

  it("repassa maxToolIterations ao AiClient", async () => {
    const converse = vi.fn().mockResolvedValue({
      finalText: "ok",
      toolCalls: [],
      usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheCreationTokens: 0 },
    });
    await runConversationTurn({ ...baseInput, aiClient: { converse }, maxToolIterations: 3 });
    expect(converse).toHaveBeenCalledWith(expect.objectContaining({ maxToolIterations: 3 }));
  });
});
