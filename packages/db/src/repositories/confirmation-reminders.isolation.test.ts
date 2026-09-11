/**
 * Isolamento entre tenants para a seleção de confirmação (Fase 5.3) — DoD do ADR-0007.
 * Precisa de Postgres real (`DATABASE_URL`); pulado sem banco, como os demais.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { updateAgendaSettings } from "./agenda-settings";
import { createAppointment, listAppointmentsNeedingConfirmation } from "./appointments";
import { createBarber } from "./barbers";
import { createBarbershop } from "./barbershops";
import { createClient } from "./clients";
import { recordReminderSent, wasReminderSent } from "./confirmation-reminders";
import { createService } from "./services";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("isolamento entre barbearias (confirmação)", () => {
  let a: { id: string };
  let b: { id: string };
  const now = new Date();
  const startsAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  beforeAll(async () => {
    a = await createBarbershop(`conf-iso-a-${randomUUID()}`, "Confirmação Iso A");
    b = await createBarbershop(`conf-iso-b-${randomUUID()}`, "Confirmação Iso B");
    await updateAgendaSettings(a.id, { confirmationAutomationEnabled: true });
    await updateAgendaSettings(b.id, { confirmationAutomationEnabled: true });
  });

  it("agendamento elegível da barbearia A não aparece nem afeta a seleção da B", async () => {
    const client = await createClient(a.id, { name: "Cli Iso A", phone: `5561${Date.now()}` });
    const barber = await createBarber(a.id, { name: "Barb Iso A" });
    const service = await createService(a.id, { name: "Serv Iso A", durationMin: 30 });
    const appt = await createAppointment(a.id, {
      clientId: client.client!.id,
      barberId: barber.barber!.id,
      serviceId: service.service!.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
    });
    expect(appt.error).toBeNull();

    const candidatesA = await listAppointmentsNeedingConfirmation(now);
    expect(candidatesA.find((c) => c.id === appt.appointment!.id && c.barbershopId === a.id)).toBeDefined();

    // wasReminderSent/recordReminderSent sob o tenant errado nunca enxergam o agendamento do outro
    expect(await wasReminderSent(b.id, appt.appointment!.id)).toBe(false);
    await recordReminderSent(a.id, appt.appointment!.id, "wamid.iso.a");
    expect(await wasReminderSent(b.id, appt.appointment!.id)).toBe(false); // registro é global por appointmentId, mas a consulta por b.id nunca o encontraria via join de tenant
    expect(await wasReminderSent(a.id, appt.appointment!.id)).toBe(true);
  });
});
