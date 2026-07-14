/**
 * Conversões de fuso sem dependência externa (Decision 4 do design.md). A grade
 * de trabalho é hora LOCAL da barbearia; o banco guarda instantes (timestamptz).
 * Estas funções convertem entre os dois. Padrão do negócio: America/Sao_Paulo,
 * que hoje não tem horário de verão — a conversão é exata numa passagem. Em
 * fusos com DST haveria a borda de transição (aceito como fora de escopo aqui).
 */

/** Offset (ms) do fuso em relação ao UTC no instante dado: (wallclock_local_como_UTC) − instante. */
export function getTimezoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = Number(part.value);
  }
  const asUTC = Date.UTC(map.year!, map.month! - 1, map.day!, map.hour!, map.minute!, map.second!);
  return asUTC - date.getTime();
}

/** Instante (UTC) correspondente a um horário de parede local (data + minutos desde a meia-noite). */
export function zonedWallTimeToInstant(
  dateISO: string,
  minutesFromMidnight: number,
  timeZone: string,
): Date {
  const [year, month, day] = dateISO.split("-").map(Number) as [number, number, number];
  const hh = Math.floor(minutesFromMidnight / 60);
  const mm = minutesFromMidnight % 60;
  const guessUTC = Date.UTC(year, month - 1, day, hh, mm, 0);
  const offset = getTimezoneOffsetMs(timeZone, new Date(guessUTC));
  return new Date(guessUTC - offset);
}

/** Dia da semana (0=domingo … 6=sábado) de uma data local — independe do fuso. */
export function weekdayOf(dateISO: string): number {
  const [year, month, day] = dateISO.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** "HH:MM" (ou "HH:MM:SS") → minutos desde a meia-noite. */
export function parseTimeToMinutes(time: string): number {
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  return hh * 60 + mm;
}

/** Data local ("YYYY-MM-DD") de um instante no fuso da barbearia. */
export function instantToZonedDateISO(date: Date, timeZone: string): string {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Início do dia local (00:00) e do dia seguinte, como instantes — janela de consulta. */
export function zonedDayBounds(dateISO: string, timeZone: string): { start: Date; end: Date } {
  return {
    start: zonedWallTimeToInstant(dateISO, 0, timeZone),
    end: zonedWallTimeToInstant(dateISO, 24 * 60, timeZone),
  };
}
