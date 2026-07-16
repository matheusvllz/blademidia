import {
  getAgendaSettings,
  getBarbershop,
  listAppointments,
  listBarbers,
  listExceptionsForBarberOnDate,
  listWorkSchedules,
} from "@blademidia/db";
import { generateSlots, resolveOpenWindows } from "./availability";
import { weekdayOf, zonedDayBounds } from "./timezone";

/**
 * Capacidade/ocupação da agenda (ADR-0010) — fonte única compartilhada por
 * `relatorios` e `add-agenda-visao-semanal`. Reusa os primitivos puros de
 * `availability.ts` (grade − exceções); NÃO subtrai agendamentos da capacidade
 * (capacidade = quantos slots existiam; ocupação = quantos foram usados).
 *
 * Ocupação é uma aproximação por CONTAGEM DE AGENDAMENTO, não por minuto exato:
 * um serviço de 90min conta como 1 agendamento ocupado, não como 3 slots de
 * 30min. Suficiente para a leitura "cheia/vazia" (Decision 2 do design.md de
 * `add-relatorios`; ver ADR-0010).
 */

export interface OccupancyResult {
  occupied: number;
  capacity: number;
}

/** Estados que "ocupam" um horário para efeito de leitura de ocupação (não `cancelado`). */
const OCCUPIED_STATUSES = new Set(["confirmado", "concluido", "faltou"]);

function eachDateISO(fromDate: string, toDate: string): string[] {
  const [fy, fm, fd] = fromDate.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = toDate.split("-").map(Number) as [number, number, number];
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  const dates: string[] = [];
  for (let t = start; t <= end; t += 24 * 60 * 60 * 1000) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Total de slots possíveis (grade − exceções, SEM subtrair agendamentos) no
 * intervalo `[fromDate, toDate]` (datas locais, ambas inclusive).
 */
export async function computeCapacity(
  barbershopId: string,
  fromDate: string,
  toDate: string,
  barberId?: string,
): Promise<number> {
  const settings = await getAgendaSettings(barbershopId);
  let barbers = await listBarbers(barbershopId, { onlyActive: true });
  if (barberId) barbers = barbers.filter((b) => b.id === barberId);
  if (barbers.length === 0) return 0;

  const schedulesByBarber = new Map<string, Awaited<ReturnType<typeof listWorkSchedules>>>();
  for (const barber of barbers) {
    schedulesByBarber.set(barber.id, await listWorkSchedules(barbershopId, barber.id));
  }

  let capacity = 0;
  for (const dateISO of eachDateISO(fromDate, toDate)) {
    const weekday = weekdayOf(dateISO);
    for (const barber of barbers) {
      const schedules = schedulesByBarber.get(barber.id) ?? [];
      const exceptions = await listExceptionsForBarberOnDate(barbershopId, barber.id, dateISO);
      const windows = resolveOpenWindows({
        barberId: barber.id,
        windows: schedules
          .filter((s) => s.weekday === weekday)
          .map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
        exceptions: exceptions.map((e) => ({
          kind: e.kind,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
        appointments: [],
      });
      const slots = generateSlots(windows, settings.slotStepMin, settings.slotStepMin);
      capacity += slots.length;
    }
  }
  return capacity;
}

/**
 * Ocupação do período: agendamentos que ocuparam um horário sobre a capacidade
 * total. Capacidade 0 (sem grade configurada) não é erro — o chamador decide
 * como exibir "indisponível".
 */
export async function computeOccupancy(
  barbershopId: string,
  fromDate: string,
  toDate: string,
  barberId?: string,
): Promise<OccupancyResult> {
  const shop = await getBarbershop(barbershopId);
  const timezone = shop?.timezone ?? "America/Sao_Paulo";
  const from = zonedDayBounds(fromDate, timezone).start;
  const to = zonedDayBounds(toDate, timezone).end;

  const appointmentsInRange = await listAppointments(barbershopId, { from, to, barberId });
  const occupied = appointmentsInRange.filter((a) => OCCUPIED_STATUSES.has(a.status)).length;
  const capacity = await computeCapacity(barbershopId, fromDate, toDate, barberId);
  return { occupied, capacity };
}
