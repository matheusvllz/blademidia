import { randomUUID } from "node:crypto";
import { createBarber, createBarbershop, createClient, createService, setWorkSchedules } from "@blademidia/db";
import { describe, expect, it } from "vitest";
import { agendaTools, confirmarAgendamentoTool, criarAgendamentoTool } from "./tools";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("contrato de tools da agenda", () => {
  it("expõe as 5 tools esperadas com nome e descrição", () => {
    expect(agendaTools.map((t) => t.name)).toEqual([
      "consultar_disponibilidade",
      "criar_agendamento",
      "remarcar_agendamento",
      "cancelar_agendamento",
      "confirmar_agendamento",
    ]);
    for (const tool of agendaTools) {
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it("valida a entrada pelo schema (criar_agendamento)", () => {
    const valid = criarAgendamentoTool.inputSchema.safeParse({
      clientId: "c1",
      serviceId: "s1",
      barberId: "b1",
      startsAt: "2026-07-20T13:00:00Z",
    });
    expect(valid.success).toBe(true);

    const invalid = criarAgendamentoTool.inputSchema.safeParse({ clientId: "c1" });
    expect(invalid.success).toBe(false);
  });

  it("valida a entrada pelo schema (confirmar_agendamento)", () => {
    const valid = confirmarAgendamentoTool.inputSchema.safeParse({ appointmentId: "a1" });
    expect(valid.success).toBe(true);

    const invalid = confirmarAgendamentoTool.inputSchema.safeParse({});
    expect(invalid.success).toBe(false);
  });
});

/**
 * Change `add-confirmacao-agendamento` (Fase 5.3): prova a transição REAL no banco através da
 * tool (não só via `AgendaService` diretamente) — cobre a fiação tool → handler → serviço, que
 * um teste só de schema não pega.
 */
describe.skipIf(!hasDatabase)("confirmarAgendamentoTool.handler (Postgres real)", () => {
  it("confirma um agendamento agendado e é idempotente ao chamar de novo", async () => {
    const shop = await createBarbershop(`conf-tool-${randomUUID()}`, "Confirma Tool");
    const service = await createService(shop.id, { name: "Corte", durationMin: 30 });
    const client = await createClient(shop.id, { name: "Cliente", phone: `5561${Date.now()}` });
    const barber = await createBarber(shop.id, { name: "Barbeiro" });
    await setWorkSchedules(
      shop.id,
      barber.barber!.id,
      Array.from({ length: 7 }, (_, weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" })),
    );

    const { bookAppointment } = await import("./agenda-service");
    const booked = await bookAppointment(shop.id, {
      clientId: client.client!.id,
      serviceId: service.service!.id,
      barberId: barber.barber!.id,
      startsAt: new Date("2027-03-15T13:00:00Z"),
      source: "painel",
    });
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;

    const first = await confirmarAgendamentoTool.handler(shop.id, { appointmentId: booked.value.id });
    expect(first).toMatchObject({ ok: true, value: { status: "confirmado" } });

    const second = await confirmarAgendamentoTool.handler(shop.id, { appointmentId: booked.value.id });
    expect(second).toMatchObject({ ok: true, value: { status: "confirmado" } });
  });

  it("agendamento inexistente devolve erro tipado, não lança", async () => {
    const shop = await createBarbershop(`conf-tool-err-${randomUUID()}`, "Confirma Tool Erro");
    const result = await confirmarAgendamentoTool.handler(shop.id, { appointmentId: randomUUID() });
    expect(result).toMatchObject({ ok: false, reason: "not_found" });
  });
});
