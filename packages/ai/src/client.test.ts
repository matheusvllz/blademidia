import { describe, expect, it } from "vitest";
import { DEFAULT_AI_MODEL, resolveAiClient, resolveAiConfig } from "./client";

describe("resolveAiConfig", () => {
  it("usa o modelo padrão quando AI_MODEL não é informado", () => {
    const config = resolveAiConfig({ ANTHROPIC_API_KEY: "sk-test" } as NodeJS.ProcessEnv);
    expect(config).toEqual({ apiKey: "sk-test", model: DEFAULT_AI_MODEL });
  });

  it("respeita AI_MODEL quando informado", () => {
    const config = resolveAiConfig({
      ANTHROPIC_API_KEY: "sk-test",
      AI_MODEL: "claude-sonnet-5",
    } as NodeJS.ProcessEnv);
    expect(config.model).toBe("claude-sonnet-5");
  });

  it("falha sem ANTHROPIC_API_KEY", () => {
    expect(() => resolveAiConfig({} as NodeJS.ProcessEnv)).toThrow(/ANTHROPIC_API_KEY/);
  });
});

describe("resolveAiClient", () => {
  it("resolve o cliente dry-run quando ANTHROPIC_API_KEY não está configurada", async () => {
    const client = resolveAiClient({} as NodeJS.ProcessEnv);
    const result = await client.converse({
      model: DEFAULT_AI_MODEL,
      maxTokens: 1024,
      systemPrompt: "system",
      messages: [{ role: "user", content: "oi" }],
      tools: [],
      executeTool: async () => ({ ok: true }),
      maxToolIterations: 6,
    });
    // Sem script, o dry-run simula escalação — nunca inventa resposta de atendimento.
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]?.name).toBe("escalar_para_humano");
  });

  it("não lança nem chama rede quando ANTHROPIC_API_KEY não está configurada", async () => {
    // Se resolvesse o cliente real sem chave, `new Anthropic({apiKey: undefined})` já lançaria
    // na construção — este teste prova que o caminho dry-run é o escolhido, não o real.
    expect(() => resolveAiClient({} as NodeJS.ProcessEnv)).not.toThrow();
  });
});
