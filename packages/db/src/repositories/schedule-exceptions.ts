import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "../client";
import { scheduleExceptions } from "../schema/schedule-exceptions";

/** ADR-0007: `barbershopId` explícito sempre em primeiro. */

export type ScheduleExceptionRecord = typeof scheduleExceptions.$inferSelect;

export interface CreateExceptionInput {
  barberId: string | null; // null = toda a barbearia (ex.: feriado)
  date: string; // "2026-07-20"
  kind: "folga" | "bloqueio" | "extra";
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

export type CreateExceptionResult =
  | { error: null; exception: ScheduleExceptionRecord }
  | { error: "missing_window"; exception: null };

export async function createException(
  barbershopId: string,
  input: CreateExceptionInput,
): Promise<CreateExceptionResult> {
  // bloqueio/extra exigem janela; folga é dia inteiro.
  if (input.kind !== "folga" && (!input.startTime || !input.endTime)) {
    return { error: "missing_window", exception: null };
  }
  const [created] = await db
    .insert(scheduleExceptions)
    .values({
      barbershopId,
      barberId: input.barberId,
      date: input.date,
      kind: input.kind,
      startTime: input.kind === "folga" ? null : input.startTime,
      endTime: input.kind === "folga" ? null : input.endTime,
      reason: input.reason ?? null,
    })
    .returning();
  if (!created) throw new Error("Falha inesperada ao criar exceção de agenda");
  return { error: null, exception: created };
}

export async function deleteException(barbershopId: string, exceptionId: string): Promise<boolean> {
  const deleted = await db
    .delete(scheduleExceptions)
    .where(
      and(eq(scheduleExceptions.barbershopId, barbershopId), eq(scheduleExceptions.id, exceptionId)),
    )
    .returning({ id: scheduleExceptions.id });
  return deleted.length > 0;
}

/**
 * Exceções que valem para um barbeiro numa data: as específicas dele + as da
 * barbearia inteira (`barberId` NULL, ex.: feriado).
 */
export async function listExceptionsForBarberOnDate(
  barbershopId: string,
  barberId: string,
  date: string,
): Promise<ScheduleExceptionRecord[]> {
  return db
    .select()
    .from(scheduleExceptions)
    .where(
      and(
        eq(scheduleExceptions.barbershopId, barbershopId),
        eq(scheduleExceptions.date, date),
        or(eq(scheduleExceptions.barberId, barberId), isNull(scheduleExceptions.barberId)),
      ),
    );
}

/** Exceções de um barbeiro num intervalo de datas (para a tela de configuração). */
export async function listExceptionsForBarber(
  barbershopId: string,
  barberId: string,
  fromDate: string,
  toDate: string,
): Promise<ScheduleExceptionRecord[]> {
  return db
    .select()
    .from(scheduleExceptions)
    .where(
      and(
        eq(scheduleExceptions.barbershopId, barbershopId),
        or(eq(scheduleExceptions.barberId, barberId), isNull(scheduleExceptions.barberId)),
        gte(scheduleExceptions.date, fromDate),
        lte(scheduleExceptions.date, toDate),
      ),
    )
    .orderBy(asc(scheduleExceptions.date));
}
