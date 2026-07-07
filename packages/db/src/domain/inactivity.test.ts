import { describe, expect, it } from "vitest";
import { isClientInactive } from "./inactivity";

describe("isClientInactive", () => {
  const now = new Date("2026-07-22T00:00:00Z");

  it("marca como inativo um cliente sem nenhum atendimento", () => {
    expect(isClientInactive(null, 21, now)).toBe(true);
  });

  it("marca como inativo ao cruzar o limite configurado (22 dias, limite 21)", () => {
    const lastVisit = new Date("2026-06-30T00:00:00Z"); // 22 dias antes de `now`
    expect(isClientInactive(lastVisit, 21, now)).toBe(true);
  });

  it("mantém ativo um cliente dentro do limite (20 dias, limite 21)", () => {
    const lastVisit = new Date("2026-07-02T00:00:00Z"); // 20 dias antes de `now`
    expect(isClientInactive(lastVisit, 21, now)).toBe(false);
  });

  it("respeita um limite customizado (30 dias)", () => {
    const lastVisit = new Date("2026-06-30T00:00:00Z"); // 22 dias antes de `now`
    expect(isClientInactive(lastVisit, 30, now)).toBe(false);
  });
});
