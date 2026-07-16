import { describe, expect, it } from "vitest";
import { assertWriteBarberId, isOwnAppointment, scopeReadBarberId } from "./agenda-scope";
import type { SessionData } from "./session";

const dono: SessionData = { userId: "u1", barbershopId: "s1", role: "dono", barberId: null, exp: 0 };
const funcionario: SessionData = {
  userId: "u2",
  barbershopId: "s1",
  role: "funcionario",
  barberId: "barber-a",
  exp: 0,
};

describe("scopeReadBarberId", () => {
  it("dono: mantém o barberId pedido (ou undefined = todos)", () => {
    expect(scopeReadBarberId(dono, "barber-x")).toBe("barber-x");
    expect(scopeReadBarberId(dono, undefined)).toBeUndefined();
  });

  it("funcionário: sempre força o próprio barberId, ignorando o pedido", () => {
    expect(scopeReadBarberId(funcionario, "barber-x")).toBe("barber-a");
    expect(scopeReadBarberId(funcionario, undefined)).toBe("barber-a");
  });
});

describe("assertWriteBarberId", () => {
  it("dono: sempre ok, qualquer barbeiro", () => {
    expect(assertWriteBarberId(dono, "barber-x")).toEqual({ ok: true });
  });

  it("funcionário: ok para o próprio barbeiro", () => {
    expect(assertWriteBarberId(funcionario, "barber-a")).toEqual({ ok: true });
  });

  it("funcionário: recusado para outro barbeiro", () => {
    expect(assertWriteBarberId(funcionario, "barber-b")).toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("isOwnAppointment", () => {
  it("dono: sempre true, qualquer barbeiro", () => {
    expect(isOwnAppointment(dono, { barberId: "barber-x" })).toBe(true);
  });

  it("funcionário: true só para o próprio agendamento", () => {
    expect(isOwnAppointment(funcionario, { barberId: "barber-a" })).toBe(true);
    expect(isOwnAppointment(funcionario, { barberId: "barber-b" })).toBe(false);
  });
});
