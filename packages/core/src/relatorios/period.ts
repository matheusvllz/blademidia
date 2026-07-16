import { instantToZonedDateISO } from "../agenda/timezone";
import type { ReportPeriod } from "./types";

export type ReportPreset = "mes_atual" | "mes_passado" | "semana" | "trimestre";

const pad2 = (n: number): string => String(n).padStart(2, "0");

function lastDayOfMonth(year: number, month1to12: number): number {
  // dia 0 do mês seguinte = último dia do mês pedido (matemática de calendário local, sem fuso).
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** Resolve um preset de período para `{ from, to }` no fuso da barbearia. */
export function resolvePreset(preset: ReportPreset, now: Date, timezone: string): ReportPeriod {
  const todayISO = instantToZonedDateISO(now, timezone);
  const [y, m, d] = todayISO.split("-").map(Number) as [number, number, number];

  switch (preset) {
    case "mes_atual": {
      const from = `${y}-${pad2(m)}-01`;
      const to = `${y}-${pad2(m)}-${pad2(lastDayOfMonth(y, m))}`;
      return { from, to };
    }
    case "mes_passado": {
      const prevMonth = m === 1 ? 12 : m - 1;
      const prevYear = m === 1 ? y - 1 : y;
      const from = `${prevYear}-${pad2(prevMonth)}-01`;
      const to = `${prevYear}-${pad2(prevMonth)}-${pad2(lastDayOfMonth(prevYear, prevMonth))}`;
      return { from, to };
    }
    case "semana": {
      const startMs = Date.UTC(y, m - 1, d) - 6 * 86_400_000;
      return { from: new Date(startMs).toISOString().slice(0, 10), to: todayISO };
    }
    case "trimestre": {
      const quarterStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
      return { from: `${y}-${pad2(quarterStartMonth)}-01`, to: todayISO };
    }
  }
}

/** `from > to`? (spec "Intervalo inválido"). */
export function isInvalidRange(period: ReportPeriod): boolean {
  return period.from > period.to;
}
