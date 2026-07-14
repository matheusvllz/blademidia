import { describe, expect, it } from "vitest";
import { DEFAULT_AI_MODEL, resolveAiConfig } from "./client";

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
