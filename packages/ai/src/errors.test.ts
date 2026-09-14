import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { isAiProviderError } from "./errors";

describe("isAiProviderError", () => {
  it("reconhece RateLimitError", () => {
    const error = new Anthropic.RateLimitError(429, {}, "rate limited", new Headers());
    expect(isAiProviderError(error)).toBe(true);
  });

  it("reconhece APIConnectionError", () => {
    const error = new Anthropic.APIConnectionError({ message: "connection failed" });
    expect(isAiProviderError(error)).toBe(true);
  });

  it("não reconhece um erro genérico do próprio domínio (nunca casar por string)", () => {
    const error = new Error("rate limit atingido, tente depois");
    expect(isAiProviderError(error)).toBe(false);
  });
});
