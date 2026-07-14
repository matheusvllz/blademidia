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
