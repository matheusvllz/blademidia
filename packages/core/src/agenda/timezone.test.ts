import { describe, expect, it } from "vitest";
import { instantToZonedTimeHHMM } from "./timezone";

describe("instantToZonedTimeHHMM", () => {
  it("formata hora local em America/Sao_Paulo (UTC-3, sem DST)", () => {
    // 13:00Z = 10:00 em America/Sao_Paulo.
    expect(instantToZonedTimeHHMM(new Date("2027-03-15T13:00:00Z"), "America/Sao_Paulo")).toBe("10:00");
  });

  it("cobre a borda da meia-noite local", () => {
    // 03:00Z = 00:00 em America/Sao_Paulo.
    expect(instantToZonedTimeHHMM(new Date("2027-03-15T03:00:00Z"), "America/Sao_Paulo")).toBe("00:00");
  });

  it("sempre devolve 2 dígitos para hora e minuto", () => {
    expect(instantToZonedTimeHHMM(new Date("2027-03-15T12:05:00Z"), "America/Sao_Paulo")).toBe("09:05");
  });
});
