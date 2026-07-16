import { and, asc, eq, gt, gte, inArray, lt, lte, ne, sql } from "drizzle-orm";
import { db } from "../client";
import {
  agendaSettings,
  DEFAULT_CONFIRMATION_LEAD_HOURS,
  DEFAULT_NO_SHOW_AFTER_MIN,
} from "../schema/agenda-settings";
import { appointments } from "../schema/appointments";
import { paymentsLog } from "../schema/payments-log";
import { visits } from "../schema/visits";

/** ADR-0007: `barbershopId` explícito sempre em primeiro (exceto varreduras de sistema). */

export type AppointmentRecord = typeof appointments.$inferSelect;
export type AppointmentStatus = AppointmentRecord["status"];
export type AppointmentSource = AppointmentRecord["source"];

/** Estados que ocupam a agenda (batem na restrição de exclusão do banco). */
export const ACTIVE_STATUSES: AppointmentStatus[] = ["agendado", "confirmado"];

/** Código do Postgres para violação de restrição de exclusão (double booking). */
const EXCLUSION_VIOLATION = "23P01";

function isExclusionViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === EXCLUSION_VIOLATION;
}

export interface CreateAppointmentInput {
  clientId: string;
  barberId: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  source?: AppointmentSource;
  notes?: string | null;
}

export type CreateAppointmentResult =
  | { error: null; appointment: AppointmentRecord }
  | { error: "conflict"; appointment: null };

export async function createAppointment(
  barbershopId: string,
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  try {
    const [created] = await db
      .insert(appointments)
      .values({
        barbershopId,
        clientId: input.clientId,
        barberId: input.barberId,
        serviceId: input.serviceId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        source: input.source ?? "painel",
        notes: input.notes ?? null,
      })
      .returning();
    if (!created) throw new Error("Falha inesperada ao criar agendamento");
    return { error: null, appointment: created };
  } catch (error) {
    if (isExclusionViolation(error)) return { error: "conflict", appointment: null };
    throw error;
  }
}

export async function getAppointment(
  barbershopId: string,
  appointmentId: string,
): Promise<AppointmentRecord | null> {
  const rows = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.barbershopId, barbershopId), eq(appointments.id, appointmentId)));
  return rows[0] ?? null;
}

export async function listAppointments(
  barbershopId: string,
  range: { from: Date; to: Date; barberId?: string },
): Promise<AppointmentRecord[]> {
  const conditions = [
    eq(appointments.barbershopId, barbershopId),
    gte(appointments.startsAt, range.from),
    lt(appointments.startsAt, range.to),
  ];
  if (range.barberId) conditions.push(eq(appointments.barberId, range.barberId));
  return db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(asc(appointments.startsAt));
}

/** Agendamentos ATIVOS de barbeiros que colidem com uma janela (base da disponibilidade). */
export async function listActiveAppointmentsForBarbers(
  barbershopId: string,
  barberIds: string[],
  windowStart: Date,
  windowEnd: Date,
): Promise<AppointmentRecord[]> {
  if (barberIds.length === 0) return [];
  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.barbershopId, barbershopId),
        inArray(appointments.barberId, barberIds),
        inArray(appointments.status, ACTIVE_STATUSES),
        lt(appointments.startsAt, windowEnd),
        gt(appointments.endsAt, windowStart),
      ),
    );
}

export async function setAppointmentStatus(
  barbershopId: string,
  appointmentId: string,
  status: AppointmentStatus,
  extra: { canceledAt?: Date | null; cancelReason?: string | null } = {},
): Promise<AppointmentRecord | null> {
  const [updated] = await db
    .update(appointments)
    .set({ status, ...extra })
    .where(and(eq(appointments.barbershopId, barbershopId), eq(appointments.id, appointmentId)))
    .returning();
  return updated ?? null;
}

export type RescheduleResult =
  | { error: null; appointment: AppointmentRecord }
  | { error: "conflict"; appointment: null };

export async function rescheduleAppointment(
  barbershopId: string,
  appointmentId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<RescheduleResult> {
  try {
    const [updated] = await db
      .update(appointments)
      .set({ startsAt, endsAt })
      .where(and(eq(appointments.barbershopId, barbershopId), eq(appointments.id, appointmentId)))
      .returning();
    if (!updated) return { error: "conflict", appointment: null };
    return { error: null, appointment: updated };
  } catch (error) {
    if (isExclusionViolation(error)) return { error: "conflict", appointment: null };
    throw error;
  }
}

export interface CompleteVisitInput {
  serviceLabel: string;
  serviceId: string | null;
  staffId: string | null;
  occurredAt: Date;
  amountCents?: number | null;
  method?: "dinheiro" | "cartao" | "pix" | "outro";
}

/**
 * Conclusão ATÔMICA (Decision 6 do design.md): numa única transação, cria a
 * visita (+pagamento se houver valor), vincula `visit_id` no agendamento e move
 * para "concluido". Idempotente: se o agendamento já tem `visit_id`, é no-op e
 * devolve `alreadyCompleted` (não cria segunda visita). A validação da transição
 * de estado fica no domínio (core) antes de chamar.
 */
export async function completeAppointmentWithVisit(
  barbershopId: string,
  appointmentId: string,
  clientId: string,
  input: CompleteVisitInput,
): Promise<{ appointment: AppointmentRecord; visitId: string; alreadyCompleted: boolean } | null> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(appointments)
      .where(and(eq(appointments.barbershopId, barbershopId), eq(appointments.id, appointmentId)))
      .for("update");
    if (!current) return null;
    if (current.visitId) {
      return { appointment: current, visitId: current.visitId, alreadyCompleted: true };
    }

    const [visit] = await tx
      .insert(visits)
      .values({
        barbershopId,
        clientId,
        serviceLabel: input.serviceLabel,
        serviceId: input.serviceId,
        staffId: input.staffId,
        occurredAt: input.occurredAt,
      })
      .returning();
    if (!visit) throw new Error("Falha inesperada ao criar visita na conclusão");

    if (input.amountCents != null) {
      await tx.insert(paymentsLog).values({
        barbershopId,
        clientId,
        visitId: visit.id,
        amountCents: input.amountCents,
        method: input.method ?? "outro",
        paidAt: input.occurredAt,
      });
    }

    const [updated] = await tx
      .update(appointments)
      .set({ status: "concluido", visitId: visit.id })
      .where(and(eq(appointments.barbershopId, barbershopId), eq(appointments.id, appointmentId)))
      .returning();
    if (!updated) throw new Error("Falha inesperada ao concluir agendamento");

    return { appointment: updated, visitId: visit.id, alreadyCompleted: false };
  });
}

