import { describe, expect, it } from "vitest";
import { isInvalidRange, resolvePreset } from "./period";

const TZ = "America/Sao_Paulo"; // UTC-3, sem DST — igual à Fase 2.

describe("resolvePreset", () => {
  it("mes_atual: primeiro ao último dia do mês corrente", () => {
    // 2031-07-15 12:00Z = 09:00 local (dia 15, julho).
    const period = resolvePreset("mes_atual", new Date("2031-07-15T12:00:00Z"), TZ);
    expect(period).toEqual({ from: "2031-07-01", to: "2031-07-31" });
  });

  it("mes_atual: fevereiro respeita o último dia do mês", () => {
    const period = resolvePreset("mes_atual", new Date("2031-02-10T12:00:00Z"), TZ);
    expect(period).toEqual({ from: "2031-02-01", to: "2031-02-28" });
  });

  it("mes_passado: mês normal", () => {
    const period = resolvePreset("mes_passado", new Date("2031-07-15T12:00:00Z"), TZ);
    expect(period).toEqual({ from: "2031-06-01", to: "2031-06-30" });
  });

  it("mes_passado: virada de ano em janeiro volta para dezembro do ano anterior", () => {
    const period = resolvePreset("mes_passado", new Date("2031-01-10T12:00:00Z"), TZ);
    expect(period).toEqual({ from: "2030-12-01", to: "2030-12-31" });
  });

  it("semana: últimos 7 dias (inclusive hoje)", () => {
    const period = resolvePreset("semana", new Date("2031-07-15T12:00:00Z"), TZ);
    expect(period).toEqual({ from: "2031-07-09", to: "2031-07-15" });
  });

  it("trimestre: início do trimestre corrente até hoje", () => {
    // Julho está no 3º trimestre (jul-set) → início 01/07.
    const period = resolvePreset("trimestre", new Date("2031-08-20T12:00:00Z"), TZ);
    expect(period).toEqual({ from: "2031-07-01", to: "2031-08-20" });
  });
});

describe("isInvalidRange", () => {
  it("from > to é inválido", () => {
    expect(isInvalidRange({ from: "2031-07-10", to: "2031-07-05" })).toBe(true);
  });

  it("from === to é válido", () => {
    expect(isInvalidRange({ from: "2031-07-10", to: "2031-07-10" })).toBe(false);
  });

  it("from < to é válido", () => {
    expect(isInvalidRange({ from: "2031-07-01", to: "2031-07-10" })).toBe(false);
  });
});
