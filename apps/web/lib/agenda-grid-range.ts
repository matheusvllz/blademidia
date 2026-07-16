/**
 * Faixa de dias/horas da grade semanal, derivada da grade de trabalho — NUNCA
 * fixa (seg–sex 09–18) (Decision 4 do design.md de `add-agenda-visao-semanal`).
 * Função pura, sem I/O.
 */

export interface WorkWindow {
  weekday: number; // 0=domingo … 6=sábado
  startTime: string; // "HH:MM" ou "HH:MM:SS"
  endTime: string;
}

export interface GridRange {
  /** Dias da semana (0–6) com ao menos uma janela de trabalho, ordenados. */
  weekdays: number[];
  /** Primeira hora cheia coberta pela grade (ex.: 9 para 09:xx). */
  startHour: number;
  /** Última hora cheia coberta pela grade, exclusiva (ex.: 19 para até 18:xx). */
  endHour: number;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + (m ?? 0);
}

/** `null` quando não há nenhuma janela de trabalho (estado vazio explícito). */
export function computeGridRange(schedules: WorkWindow[]): GridRange | null {
  if (schedules.length === 0) return null;

  const weekdays = Array.from(new Set(schedules.map((s) => s.weekday))).sort((a, b) => a - b);
  const startMinutes = Math.min(...schedules.map((s) => toMinutes(s.startTime)));
  const endMinutes = Math.max(...schedules.map((s) => toMinutes(s.endTime)));

  return {
    weekdays,
    startHour: Math.floor(startMinutes / 60),
    endHour: Math.ceil(endMinutes / 60),
  };
}
