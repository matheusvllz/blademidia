import { and, asc, eq } from "drizzle-orm";
import { db } from "../client";
import { workSchedules } from "../schema/work-schedules";

/** ADR-0007: `barbershopId` explícito sempre em primeiro. */

export type WorkScheduleRecord = typeof workSchedules.$inferSelect;

export interface WorkScheduleWindow {
  weekday: number; // 0=domingo … 6=sábado
  startTime: string; // "09:00"
  endTime: string; // "19:00"
}

export async function listWorkSchedules(
  barbershopId: string,
  barberId: string,
): Promise<WorkScheduleRecord[]> {
  return db
    .select()
    .from(workSchedules)
    .where(and(eq(workSchedules.barbershopId, barbershopId), eq(workSchedules.barberId, barberId)))
    .orderBy(asc(workSchedules.weekday), asc(workSchedules.startTime));
}

/**
 * Grade de TODOS os barbeiros da barbearia (Fase 5.2, `add-atendimento-ia`) — usada para
 * resumir o horário de funcionamento no system prompt do bot (não interessa de qual barbeiro é
 * cada janela, só quando a barbearia tem alguém trabalhando).
 */
export async function listWorkSchedulesForBarbershop(barbershopId: string): Promise<WorkScheduleRecord[]> {
  return db
    .select()
    .from(workSchedules)
    .where(eq(workSchedules.barbershopId, barbershopId))
    .orderBy(asc(workSchedules.weekday), asc(workSchedules.startTime));
}

/** Substitui a grade semanal inteira do barbeiro (transação). */
export async function setWorkSchedules(
  barbershopId: string,
  barberId: string,
  windows: WorkScheduleWindow[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(workSchedules)
      .where(
        and(eq(workSchedules.barbershopId, barbershopId), eq(workSchedules.barberId, barberId)),
      );
    if (windows.length > 0) {
      await tx.insert(workSchedules).values(
        windows.map((w) => ({
          barbershopId,
          barberId,
          weekday: w.weekday,
          startTime: w.startTime,
          endTime: w.endTime,
        })),
      );
    }
  });
}
