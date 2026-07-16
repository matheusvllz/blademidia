import type { BarberRanking, ServiceRanking } from "@blademidia/db";

export interface ReportPeriod {
  from: string; // "YYYY-MM-DD" local
  to: string; // "YYYY-MM-DD" local, inclusive
}

/**
 * `available: false` = intervalo anterior sem nenhum dado (spec "Período
 * anterior sem dados") — os `*ChangePct` ficam `null`, não é erro.
 */
export interface ReportComparison {
  available: boolean;
  revenueChangePct: number | null;
  visitsChangePct: number | null;
  noShowChangePct: number | null;
}

export interface ReportData {
  period: ReportPeriod;
  revenueCents: number;
  visitsCount: number;
  avgTicketCents: number | null;
  /** Atendimentos sem valor informado — sinalização (spec). */
  unpricedVisitsCount: number;
  newClientsCount: number;
  servedClientsCount: number;
  /** Ocupação do período (ADR-0010): `capacity` 0 = agenda não configurada. */
  occupied: number;
  capacity: number;
  noShowCount: number;
  canceledCount: number;
  topServices: ServiceRanking[];
  topBarbers: BarberRanking[];
  comparison: ReportComparison;
}
