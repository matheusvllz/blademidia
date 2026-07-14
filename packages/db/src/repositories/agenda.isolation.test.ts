/**
 * Isolamento entre tenants para as tabelas da agenda (Fase 2) — DoD do ADR-0007.
 * Precisa de Postgres real (`DATABASE_URL`); pulado sem banco, como os demais.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createAppointment, getAppointment, listAppointments } from "./appointments";
import { createBarber, getBarber, listBarbers, listBarbersForService } from "./barbers";
import { createBarbershop } from "./barbershops";
import { createClient } from "./clients";
import { createService, getService, listServices } from "./services";
import { setWorkSchedules, listWorkSchedules } from "./work-schedules";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("isolamento entre barbearias (agenda)", () => {
  let a: { id: string };
  let b: { id: string };

  beforeAll(async () => {
    a = await createBarbershop(`ag-a-${randomUUID()}`, "Agenda A");
    b = await createBarbershop(`ag-b-${randomUUID()}`, "Agenda B");
  });

  it("serviço da barbearia A não aparece nem é buscável pela B", async () => {
    const created = await createService(a.id, { name: "Corte A", durationMin: 40 });
    expect(created.error).toBeNull();
    const listB = await listServices(b.id);
    expect(listB.find((s) => s.id === created.service!.id)).toBeUndefined();
    expect(await getService(b.id, created.service!.id)).toBeNull();
  });

  it("barbeiro da barbearia A não aparece nem é buscável pela B", async () => {
    const created = await createBarber(a.id, { name: "Rafa A" });
    expect(created.error).toBeNull();
    const listB = await listBarbers(b.id);
    expect(listB.find((x) => x.id === created.barber!.id)).toBeUndefined();
    expect(await getBarber(b.id, created.barber!.id)).toBeNull();
  });

  it("grade de trabalho é escopada por barbearia", async () => {
    const barber = await createBarber(a.id, { name: "Grade A" });
    await setWorkSchedules(a.id, barber.barber!.id, [
      { weekday: 1, startTime: "09:00", endTime: "12:00" },
    ]);
    // consultar a mesma grade pelo tenant B (mesmo barberId) não retorna nada
    expect(await listWorkSchedules(b.id, barber.barber!.id)).toHaveLength(0);
    expect(await listWorkSchedules(a.id, barber.barber!.id)).toHaveLength(1);
  });

  it("agendamento da barbearia A não aparece nem é buscável pela B", async () => {
    const client = await createClient(a.id, { name: "Cli A", phone: `5561${Date.now()}` });
    const service = await createService(a.id, { name: "Serv A", durationMin: 30 });
    const barber = await createBarber(a.id, { name: "Barb A" });
    const start = new Date("2027-01-10T13:00:00Z");
    const end = new Date("2027-01-10T13:30:00Z");
    const appt = await createAppointment(a.id, {
      clientId: client.client!.id,
      serviceId: service.service!.id,
      barberId: barber.barber!.id,
      startsAt: start,
      endsAt: end,
    });
    expect(appt.error).toBeNull();

    const listB = await listAppointments(b.id, {
      from: new Date("2027-01-01T00:00:00Z"),
      to: new Date("2027-02-01T00:00:00Z"),
    });
    expect(listB.find((x) => x.id === appt.appointment!.id)).toBeUndefined();
    expect(await getAppointment(b.id, appt.appointment!.id)).toBeNull();
  });

  it("listBarbersForService só considera barbeiros do próprio tenant", async () => {
    const service = await createService(a.id, { name: "Exclusivo A", durationMin: 20 });
    const barberA = await createBarber(a.id, { name: "Faz Tudo A" });
    const forService = await listBarbersForService(a.id, service.service!.id);
    // barbeiro sem associação declarada faz todos os serviços ativos → aparece
    expect(forService.find((x) => x.id === barberA.barber!.id)).toBeDefined();
    // nenhum barbeiro do tenant A aparece ao consultar pelo tenant B
    const forServiceB = await listBarbersForService(b.id, service.service!.id);
    expect(forServiceB.find((x) => x.id === barberA.barber!.id)).toBeUndefined();
  });
});
