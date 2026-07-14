import {
  type AppointmentRecord,
  type AppointmentSource,
  completeAppointmentWithVisit,
  createAppointment,
  getAgendaSettings,
  getAppointment,
  getBarber,
  getBarbershop,
  getClient,
  getService,
  listActiveAppointmentsForBarbers,
  listBarbersForService,
  listExceptionsForBarberOnDate,
  listWorkSchedules,
  rescheduleAppointment as rescheduleAppointmentRow,
  setAppointmentStatus,
} from "@blademidia/db";
import {
  type BarberAvailabilityInput,
  computeAvailability,
  isWithinOpenWindows,
  resolveOpenWindowsAsInstants,
  type Slot,
} from "./availability";
import { instantToZonedDateISO, weekdayOf, zonedDayBounds } from "./timezone";

/**
 * AgendaService — fronteira ÚNICA de regras da agenda (ADR-0008). Painel, worker
 * e (Fase 5) bot chamam por aqui, sempre com `barbershopId` explícito (ADR-0007).
 * Nenhuma regra de agenda vive fora deste pacote.
 */

export type AgendaError =
  | "not_found"
  | "not_available"
  | "in_past"
  | "conflict"
  | "invalid_transition";

export type AgendaResult<T> = { ok: true; value: T } | { ok: false; reason: AgendaError };

const ok = <T>(value: T): AgendaResult<T> => ({ ok: true, value });
const fail = <T>(reason: AgendaError): AgendaResult<T> => ({ ok: false, reason });

const ACTIVE: AppointmentRecord["status"][] = ["agendado", "confirmado"];

// --- Disponibilidade ---

export interface AvailabilityQuery {
  date: string; // "YYYY-MM-DD" local
  serviceId: string;
  barberId?: string;
}

export interface AvailabilityResult {
  serviceId: string;
  durationMin: number;
  slots: Slot[];
}

export async function getAvailability(
  barbershopId: string,
  query: AvailabilityQuery,
  now: Date = new Date(),
): Promise<AgendaResult<AvailabilityResult>> {
  const service = await getService(barbershopId, query.serviceId);
  if (!service) return fail("not_found");

  const shop = await getBarbershop(barbershopId);
  if (!shop) return fail("not_found");
  const timezone = shop.timezone;

  const settings = await getAgendaSettings(barbershopId);

  let eligible = await listBarbersForService(barbershopId, query.serviceId);
  if (query.barberId) {
    eligible = eligible.filter((b) => b.id === query.barberId);
  }
  if (eligible.length === 0) {
    return ok({ serviceId: service.id, durationMin: service.durationMin, slots: [] });
  }

  const weekday = weekdayOf(query.date);
  const { start: dayStart, end: dayEnd } = zonedDayBounds(query.date, timezone);
  const barberIds = eligible.map((b) => b.id);
  const dayAppointments = await listActiveAppointmentsForBarbers(
    barbershopId,
    barberIds,
    dayStart,
    dayEnd,
  );

  const inputs: BarberAvailabilityInput[] = [];
  for (const barber of eligible) {
    const schedules = await listWorkSchedules(barbershopId, barber.id);
    const exceptions = await listExceptionsForBarberOnDate(barbershopId, barber.id, query.date);
    inputs.push({
      barberId: barber.id,
      windows: schedules
        .filter((s) => s.weekday === weekday)
        .map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
      exceptions: exceptions.map((e) => ({
        kind: e.kind,
        startTime: e.startTime,
        endTime: e.endTime,
      })),
      appointments: dayAppointments
        .filter((a) => a.barberId === barber.id)
        .map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt })),
    });
  }

  const slots = computeAvailability(inputs, {
    date: query.date,
    durationMin: service.durationMin,
    slotStepMin: settings.slotStepMin,
    minAdvanceMin: settings.minAdvanceMin,
    timezone,
    now,
  });

  return ok({ serviceId: service.id, durationMin: service.durationMin, slots });
}

// --- Criação ---

export interface BookInput {
  clientId: string;
  serviceId: string;
  barberId: string;
  startsAt: Date;
  source?: AppointmentSource;
  notes?: string | null;
}

async function assertBookable(
  barbershopId: string,
  barberId: string,
  serviceId: string,
  startsAt: Date,
  durationMin: number,
  minAdvanceMin: number,
  timezone: string,
  now: Date,
): Promise<AgendaError | null> {
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
  const minStart = new Date(now.getTime() + minAdvanceMin * 60_000);
  if (startsAt < minStart) return "in_past";

  const date = instantToZonedDateISO(startsAt, timezone);
  const weekday = weekdayOf(date);
  const schedules = await listWorkSchedules(barbershopId, barberId);
  const exceptions = await listExceptionsForBarberOnDate(barbershopId, barberId, date);
  const windows = resolveOpenWindowsAsInstants(
    {
      barberId,
      windows: schedules
        .filter((s) => s.weekday === weekday)
        .map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
      exceptions: exceptions.map((e) => ({ kind: e.kind, startTime: e.startTime, endTime: e.endTime })),
      appointments: [],
    },
    date,
    timezone,
  );
  if (!isWithinOpenWindows(windows, startsAt, endsAt)) return "not_available";
  return null;
}

