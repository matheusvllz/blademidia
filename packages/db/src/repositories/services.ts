import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../client";
import { services } from "../schema/services";

/**
 * Regra de ouro (ADR-0007): `barbershopId` explícito é sempre o 1º argumento —
 * não existe leitura/escrita de serviço fora do escopo do tenant.
 */

export type ServiceRecord = typeof services.$inferSelect;

export async function listServices(
  barbershopId: string,
  options: { onlyActive?: boolean } = {},
): Promise<ServiceRecord[]> {
  const conditions = [eq(services.barbershopId, barbershopId), isNull(services.deletedAt)];
  if (options.onlyActive) conditions.push(eq(services.active, true));
  return db
    .select()
    .from(services)
    .where(and(...conditions))
    .orderBy(asc(services.name));
}

export async function getService(
  barbershopId: string,
  serviceId: string,
): Promise<ServiceRecord | null> {
  const rows = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.barbershopId, barbershopId),
        eq(services.id, serviceId),
        isNull(services.deletedAt),
      ),
    );
  return rows[0] ?? null;
}

export interface CreateServiceInput {
  name: string;
  durationMin: number;
  priceCents?: number | null;
}

export type CreateServiceResult =
  | { error: null; service: ServiceRecord }
  | { error: "missing_fields" | "invalid_duration"; service: null };

export async function createService(
  barbershopId: string,
  input: CreateServiceInput,
): Promise<CreateServiceResult> {
  if (!input.name?.trim()) {
    return { error: "missing_fields", service: null };
  }
  if (!Number.isInteger(input.durationMin) || input.durationMin <= 0) {
    return { error: "invalid_duration", service: null };
  }
  const [created] = await db
    .insert(services)
    .values({
      barbershopId,
      name: input.name.trim(),
      durationMin: input.durationMin,
      priceCents: input.priceCents ?? null,
    })
    .returning();
  if (!created) throw new Error("Falha inesperada ao criar serviço");
  return { error: null, service: created };
}

export async function updateService(
  barbershopId: string,
  serviceId: string,
  input: Partial<{ name: string; durationMin: number; priceCents: number | null; active: boolean }>,
): Promise<ServiceRecord | null> {
  const [updated] = await db
    .update(services)
    .set(input)
    .where(and(eq(services.barbershopId, barbershopId), eq(services.id, serviceId)))
    .returning();
  return updated ?? null;
}

/** Soft delete: preserva agendamentos/atendimentos que referenciam o serviço. */
export async function deleteService(
  barbershopId: string,
  serviceId: string,
): Promise<ServiceRecord | null> {
  const [updated] = await db
    .update(services)
    .set({ deletedAt: new Date(), active: false })
    .where(and(eq(services.barbershopId, barbershopId), eq(services.id, serviceId)))
    .returning();
  return updated ?? null;
}
