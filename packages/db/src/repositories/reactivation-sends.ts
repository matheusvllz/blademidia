import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { reactivationSends } from "../schema/reactivation-sends";

/**
 * Regra de ouro (ADR-0007): toda função exportada aqui exige `barbershopId` explícito.
 * Log de envio de reativação (Fase 5.4, design.md Decision 2/3) — append-only, sem
 * unicidade por cliente (diferente de `confirmation_reminders`).
 */

export type ReactivationSendRecord = typeof reactivationSends.$inferSelect;

export async function recordReactivationSent(
  barbershopId: string,
  clientId: string,
  wamid: string,
  clientLastVisitAt: Date | null,
): Promise<ReactivationSendRecord> {
  const [created] = await db
    .insert(reactivationSends)
    .values({ barbershopId, clientId, wamid, clientLastVisitAt })
    .returning();
  if (!created) {
    throw new Error("Falha inesperada ao registrar envio de reativação");
  }
  return created;
}

/** Último envio de reativação para o cliente, para aplicar a regra de "novo ciclo" fora da
 * query de seleção quando necessário (ex.: em testes ou telas futuras). A seleção principal
 * (`listClientsNeedingReactivation`) já aplica a regra direto em SQL. */
export async function getLastReactivationSent(
  barbershopId: string,
  clientId: string,
): Promise<ReactivationSendRecord | null> {
  const rows = await db
    .select()
    .from(reactivationSends)
    .where(and(eq(reactivationSends.barbershopId, barbershopId), eq(reactivationSends.clientId, clientId)))
    .orderBy(desc(reactivationSends.sentAt))
    .limit(1);
  return rows[0] ?? null;
}