export async function bookAppointment(
  barbershopId: string,
  input: BookInput,
  now: Date = new Date(),
): Promise<AgendaResult<AppointmentRecord>> {
  const [service, barber, client] = await Promise.all([
    getService(barbershopId, input.serviceId),
    getBarber(barbershopId, input.barberId),
    getClient(barbershopId, input.clientId),
  ]);
  if (!service || !barber || !client) return fail("not_found");

  const eligible = await listBarbersForService(barbershopId, input.serviceId);
  if (!eligible.some((b) => b.id === input.barberId)) return fail("not_available");

  const shop = await getBarbershop(barbershopId);
  if (!shop) return fail("not_found");
  const settings = await getAgendaSettings(barbershopId);

  const problem = await assertBookable(
    barbershopId,
    input.barberId,
    input.serviceId,
    input.startsAt,
    service.durationMin,
    settings.minAdvanceMin,
    shop.timezone,
    now,
  );
  if (problem) return fail(problem);

  const endsAt = new Date(input.startsAt.getTime() + service.durationMin * 60_000);
  const created = await createAppointment(barbershopId, {
    clientId: input.clientId,
    serviceId: input.serviceId,
    barberId: input.barberId,
    startsAt: input.startsAt,
    endsAt,
    source: input.source ?? "painel",
    notes: input.notes ?? null,
  });
  if (created.error === "conflict") return fail("conflict");
  return ok(created.appointment);
}

// --- Transições ---

export async function confirmAppointment(
  barbershopId: string,
  appointmentId: string,
): Promise<AgendaResult<AppointmentRecord>> {
  const appt = await getAppointment(barbershopId, appointmentId);
  if (!appt) return fail("not_found");
  if (appt.status === "confirmado") return ok(appt);
  if (appt.status !== "agendado") return fail("invalid_transition");
  const updated = await setAppointmentStatus(barbershopId, appointmentId, "confirmado");
  return updated ? ok(updated) : fail("not_found");
}

export async function cancelAppointment(
  barbershopId: string,
  appointmentId: string,
  reason?: string | null,
  now: Date = new Date(),
): Promise<AgendaResult<AppointmentRecord>> {
  const appt = await getAppointment(barbershopId, appointmentId);
  if (!appt) return fail("not_found");
  if (!ACTIVE.includes(appt.status)) return fail("invalid_transition");
  const updated = await setAppointmentStatus(barbershopId, appointmentId, "cancelado", {
    canceledAt: now,
    cancelReason: reason ?? null,
  });
  return updated ? ok(updated) : fail("not_found");
}

export async function rescheduleAppointment(
  barbershopId: string,
  appointmentId: string,
  newStartsAt: Date,
  now: Date = new Date(),
): Promise<AgendaResult<AppointmentRecord>> {
  const appt = await getAppointment(barbershopId, appointmentId);
  if (!appt) return fail("not_found");
  if (!ACTIVE.includes(appt.status)) return fail("invalid_transition");

  const service = await getService(barbershopId, appt.serviceId);
  const durationMin = service?.durationMin ?? Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60_000);
  const shop = await getBarbershop(barbershopId);
  if (!shop) return fail("not_found");
  const settings = await getAgendaSettings(barbershopId);

  const problem = await assertBookable(
    barbershopId,
    appt.barberId,
    appt.serviceId,
    newStartsAt,
    durationMin,
    settings.minAdvanceMin,
    shop.timezone,
    now,
  );
  if (problem) return fail(problem);

  const newEndsAt = new Date(newStartsAt.getTime() + durationMin * 60_000);
  const result = await rescheduleAppointmentRow(barbershopId, appointmentId, newStartsAt, newEndsAt);
  if (result.error === "conflict") return fail("conflict");
  return ok(result.appointment);
}

// --- Conclusão (gera atendimento) ---

export interface CompleteInput {
  amountCents?: number | null;
  method?: "dinheiro" | "cartao" | "pix" | "outro";
}

export interface CompleteResult {
  appointment: AppointmentRecord;
  visitId: string;
  alreadyCompleted: boolean;
}

export async function completeAppointment(
  barbershopId: string,
  appointmentId: string,
  input: CompleteInput = {},
): Promise<AgendaResult<CompleteResult>> {
  const appt = await getAppointment(barbershopId, appointmentId);
  if (!appt) return fail("not_found");
  if (appt.status === "concluido" || appt.visitId) {
    return ok({ appointment: appt, visitId: appt.visitId ?? "", alreadyCompleted: true });
  }
  if (!ACTIVE.includes(appt.status)) return fail("invalid_transition");

  const service = await getService(barbershopId, appt.serviceId);
  const result = await completeAppointmentWithVisit(barbershopId, appointmentId, appt.clientId, {
    serviceLabel: service?.name ?? "Atendimento",
    serviceId: appt.serviceId,
    staffId: appt.barberId,
    occurredAt: appt.startsAt,
    amountCents: input.amountCents ?? null,
    method: input.method,
  });
  if (!result) return fail("not_found");
  return ok(result);
}

// --- Falta (no-show) ---

export async function markNoShow(
  barbershopId: string,
  appointmentId: string,
): Promise<AgendaResult<AppointmentRecord>> {
  const appt = await getAppointment(barbershopId, appointmentId);
  if (!appt) return fail("not_found");
  if (appt.status === "faltou") return ok(appt);
  if (!ACTIVE.includes(appt.status)) return fail("invalid_transition");
  const updated = await setAppointmentStatus(barbershopId, appointmentId, "faltou");
  return updated ? ok(updated) : fail("not_found");
}
