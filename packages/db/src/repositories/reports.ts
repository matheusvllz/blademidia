import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "../client";
import { appointments } from "../schema/appointments";
import { barbers } from "../schema/barbers";
import { clients } from "../schema/clients";
import { paymentsLog } from "../schema/payments-log";
import { reportSnapshots } from "../schema/report-snapshots";
import { services } from "../schema/services";
import { visits } from "../schema/visits";

/** ADR-0007: `barbershopId` explícito sempre em primeiro. Todo intervalo é [from, to). */

export interface RevenueStats {
  revenueCents: number;
  visitsCount: number;
  avgTicketCents: number | null;
  /** Atendimentos sem valor informado (sinalização — spec "Atendimentos sem valor informado"). */
  unpricedVisitsCount: number;
}

export async function getRevenueStats(
  barbershopId: string,
  from: Date,
  to: Date,
): Promise<RevenueStats> {
  const visitRows = await db
    .select({ id: visits.id })
    .from(visits)
    .where(
      and(eq(visits.barbershopId, barbershopId), gte(visits.occurredAt, from), lt(visits.occurredAt, to)),
    );
  const visitsCount = visitRows.length;

  const paymentRows = await db
    .select({ amountCents: paymentsLog.amountCents, visitId: paymentsLog.visitId })
    .from(paymentsLog)
    .innerJoin(visits, eq(visits.id, paymentsLog.visitId))
    .where(
      and(
        eq(paymentsLog.barbershopId, barbershopId),
        eq(visits.barbershopId, barbershopId),
        gte(visits.occurredAt, from),
        lt(visits.occurredAt, to),
      ),
    );

  const revenueCents = paymentRows.reduce((sum, p) => sum + p.amountCents, 0);
  const pricedVisitIds = new Set(paymentRows.map((p) => p.visitId));
  const avgTicketCents =
    pricedVisitIds.size > 0 ? Math.round(revenueCents / pricedVisitIds.size) : null;

  return {
    revenueCents,
    visitsCount,
    avgTicketCents,
    unpricedVisitsCount: visitsCount - pricedVisitIds.size,
  };
}

export async function getNewClientsCount(barbershopId: string, from: Date, to: Date): Promise<number> {
  const rows = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.barbershopId, barbershopId),
        gte(clients.createdAt, from),
        lt(clients.createdAt, to),
        isNull(clients.deletedAt),
      ),
    );
  return rows.length;
}

export async function getServedClientsCount(barbershopId: string, from: Date, to: Date): Promise<number> {
  const rows = await db
    .select({ clientId: visits.clientId })
    .from(visits)
    .where(
      and(eq(visits.barbershopId, barbershopId), gte(visits.occurredAt, from), lt(visits.occurredAt, to)),
    );
  return new Set(rows.map((r) => r.clientId)).size;
}

export interface ServiceRanking {
  serviceId: string | null;
  name: string;
  visitsCount: number;
  revenueCents: number;
}

/** Ranking de serviços por volume (spec "Ranking de serviços"). */
export async function getTopServices(
  barbershopId: string,
  from: Date,
  to: Date,
): Promise<ServiceRanking[]> {
  return db
    .select({
      serviceId: visits.serviceId,
      name: sql<string>`coalesce(${services.name}, ${visits.serviceLabel})`,
      visitsCount: sql<number>`count(distinct ${visits.id})::int`,
      revenueCents: sql<number>`coalesce(sum(${paymentsLog.amountCents}), 0)::int`,
    })
    .from(visits)
    .leftJoin(services, eq(services.id, visits.serviceId))
    .leftJoin(paymentsLog, eq(paymentsLog.visitId, visits.id))
    .where(
      and(eq(visits.barbershopId, barbershopId), gte(visits.occurredAt, from), lt(visits.occurredAt, to)),
    )
    .groupBy(visits.serviceId, sql`coalesce(${services.name}, ${visits.serviceLabel})`)
    .orderBy(sql`count(distinct ${visits.id}) desc`);
}

export interface BarberRanking {
  barberId: string | null;
  name: string;
  visitsCount: number;
  revenueCents: number;
}

