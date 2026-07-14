import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../client";
import { barberServices } from "../schema/barber-services";
import { barbers } from "../schema/barbers";

/** ADR-0007: `barbershopId` explícito sempre em primeiro. */

export type BarberRecord = typeof barbers.$inferSelect;

export async function listBarbers(
  barbershopId: string,
  options: { onlyActive?: boolean } = {},
): Promise<BarberRecord[]> {
  const conditions = [eq(barbers.barbershopId, barbershopId), isNull(barbers.deletedAt)];
  if (options.onlyActive) conditions.push(eq(barbers.active, true));
  return db
    .select()
    .from(barbers)
    .where(and(...conditions))
    .orderBy(asc(barbers.name));
}

export async function getBarber(barbershopId: string, barberId: string): Promise<BarberRecord | null> {
  const rows = await db
    .select()
    .from(barbers)
    .where(
      and(eq(barbers.barbershopId, barbershopId), eq(barbers.id, barberId), isNull(barbers.deletedAt)),
    );
  return rows[0] ?? null;
}

export interface CreateBarberInput {
  name: string;
  color?: string | null;
}

export type CreateBarberResult =
  | { error: null; barber: BarberRecord }
  | { error: "missing_fields"; barber: null };

export async function createBarber(
  barbershopId: string,
  input: CreateBarberInput,
): Promise<CreateBarberResult> {
  if (!input.name?.trim()) {
    return { error: "missing_fields", barber: null };
  }
  const [created] = await db
    .insert(barbers)
    .values({ barbershopId, name: input.name.trim(), color: input.color ?? null })
    .returning();
  if (!created) throw new Error("Falha inesperada ao criar barbeiro");
  return { error: null, barber: created };
}

export async function updateBarber(
  barbershopId: string,
  barberId: string,
  input: Partial<{ name: string; color: string | null; active: boolean }>,
): Promise<BarberRecord | null> {
  const [updated] = await db
    .update(barbers)
    .set(input)
    .where(and(eq(barbers.barbershopId, barbershopId), eq(barbers.id, barberId)))
    .returning();
  return updated ?? null;
}

/** Soft delete: preserva agendamentos futuros já existentes (spec `agendamento`). */
export async function deleteBarber(
  barbershopId: string,
  barberId: string,
): Promise<BarberRecord | null> {
  const [updated] = await db
    .update(barbers)
    .set({ deletedAt: new Date(), active: false })
    .where(and(eq(barbers.barbershopId, barbershopId), eq(barbers.id, barberId)))
    .returning();
  return updated ?? null;
}

// --- Associação barbeiro↔serviço ---

export async function getBarberServiceIds(
  barbershopId: string,
  barberId: string,
): Promise<string[]> {
  const rows = await db
    .select({ serviceId: barberServices.serviceId })
    .from(barberServices)
    .where(and(eq(barberServices.barbershopId, barbershopId), eq(barberServices.barberId, barberId)));
  return rows.map((r) => r.serviceId);
}

/** Substitui o conjunto de serviços do barbeiro (conjunto vazio = faz todos). */
export async function setBarberServices(
  barbershopId: string,
  barberId: string,
  serviceIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(barberServices)
      .where(
        and(eq(barberServices.barbershopId, barbershopId), eq(barberServices.barberId, barberId)),
      );
    if (serviceIds.length > 0) {
      await tx
        .insert(barberServices)
        .values(serviceIds.map((serviceId) => ({ barbershopId, barberId, serviceId })));
    }
  });
}

/**
 * Barbeiros habilitados a um serviço: quem tem o serviço listado, MAIS quem não
 * tem nenhuma associação declarada (faz todos). Só barbeiros ativos.
 */
export async function listBarbersForService(
  barbershopId: string,
  serviceId: string,
): Promise<BarberRecord[]> {
  const active = await listBarbers(barbershopId, { onlyActive: true });
  if (active.length === 0) return [];

  const links = await db
    .select({ barberId: barberServices.barberId, serviceId: barberServices.serviceId })
    .from(barberServices)
    .where(
      and(
        eq(barberServices.barbershopId, barbershopId),
        inArray(
          barberServices.barberId,
          active.map((b) => b.id),
        ),
      ),
    );

  const barbersWithAnyLink = new Set(links.map((l) => l.barberId));
  const barbersDoingService = new Set(
    links.filter((l) => l.serviceId === serviceId).map((l) => l.barberId),
  );

  return active.filter((b) => !barbersWithAnyLink.has(b.id) || barbersDoingService.has(b.id));
}
