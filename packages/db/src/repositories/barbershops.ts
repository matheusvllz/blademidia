import { eq } from "drizzle-orm";
import { db } from "../client";
import { barbershops } from "../schema/barbershops";

export type BarbershopRecord = typeof barbershops.$inferSelect;

export async function findBarbershopBySlug(slug: string) {
  const rows = await db.select().from(barbershops).where(eq(barbershops.slug, slug));
  return rows[0] ?? null;
}

export async function getBarbershop(barbershopId: string): Promise<BarbershopRecord | null> {
  const rows = await db.select().from(barbershops).where(eq(barbershops.id, barbershopId));
  return rows[0] ?? null;
}

/** Todas as barbearias — uso restrito a varreduras de sistema do worker (cross-tenant). */
export async function listBarbershops(): Promise<BarbershopRecord[]> {
  return db.select().from(barbershops);
}

export async function createBarbershop(slug: string, name: string) {
  const [row] = await db.insert(barbershops).values({ slug, name }).returning();
  if (!row) throw new Error("Falha inesperada ao criar barbearia");
  return row;
}

export async function getOrCreateBarbershopBySlug(slug: string, name: string) {
  const existing = await findBarbershopBySlug(slug);
  if (existing) return existing;
  return createBarbershop(slug, name);
}

/** Fase 5 (`add-whatsapp-canal`): resolve a barbearia dona do número/canal — é a chave de
 * roteamento do webhook único (design.md § Data Model). */
export async function findBarbershopByWhatsappPhoneNumberId(
  phoneNumberId: string,
): Promise<BarbershopRecord | null> {
  const rows = await db
    .select()
    .from(barbershops)
    .where(eq(barbershops.whatsappPhoneNumberId, phoneNumberId));
  return rows[0] ?? null;
}

export async function setWhatsappPhoneNumberId(
  barbershopId: string,
  phoneNumberId: string,
): Promise<BarbershopRecord | null> {
  const [updated] = await db
    .update(barbershops)
    .set({ whatsappPhoneNumberId: phoneNumberId })
    .where(eq(barbershops.id, barbershopId))
    .returning();
  return updated ?? null;
}