/** Produção por barbeiro (spec "Produção por barbeiro"). */
export async function getTopBarbers(
  barbershopId: string,
  from: Date,
  to: Date,
): Promise<BarberRanking[]> {
  return db
    .select({
      barberId: visits.staffId,
      name: sql<string>`coalesce(${barbers.name}, ${visits.staffLabel}, 'Sem barbeiro')`,
      visitsCount: sql<number>`count(distinct ${visits.id})::int`,
      revenueCents: sql<number>`coalesce(sum(${paymentsLog.amountCents}), 0)::int`,
    })
    .from(visits)
    .leftJoin(barbers, eq(barbers.id, visits.staffId))
    .leftJoin(paymentsLog, eq(paymentsLog.visitId, visits.id))
    .where(
      and(eq(visits.barbershopId, barbershopId), gte(visits.occurredAt, from), lt(visits.occurredAt, to)),
    )
    .groupBy(visits.staffId, sql`coalesce(${barbers.name}, ${visits.staffLabel}, 'Sem barbeiro')`)
    .orderBy(sql`count(distinct ${visits.id}) desc`);
}

export interface AppointmentPeriodStats {
  noShowCount: number;
  canceledCount: number;
}

/** Faltas e cancelamentos no período, por `starts_at` (spec "Indicadores da agenda no período"). */
export async function getAppointmentPeriodStats(
  barbershopId: string,
  from: Date,
  to: Date,
): Promise<AppointmentPeriodStats> {
  const rows = await db
    .select({ status: appointments.status, count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      and(
        eq(appointments.barbershopId, barbershopId),
        gte(appointments.startsAt, from),
        lt(appointments.startsAt, to),
      ),
    )
    .groupBy(appointments.status);
  const byStatus: Record<string, number> = {};
  for (const row of rows) byStatus[row.status] = row.count;
  return { noShowCount: byStatus.faltou ?? 0, canceledCount: byStatus.cancelado ?? 0 };
}

// --- Snapshot mensal (report_snapshots) ---

export type ReportSnapshotRecord = typeof reportSnapshots.$inferSelect;

export interface ReportSnapshotInput {
  revenueCents: number;
  visitsCount: number;
  avgTicketCents: number | null;
  newClientsCount: number;
  servedClientsCount: number;
  occupiedCount: number;
  capacityCount: number;
  noShowCount: number;
  canceledCount: number;
  topServices: ServiceRanking[];
  topBarbers: BarberRanking[];
}

/**
 * Upsert idempotente por `(barbershop_id, year, month)` (spec "Snapshot mensal
 * automático" / "Reexecução idempotente"). Nunca escreve as colunas
 * reservadas da Fase 5 (Decision 4 do design) — ficam de fora do `set`.
 */
export async function upsertReportSnapshot(
  barbershopId: string,
  year: number,
  month: number,
  input: ReportSnapshotInput,
): Promise<ReportSnapshotRecord> {
  const generatedAt = new Date();
  const [row] = await db
    .insert(reportSnapshots)
    .values({ barbershopId, year, month, ...input, generatedAt })
    .onConflictDoUpdate({
      target: [reportSnapshots.barbershopId, reportSnapshots.year, reportSnapshots.month],
      set: { ...input, generatedAt },
    })
    .returning();
  if (!row) throw new Error("Falha inesperada ao gravar snapshot mensal");
  return row;
}

export async function getReportSnapshot(
  barbershopId: string,
  year: number,
  month: number,
): Promise<ReportSnapshotRecord | null> {
  const rows = await db
    .select()
    .from(reportSnapshots)
    .where(
      and(
        eq(reportSnapshots.barbershopId, barbershopId),
        eq(reportSnapshots.year, year),
        eq(reportSnapshots.month, month),
      ),
    );
  return rows[0] ?? null;
}

export async function listReportSnapshots(barbershopId: string): Promise<ReportSnapshotRecord[]> {
  return db
    .select()
    .from(reportSnapshots)
    .where(eq(reportSnapshots.barbershopId, barbershopId))
    .orderBy(desc(reportSnapshots.year), desc(reportSnapshots.month));
}
