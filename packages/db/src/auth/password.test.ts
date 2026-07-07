import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifica a senha correta", () => {
    const hash = hashPassword("corte-e-barba-123");
    expect(verifyPassword("corte-e-barba-123", hash)).toBe(true);
  });

  it("recusa senha incorreta", () => {
    const hash = hashPassword("corte-e-barba-123");
    expect(verifyPassword("senha-errada", hash)).toBe(false);
  });

  it("nunca grava a senha em texto puro no hash resultante", () => {
    const hash = hashPassword("corte-e-barba-123");
    expect(hash).not.toContain("corte-e-barba-123");
  });
});
