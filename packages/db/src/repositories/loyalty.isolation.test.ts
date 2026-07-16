/**
 * Teste de isolamento entre tenants (fidelização, Fase 4) — DoD do ADR-0007.
 * Precisa de Postgres real; pulado automaticamente se não houver banco.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createBarbershop } from "./barbershops";
import { createClient } from "./clients";
import {
  getLoyaltySettings,
  listClientsReadyForRedemption,
  redeemLoyalty,
  updateLoyaltySettings,
} from "./loyalty";
import { registerVisit } from "./visits";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const uniquePhone = () => `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;

describe.skipIf(!hasDatabase)("isolamento entre barbearias (loyalty)", () => {
  let shopA: { id: string };
  let shopB: { id: string };

  beforeAll(async () => {
    shopA = await createBarbershop(`loyalty-iso-a-${randomUUID()}`, "Barbearia A");
    shopB = await createBarbershop(`loyalty-iso-b-${randomUUID()}`, "Barbearia B");
  });

  it("configuração de fidelização de A não vaza para B", async () => {
    await updateLoyaltySettings(shopA.id, 10);
    const settingsB = await getLoyaltySettings(shopB.id);
    expect(settingsB.thresholdVisits).toBe(6); // default, não 10
  });

  it("cliente de A pronto para resgate não aparece na lista de B", async () => {
    await updateLoyaltySettings(shopA.id, 1);
    await updateLoyaltySettings(shopB.id, 1);

    const clientA = await createClient(shopA.id, { name: "Cliente A", phone: uniquePhone() });
    await registerVisit(shopA.id, clientA.client!.id, { serviceLabel: "Corte" });
    const redemption = await redeemLoyalty(shopA.id, clientA.client!.id);
    expect(redemption.id).toBeTruthy();

    const readyInA = await listClientsReadyForRedemption(shopA.id);
    // resgate reinicia a contagem — cliente A não está mais pronto logo após resgatar.
    expect(readyInA.map((c) => c.id)).not.toContain(clientA.client!.id);

    // Cria um cliente PRONTO em A (nova visita após o resgate) e confirma que B nunca o vê.
    await registerVisit(shopA.id, clientA.client!.id, { serviceLabel: "Corte" });
    const readyInAAfter = await listClientsReadyForRedemption(shopA.id);
    expect(readyInAAfter.map((c) => c.id)).toContain(clientA.client!.id);

    const readyInB = await listClientsReadyForRedemption(shopB.id);
    expect(readyInB.map((c) => c.id)).not.toContain(clientA.client!.id);
  });
});
