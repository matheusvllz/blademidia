/**
 * Fase 5.3 (`add-confirmacao-agendamento`). Precisa de Postgres real (`DATABASE_URL`); pulado
 * sem banco, como os demais.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { updateAgendaSettings } from "./agenda-settings";
import { createAppointment, listAppointmentsNeedingConfirmation, setAppointmentStatus } from "./appointments";
import { createBarber } from "./barbers";
import { createBarbershop } from "./barbershops";
import { createClient, deleteClient } from "./clients";
import { recordReminderSent, wasReminderSent } from "./confirmation-reminders";
import { createService } from "./services";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("listAppointmentsNeedingConfirmation + confirmation_reminders", () => {
  let barbershopId: string;
  let clientId: string;
  let barberId: string;
  let serviceId: string;

  const now = new Date();
  let slotOffsetMin = 0;
  /** Cada chamada usa um horário distinto (mesmo barbeiro) — evita colidir com a restrição
   * de exclusão anti-double-booking entre testes. */
  function nextWithinWindowSlot(): Date {
    slotOffsetMin += 60;
    return new Date(now.getTime() + (2 * 60 + slotOffsetMin) * 60 * 1000); // a partir de +2h, dentro da janela de 24h
  }

  beforeAll(async () => {
    const shop = await createBarbershop(`conf-${randomUUID()}`, "Confirmação Teste");
    barbershopId = shop.id;
    const client = await createClient(barbershopId, { name: "Cliente Teste", phone: `5561${Date.now()}` });
    clientId = client.client!.id;
    const barber = await createBarber(barbershopId, { name: "Barbeiro Teste" });
    barberId = barber.barber!.id;
    const service = await createService(barbershopId, { name: "Corte Teste", durationMin: 30 });
    serviceId = service.service!.id;
  });

  async function createFutureAppointment(startsAt: Date) {
    const result = await createAppointment(barbershopId, {
      clientId,
      barberId,
      serviceId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
    });
    expect(result.error).toBeNull();
    return result.appointment!.id;
  }

  it("barbearia sem confirmationAutomationEnabled não aparece na seleção", async () => {
    await updateAgendaSettings(barbershopId, { confirmationAutomationEnabled: false });
    const apptId = await createFutureAppointment(nextWithinWindowSlot());

    const candidates = await listAppointmentsNeedingConfirmation(now);
    expect(candidates.find((c) => c.id === apptId)).toBeUndefined();
  });

  it("com automação habilitada, agendamento dentro da janela aparece com dados do cliente", async () => {
    await updateAgendaSettings(barbershopId, { confirmationAutomationEnabled: true });
    const apptId = await createFutureAppointment(nextWithinWindowSlot());

    const candidates = await listAppointmentsNeedingConfirmation(now);
    const found = candidates.find((c) => c.id === apptId);
    expect(found).toBeDefined();
    expect(found?.clientId).toBe(clientId);
    expect(found?.clientName).toBe("Cliente Teste");
    expect(found?.clientPhone).toMatch(/^5561/);
  });

  it("agendamento fora da janela de confirmation_lead_hours não aparece", async () => {
    await updateAgendaSettings(barbershopId, { confirmationAutomationEnabled: true });
    const farAway = new Date(now.getTime() + 72 * 60 * 60 * 1000); // +72h, além das 24h padrão
    const apptId = await createFutureAppointment(farAway);

    const candidates = await listAppointmentsNeedingConfirmation(now);
    expect(candidates.find((c) => c.id === apptId)).toBeUndefined();
  });

  it("agendamento não 'agendado' (ex.: já confirmado) não aparece", async () => {
    await updateAgendaSettings(barbershopId, { confirmationAutomationEnabled: true });
    const apptId = await createFutureAppointment(nextWithinWindowSlot());
    await setAppointmentStatus(barbershopId, apptId, "confirmado");

    const candidates = await listAppointmentsNeedingConfirmation(now);
    expect(candidates.find((c) => c.id === apptId)).toBeUndefined();
  });

  it("cliente com telefone anonimizado (exclusão LGPD) não aparece", async () => {
    await updateAgendaSettings(barbershopId, { confirmationAutomationEnabled: true });
    const anonClient = await createClient(barbershopId, {
      name: "Cliente Anonimizado",
      phone: `5561${Date.now()}9`,
    });
    const apptId = await createFutureAppointment(nextWithinWindowSlot());
    const anonStart = nextWithinWindowSlot();
    await createAppointment(barbershopId, {
      clientId: anonClient.client!.id,
      barberId,
      serviceId,
      startsAt: anonStart,
      endsAt: new Date(anonStart.getTime() + 30 * 60 * 1000),
    });
    await deleteClient(barbershopId, anonClient.client!.id);

    const candidates = await listAppointmentsNeedingConfirmation(now);
    expect(candidates.find((c) => c.clientId === anonClient.client!.id)).toBeUndefined();
    // controle: o outro agendamento (cliente não anonimizado) continua aparecendo
    expect(candidates.find((c) => c.id === apptId)).toBeDefined();
  });

  it("envio único: agendamento com confirmation_reminders já registrado não reaparece", async () => {
    await updateAgendaSettings(barbershopId, { confirmationAutomationEnabled: true });
    const apptId = await createFutureAppointment(nextWithinWindowSlot());

    expect(await wasReminderSent(barbershopId, apptId)).toBe(false);
    let candidates = await listAppointmentsNeedingConfirmation(now);
    expect(candidates.find((c) => c.id === apptId)).toBeDefined();

    await recordReminderSent(barbershopId, apptId, "wamid.teste.1");

    expect(await wasReminderSent(barbershopId, apptId)).toBe(true);
    candidates = await listAppointmentsNeedingConfirmation(now);
    expect(candidates.find((c) => c.id === apptId)).toBeUndefined();
  });

  it("recordReminderSent é idempotente: segunda chamada para o mesmo agendamento não lança nem duplica", async () => {
    const apptId = await createFutureAppointment(nextWithinWindowSlot());

    const first = await recordReminderSent(barbershopId, apptId, "wamid.teste.a");
    const second = await recordReminderSent(barbershopId, apptId, "wamid.teste.b");

    expect(second.id).toBe(first.id);
    expect(second.wamid).toBe(first.wamid); // primeira gravação vence, segunda é no-op
  });
});
