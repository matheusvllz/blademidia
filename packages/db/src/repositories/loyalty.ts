import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import { clients } from "../schema/clients";
import { DEFAULT_LOYALTY_THRESHOLD_VISITS, loyaltySettings } from "../schema/loyalty-settings";
import { loyaltyRedemptions } from "../schema/loyalty-redemptions";
import { visits } from "../schema/visits";

/** ADR-0007: `barbershopId` explícito sempre em primeiro. */

export interface LoyaltySettingsValues {
  thresholdVisits: number;
}

export async function getLoyaltySettings(
  barbershopId: string,
): Promise<LoyaltySettingsValues & { barbershopId: string }> {
  const rows = await db.select().from(loyaltySettings).where(eq(loyaltySettings.barbershopId, barbershopId));
  return {
    barbershopId,
    thresholdVisits: rows[0]?.thresholdVisits ?? DEFAULT_LOYALTY_THRESHOLD_VISITS,
  };
}

export async function updateLoyaltySettings(
  barbershopId: string,
  thresholdVisits: number,
): Promise<LoyaltySettingsValues> {
  const [row] = await db
    .insert(loyaltySettings)
    .values({ barbershopId, thresholdVisits })
    .onConflictDoUpdate({ target: loyaltySettings.barbershopId, set: { thresholdVisits } })
    .returning();
  if (!row) throw new Error("Falha inesperada ao salvar configuração de fidelização");
  return { thresholdVisits: row.thresholdVisits };
}

export interface LoyaltyStatus {
  count: number;
  threshold: number;
  goalReached: boolean;
}

/**
 * Contagem ON-THE-FLY (Decision 6 do design.md de
 * `add-fidelizacao-e-funcionarios`): visitas do cliente após o resgate mais
 * recente, ou após `loyalty_baseline_at` se nunca resgatou.
 */
export async function getLoyaltyStatus(barbershopId: string, clientId: string): Promise<LoyaltyStatus> {
  const [client] = await db
    .select({ loyaltyBaselineAt: clients.loyaltyBaselineAt })
    .from(clients)
    .where(and(eq(clients.barbershopId, barbershopId), eq(clients.id, clientId)));
  const baseline = client?.loyaltyBaselineAt ?? new Date(0);

  const [lastRedemption] = await db
    .select({ redeemedAt: sql<Date>`max(${loyaltyRedemptions.redeemedAt})` })
    .from(loyaltyRedemptions)
    .where(and(eq(loyaltyRedemptions.barbershopId, barbershopId), eq(loyaltyRedemptions.clientId, clientId)));
  const since = lastRedemption?.redeemedAt ? new Date(lastRedemption.redeemedAt) : baseline;

  const [visitCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(visits)
    .where(and(eq(visits.barbershopId, barbershopId), eq(visits.clientId, clientId), gt(visits.occurredAt, since)));

  const { thresholdVisits } = await getLoyaltySettings(barbershopId);
  const count = visitCount?.count ?? 0;
  return { count, threshold: thresholdVisits, goalReached: count >= thresholdVisits };
}

export interface ClientReadyForRedemption {
  id: string;
  name: string | null;
  count: number;
}

/**
 * Clientes com a meta atingida (dashboard) — mesma regra de `getLoyaltyStatus`,
 * numa única consulta agregada em vez de N+1 por cliente (padrão de
 * `dashboard.ts`).
 */
export async function listClientsReadyForRedemption(
  barbershopId: string,
): Promise<ClientReadyForRedemption[]> {
  const { thresholdVisits } = await getLoyaltySettings(barbershopId);

  const lastRedemptionPerClient = db.$with("last_redemption_per_client").as(
    db
      .select({
        clientId: loyaltyRedemptions.clientId,
        lastRedeemedAt: sql<Date>`max(${loyaltyRedemptions.redeemedAt})`.as("last_redeemed_at"),
      })
      .from(loyaltyRedemptions)
      .where(eq(loyaltyRedemptions.barbershopId, barbershopId))
      .groupBy(loyaltyRedemptions.clientId),
  );

  const rows = await db
    .with(lastRedemptionPerClient)
    .select({
      id: clients.id,
      name: clients.name,
      count: sql<number>`count(${visits.id})::int`,
    })
    .from(clients)
    .leftJoin(lastRedemptionPerClient, eq(lastRedemptionPerClient.clientId, clients.id))
    .leftJoin(
      visits,
      and(
        eq(visits.clientId, clients.id),
        eq(visits.barbershopId, barbershopId),
        sql`${visits.occurredAt} > coalesce(${lastRedemptionPerClient.lastRedeemedAt}, ${clients.loyaltyBaselineAt})`,
      ),
    )
    .where(and(eq(clients.barbershopId, barbershopId), isNull(clients.deletedAt)))
    .groupBy(clients.id, clients.name)
    .having(sql`count(${visits.id}) >= ${thresholdVisits}`);

  return rows;
}

export async function redeemLoyalty(
  barbershopId: string,
  clientId: string,
  visitId?: string | null,
): Promise<{ id: string; redeemedAt: Date }> {
  const [row] = await db
    .insert(loyaltyRedemptions)
    .values({ barbershopId, clientId, visitId: visitId ?? null })
    .returning();
  if (!row) throw new Error("Falha inesperada ao registrar resgate de fidelização");
  return { id: row.id, redeemedAt: row.redeemedAt };
}
