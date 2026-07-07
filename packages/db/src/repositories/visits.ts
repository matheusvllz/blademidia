import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { paymentsLog } from "../schema/payments-log";
import { visits } from "../schema/visits";

export type VisitRecord = typeof visits.$inferSelect;
export type PaymentRecord = typeof paymentsLog.$inferSelect;

export async function listVisitsForClient(
  barbershopId: string,
  clientId: string,
): Promise<VisitRecord[]> {
  return db
    .select()
    .from(visits)
    .where(and(eq(visits.barbershopId, barbershopId), eq(visits.clientId, clientId)))
    .orderBy(desc(visits.occurredAt));
}

export async function lastVisitForClient(
  barbershopId: string,
  clientId: string,
): Promise<VisitRecord | null> {
  const rows = await db
    .select()
    .from(visits)
    .where(and(eq(visits.barbershopId, barbershopId), eq(visits.clientId, clientId)))
    .orderBy(desc(visits.occurredAt))
    .limit(1);
  return rows[0] ?? null;
}

export interface RegisterVisitInput {
  serviceLabel: string;
  staffLabel?: string;
  occurredAt?: Date;
  amountCents?: number;
  method?: "dinheiro" | "cartao" | "pix" | "outro";
}

export async function registerVisit(
  barbershopId: string,
  clientId: string,
  input: RegisterVisitInput,
): Promise<{ visit: VisitRecord; payment: PaymentRecord | null }> {
  const [visit] = await db
    .insert(visits)
    .values({
      barbershopId,
      clientId,
      serviceLabel: input.serviceLabel,
      staffLabel: input.staffLabel,
      occurredAt: input.occurredAt ?? new Date(),
    })
    .returning();

  if (!visit) {
    throw new Error("Falha inesperada ao registrar atendimento");
  }

  let payment: PaymentRecord | null = null;
  if (input.amountCents != null) {
    const [createdPayment] = await db
      .insert(paymentsLog)
      .values({
        barbershopId,
        clientId,
        visitId: visit.id,
        amountCents: input.amountCents,
        method: input.method ?? "outro",
        paidAt: visit.occurredAt,
      })
      .returning();
    payment = createdPayment ?? null;
  }

  return { visit, payment };
}