/** Próximos agendamentos ativos de um cliente (perfil do CRM). */
export async function listUpcomingForClient(
  barbershopId: string,
  clientId: string,
  now: Date,
): Promise<AppointmentRecord[]> {
  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.barbershopId, barbershopId),
        eq(appointments.clientId, clientId),
        inArray(appointments.status, ACTIVE_STATUSES),
        gte(appointments.startsAt, now),
      ),
    )
    .orderBy(asc(appointments.startsAt));
}

/** LGPD: cancela agendamentos futuros ativos de um cliente (exclusão de cliente). */
export async function cancelFutureAppointmentsForClient(
  barbershopId: string,
  clientId: string,
  now: Date,
  reason: string,
): Promise<number> {
  const canceled = await db
    .update(appointments)
    .set({ status: "cancelado", canceledAt: now, cancelReason: reason })
    .where(
      and(
        eq(appointments.barbershopId, barbershopId),
        eq(appointments.clientId, clientId),
        inArray(appointments.status, ACTIVE_STATUSES),
        gte(appointments.startsAt, now),
      ),
    )
    .returning({ id: appointments.id });
  return canceled.length;
}

/**
 * Candidatos a no-show em TODOS os tenants (varredura de sistema do worker):
 * agendamentos ativos cujo término + `no_show_after_min` da barbearia já passou.
 * Usa o limite da barbearia (join em agenda_settings, com padrão quando ausente).
 */
export async function listNoShowCandidates(
  now: Date,
): Promise<{ id: string; barbershopId: string }[]> {
  const thresholdMin = sql`coalesce(${agendaSettings.noShowAfterMin}, ${DEFAULT_NO_SHOW_AFTER_MIN})`;
  return db
    .select({ id: appointments.id, barbershopId: appointments.barbershopId })
    .from(appointments)
    .leftJoin(agendaSettings, eq(agendaSettings.barbershopId, appointments.barbershopId))
    .where(
      and(
        inArray(appointments.status, ACTIVE_STATUSES),
        lte(appointments.endsAt, sql`${now}::timestamptz - (${thresholdMin} * interval '1 minute')`),
      ),
    );
}

/**
 * Agendamentos "agendado" (ainda não confirmados) cujo início cai dentro da
 * janela de confirmação da barbearia (`confirmation_lead_hours`), em TODOS os
 * tenants — esqueleto do worker (Fase 2): seleciona quem SERIA notificado; o
 * envio real é da Fase 5 (`whatsapp-canal`).
 */
export async function listAppointmentsNeedingConfirmation(
  now: Date,
): Promise<{ id: string; barbershopId: string; startsAt: Date }[]> {
  const leadHours = sql`coalesce(${agendaSettings.confirmationLeadHours}, ${DEFAULT_CONFIRMATION_LEAD_HOURS})`;
  return db
    .select({ id: appointments.id, barbershopId: appointments.barbershopId, startsAt: appointments.startsAt })
    .from(appointments)
    .leftJoin(agendaSettings, eq(agendaSettings.barbershopId, appointments.barbershopId))
    .where(
      and(
        eq(appointments.status, "agendado"),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, sql`${now}::timestamptz + (${leadHours} * interval '1 hour')`),
      ),
    );
}

/**
 * Faltas mais recentes (dashboard: "clientes que sumiram do agendamento").
 * `barberId` opcional (Fase 4): dashboard do funcionário mostra só as próprias.
 */
export async function listRecentNoShows(
  barbershopId: string,
  limit: number,
  barberId?: string,
): Promise<AppointmentRecord[]> {
  const conditions = [eq(appointments.barbershopId, barbershopId), eq(appointments.status, "faltou")];
  if (barberId) conditions.push(eq(appointments.barberId, barberId));
  return db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(sql`${appointments.startsAt} desc`)
    .limit(limit);
}

/**
 * Contagem de agendamentos por status num intervalo (dashboard). `barberId`
 * opcional (Fase 4): dashboard do funcionário mostra só a própria agenda.
 */
export async function countAppointmentsByStatus(
  barbershopId: string,
  from: Date,
  to: Date,
  barberId?: string,
): Promise<Record<string, number>> {
  const conditions = [
    eq(appointments.barbershopId, barbershopId),
    gte(appointments.startsAt, from),
    lt(appointments.startsAt, to),
    ne(appointments.status, "cancelado"),
  ];
  if (barberId) conditions.push(eq(appointments.barberId, barberId));
  const rows = await db
    .select({ status: appointments.status, count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(and(...conditions))
    .groupBy(appointments.status);
  const result: Record<string, number> = {};
  for (const row of rows) result[row.status] = row.count;
  return result;
}
