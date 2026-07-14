import { parseTimeToMinutes, weekdayOf, zonedWallTimeToInstant } from "./timezone";

/**
 * Motor de disponibilidade (puro e testável). Entradas em formatos simples (não
 * depende dos tipos do Drizzle); o `AgendaService` adapta o que vem do banco.
 *
 * Estratégia: resolver as janelas de atendimento em MINUTOS locais (grade +
 * exceções `extra` − `bloqueio`, `folga` zera o dia), gerar os horários pelo
 * passo/duração, converter cada horário para instante no fuso da barbearia e
 * remover os que caem no passado ou colidem com agendamentos ativos.
 */

/** Intervalo em minutos locais desde a meia-noite. */
export interface Interval {
  start: number;
  end: number;
}

export interface ExceptionInput {
  kind: "folga" | "bloqueio" | "extra";
  startTime: string | null;
  endTime: string | null;
}

export interface BarberAvailabilityInput {
  barberId: string;
  /** Janelas de trabalho do barbeiro NAQUELE dia da semana. */
  windows: { startTime: string; endTime: string }[];
  /** Exceções (folga/bloqueio/extra) do barbeiro naquela data. */
  exceptions: ExceptionInput[];
  /** Agendamentos ativos do barbeiro que tocam aquele dia. */
  appointments: { startsAt: Date; endsAt: Date }[];
}

export interface AvailabilityParams {
  date: string; // "YYYY-MM-DD" (dia local)
  durationMin: number;
  slotStepMin: number;
  minAdvanceMin: number;
  timezone: string;
  now: Date;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  barberId: string;
}

/** Une intervalos sobrepostos/adjacentes numa lista ordenada e limpa. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const cur of sorted) {
    const last = merged[merged.length - 1];
    if (last && cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** Remove `blocks` de `base`, devolvendo os pedaços restantes. */
export function subtractIntervals(base: Interval[], blocks: Interval[]): Interval[] {
  let result = [...base];
  for (const block of blocks) {
    const next: Interval[] = [];
    for (const iv of result) {
      if (block.end <= iv.start || block.start >= iv.end) {
        next.push(iv); // sem interseção
        continue;
      }
      if (block.start > iv.start) next.push({ start: iv.start, end: block.start });
      if (block.end < iv.end) next.push({ start: block.end, end: iv.end });
    }
    result = next;
  }
  return result;
}

/** Janelas de atendimento (minutos locais) de um barbeiro num dia, aplicando exceções. */
export function resolveOpenWindows(barber: BarberAvailabilityInput): Interval[] {
  if (barber.exceptions.some((e) => e.kind === "folga")) return [];

  const base: Interval[] = barber.windows.map((w) => ({
    start: parseTimeToMinutes(w.startTime),
    end: parseTimeToMinutes(w.endTime),
  }));
  const extras: Interval[] = barber.exceptions
    .filter((e) => e.kind === "extra" && e.startTime && e.endTime)
    .map((e) => ({ start: parseTimeToMinutes(e.startTime!), end: parseTimeToMinutes(e.endTime!) }));
  const blocks: Interval[] = barber.exceptions
    .filter((e) => e.kind === "bloqueio" && e.startTime && e.endTime)
    .map((e) => ({ start: parseTimeToMinutes(e.startTime!), end: parseTimeToMinutes(e.endTime!) }));

  return subtractIntervals(mergeIntervals([...base, ...extras]), blocks);
}

/** Gera horários candidatos (minutos locais) que cabem nas janelas, pelo passo. */
export function generateSlots(windows: Interval[], durationMin: number, stepMin: number): Interval[] {
  const slots: Interval[] = [];
  for (const w of windows) {
    for (let start = w.start; start + durationMin <= w.end; start += stepMin) {
      slots.push({ start, end: start + durationMin });
    }
  }
  return slots;
}

/** Janelas abertas de um barbeiro num dia, como instantes (para validar um agendamento avulso). */
export function resolveOpenWindowsAsInstants(
  barber: BarberAvailabilityInput,
  date: string,
  timezone: string,
): { startsAt: Date; endsAt: Date }[] {
  return resolveOpenWindows(barber).map((w) => ({
    startsAt: zonedWallTimeToInstant(date, w.start, timezone),
    endsAt: zonedWallTimeToInstant(date, w.end, timezone),
  }));
}

/** Horários livres de UM barbeiro num dia. */
export function computeBarberDaySlots(
  barber: BarberAvailabilityInput,
  params: AvailabilityParams,
): Slot[] {
  const windows = resolveOpenWindows(barber);
  const candidates = generateSlots(windows, params.durationMin, params.slotStepMin);
  const minStart = new Date(params.now.getTime() + params.minAdvanceMin * 60_000);

  const slots: Slot[] = [];
  for (const c of candidates) {
    const startsAt = zonedWallTimeToInstant(params.date, c.start, params.timezone);
    const endsAt = new Date(startsAt.getTime() + params.durationMin * 60_000);
    if (startsAt < minStart) continue;
    const overlaps = barber.appointments.some((a) => startsAt < a.endsAt && endsAt > a.startsAt);
    if (overlaps) continue;
    slots.push({ startsAt, endsAt, barberId: barber.barberId });
  }
  return slots;
}

/** Horários livres de VÁRIOS barbeiros (união "qualquer barbeiro"), ordenados. */
export function computeAvailability(
  barbers: BarberAvailabilityInput[],
  params: AvailabilityParams,
): Slot[] {
  return barbers
    .flatMap((b) => computeBarberDaySlots(b, params))
    .sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.barberId.localeCompare(b.barberId),
    );
}

/** Um intervalo [startsAt, endsAt) está contido em alguma janela aberta? */
export function isWithinOpenWindows(
  windows: { startsAt: Date; endsAt: Date }[],
  startsAt: Date,
  endsAt: Date,
): boolean {
  return windows.some((w) => startsAt >= w.startsAt && endsAt <= w.endsAt);
}
