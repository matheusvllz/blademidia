import { describe, expect, it } from "vitest";
import { HANDOFF_MESSAGE, STALL_THRESHOLD, shouldForceStallEscalation } from "./escalation";

describe("shouldForceStallEscalation", () => {
  it("não força abaixo do limite", () => {
    expect(shouldForceStallEscalation(STALL_THRESHOLD - 1)).toBe(false);
  });

  it("força ao atingir o limite", () => {
    expect(shouldForceStallEscalation(STALL_THRESHOLD)).toBe(true);
  });

  it("força acima do limite", () => {
    expect(shouldForceStallEscalation(STALL_THRESHOLD + 1)).toBe(true);
  });
});

describe("HANDOFF_MESSAGE", () => {
  it("não usa jargão institucional (guia de copy § 13.9)", () => {
    for (const banned of ["prezado", "solicitação", "sistema", "plataforma"]) {
      expect(HANDOFF_MESSAGE.toLowerCase()).not.toContain(banned);
    }
  });
});
