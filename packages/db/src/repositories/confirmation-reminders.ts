import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { confirmationReminders } from "../schema/confirmation-reminders";

/**
 * Regra de ouro (ADR-0007): toda função exportada aqui exige `barbershopId` explícito.
 * Registro de envio do lembrete de confirmação (Fase 5.3, design.md Decision 2/3) — garante
 * envio único por agendamento; a query de seleção (`listAppointmentsNeedingConfirmation`)
 * nunca reseleciona quem já tem registro aqui.
 */

export type ConfirmationReminderRecord = typeof confirmationReminders.$inferSelect;

export async function wasReminderSent(barbershopId: string, appointmentId: string): Promise<boolean> {
  const rows = await db
    .select({ id: confirmationReminders.id })
    .from(confirmationReminders)
    .where(
      and(
        eq(confirmationReminders.barbershopId, barbershopId),
        eq(confirmationReminders.appointmentId, appointmentId),
      ),
    );
  return rows.length > 0;
}

/**
 * Idempotente por construção: `onConflictDoNothing` sobre o índice único de `appointmentId`
 * — uma segunda chamada para o mesmo agendamento (ex.: race entre duas execuções do job) não
 * lança nem duplica linha, só devolve o registro já existente.
 */
export async function recordReminderSent(
  barbershopId: string,
  appointmentId: string,
  wamid: string,
): Promise<ConfirmationReminderRecord> {
  const [created] = await db
    .insert(confirmationReminders)
    .values({ barbershopId, appointmentId, wamid })
    .onConflictDoNothing({ target: confirmationReminders.appointmentId })
    .returning();

  if (created) return created;

  const [existing] = await db
    .select()
    .from(confirmationReminders)
    .where(eq(confirmationReminders.appointmentId, appointmentId));

  if (!existing) {
    throw new Error("Falha inesperada ao registrar envio de confirmação");
  }
  return existing;
}
