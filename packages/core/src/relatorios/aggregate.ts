import {
  getAppointmentPeriodStats,
  getBarbershop,
  getNewClientsCount,
  getRevenueStats,
  getServedClientsCount,
  getTopBarbers,
  getTopServices,
} from "@blademidia/db";
import { computeOccupancy } from "../agenda/capacity";
import { zonedDayBounds } from "../agenda/timezone";
import { isInvalidRange } from "./period";
import type { ReportComparison, ReportData, ReportPeriod } from "./types";

export type AggregateReportError = "invalid_range";
export type AggregateReportResult =
  | { ok: true; value: ReportData }
  | { ok: false; reason: AggregateReportError };

function previousPeriod(period: ReportPeriod): ReportPeriod {
  const [fy, fm, fd] = period.from.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = period.to.split("-").map(Number) as [number, number, number];
  const startMs = Date.UTC(fy, fm - 1, fd);
  const endMs = Date.UTC(ty, tm - 1, td);
  const spanDays = Math.round((endMs - startMs) / 86_400_000) + 1;
  const prevEndMs = startMs - 86_400_000;
  const prevStartMs = prevEndMs - (spanDays - 1) * 86_400_000;
  const toISO = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { from: toISO(prevStartMs), to: toISO(prevEndMs) };
}

/** Variação percentual (1 casa decimal); `null` quando não há base (período anterior zerado). */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

interface PeriodMetrics {
  revenue: Awaited<ReturnType<typeof getRevenueStats>>;
  newClients: number;
  servedClients: number;
  topServices: Awaited<ReturnType<typeof getTopServices>>;
  topBarbers: Awaited<ReturnType<typeof getTopBarbers>>;
  apptStats: Awaited<ReturnType<typeof getAppointmentPeriodStats>>;
  occupancy: Awaited<ReturnType<typeof computeOccupancy>>;
}

async function computePeriodMetrics(
  barbershopId: string,
  period: ReportPeriod,
  timezone: string,
): Promise<PeriodMetrics> {
  const { start, end } = {
    start: zonedDayBounds(period.from, timezone).start,
    end: zonedDayBounds(period.to, timezone).end,
  };
  const [revenue, newClients, servedClients, topServices, topBarbers, apptStats, occupancy] =
    await Promise.all([
      getRevenueStats(barbershopId, start, end),
      getNewClientsCount(barbershopId, start, end),
      getServedClientsCount(barbershopId, start, end),
      getTopServices(barbershopId, start, end),
      getTopBarbers(barbershopId, start, end),
      getAppointmentPeriodStats(barbershopId, start, end),
      computeOccupancy(barbershopId, period.from, period.to),
    ]);
  return { revenue, newClients, servedClients, topServices, topBarbers, apptStats, occupancy };
}

/**
 * Composição única de indicadores (Decision 1 do design.md de `add-relatorios`):
 * a tela e o snapshot mensal chamam ESTA função — nunca duas implementações de
 * cálculo. `period.from`/`to` são datas locais "YYYY-MM-DD", ambas inclusive.
 */
export async function aggregateReport(
  barbershopId: string,
  period: ReportPeriod,
): Promise<AggregateReportResult> {
  if (isInvalidRange(period)) return { ok: false, reason: "invalid_range" };

  const shop = await getBarbershop(barbershopId);
  const timezone = shop?.timezone ?? "America/Sao_Paulo";

  const current = await computePeriodMetrics(barbershopId, period, timezone);
  const previous = await computePeriodMetrics(barbershopId, previousPeriod(period), timezone);

  const previousHasData = previous.revenue.visitsCount > 0 || previous.occupancy.occupied > 0;
  const comparison: ReportComparison = previousHasData
    ? {
        available: true,
        revenueChangePct: pctChange(current.revenue.revenueCents, previous.revenue.revenueCents),
        visitsChangePct: pctChange(current.revenue.visitsCount, previous.revenue.visitsCount),
        noShowChangePct: pctChange(current.apptStats.noShowCount, previous.apptStats.noShowCount),
      }
    : { available: false, revenueChangePct: null, visitsChangePct: null, noShowChangePct: null };

  return {
    ok: true,
    value: {
      period,
      revenueCents: current.revenue.revenueCents,
      visitsCount: current.revenue.visitsCount,
      avgTicketCents: current.revenue.avgTicketCents,
      unpricedVisitsCount: current.revenue.unpricedVisitsCount,
      newClientsCount: current.newClients,
      servedClientsCount: current.servedClients,
      occupied: current.occupancy.occupied,
      capacity: current.occupancy.capacity,
      noShowCount: current.apptStats.noShowCount,
      canceledCount: current.apptStats.canceledCount,
      topServices: current.topServices,
      topBarbers: current.topBarbers,
      comparison,
    },
  };
}
