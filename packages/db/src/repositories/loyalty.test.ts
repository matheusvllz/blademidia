/**
 * Testes de integração de fidelização (Fase 4) contra Postgres real
 * (`DATABASE_URL`). Pulados sem banco, como os demais testes de integração.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createBarbershop } from "./barbershops";
import { createClient } from "./clients";
import {
  getLoyaltySettings,
  getLoyaltyStatus,
  listClientsReadyForRedemption,
  redeemLoyalty,
  updateLoyaltySettings,
} from "./loyalty";
import { registerVisit } from "./visits";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const uniquePhone = () => `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;

describe.skipIf(!hasDatabase)("loyalty", () => {
  let shopId: string;

  beforeAll(async () => {
    const shop = await createBarbershop(`loyalty-${randomUUID()}`, "Fidelização Teste");
    shopId = shop.id;
  });

  it("getLoyaltySettings usa o padrão (6) quando a barbearia nunca configurou", async () => {
    const settings = await getLoyaltySettings(shopId);
    expect(settings.thresholdVisits).toBe(6);
  });

  it("updateLoyaltySettings altera o limite só para a barbearia", async () => {
    const other = await createBarbershop(`loyalty-other-${randomUUID()}`, "Outra");
    await updateLoyaltySettings(shopId, 3);
    const changed = await getLoyaltySettings(shopId);
    const untouched = await getLoyaltySettings(other.id);
    expect(changed.thresholdVisits).toBe(3);
    expect(untouched.thresholdVisits).toBe(6);
  });

  it("conta só visitas após a ativação (loyalty_baseline_at) — histórico anterior não conta", async () => {
    const client = await createClient(shopId, { name: "Baseline", phone: uniquePhone() });
    const clientId = client.client!.id;

    // Visita "antiga", anterior à criação do cliente (simula histórico pré-ativação).
    await registerVisit(shopId, clientId, {
      serviceLabel: "Corte",
      occurredAt: new Date("2000-01-01T00:00:00Z"),
    });
    let status = await getLoyaltyStatus(shopId, clientId);
    expect(status.count).toBe(0);

    // Visita depois da ativação conta.
    await registerVisit(shopId, clientId, { serviceLabel: "Corte", occurredAt: new Date() });
    status = await getLoyaltyStatus(shopId, clientId);
    expect(status.count).toBe(1);
  });

  it("sinaliza meta atingida quando a contagem bate o limite configurado", async () => {
    const client = await createClient(shopId, { name: "Meta", phone: uniquePhone() });
    const clientId = client.client!.id;
    await updateLoyaltySettings(shopId, 2);

    let status = await getLoyaltyStatus(shopId, clientId);
    expect(status.goalReached).toBe(false);

    await registerVisit(shopId, clientId, { serviceLabel: "Corte" });
    await registerVisit(shopId, clientId, { serviceLabel: "Corte" });

    status = await getLoyaltyStatus(shopId, clientId);
    expect(status.count).toBe(2);
    expect(status.threshold).toBe(2);
    expect(status.goalReached).toBe(true);
  });

  it("resgate reinicia a contagem a partir da data do resgate", async () => {
    const client = await createClient(shopId, { name: "Resgate", phone: uniquePhone() });
    const clientId = client.client!.id;
    await updateLoyaltySettings(shopId, 2);

    await registerVisit(shopId, clientId, { serviceLabel: "Corte" });
    await registerVisit(shopId, clientId, { serviceLabel: "Corte" });
    expect((await getLoyaltyStatus(shopId, clientId)).goalReached).toBe(true);

    await redeemLoyalty(shopId, clientId);
    const afterRedeem = await getLoyaltyStatus(shopId, clientId);
    expect(afterRedeem.count).toBe(0);
    expect(afterRedeem.goalReached).toBe(false);

    await registerVisit(shopId, clientId, { serviceLabel: "Corte" });
    expect((await getLoyaltyStatus(shopId, clientId)).count).toBe(1);
  });

  it("listClientsReadyForRedemption retorna só quem atingiu a meta", async () => {
    const shop = await createBarbershop(`loyalty-list-${randomUUID()}`, "Lista");
    await updateLoyaltySettings(shop.id, 2);

    const ready = await createClient(shop.id, { name: "Pronto", phone: uniquePhone() });
    await registerVisit(shop.id, ready.client!.id, { serviceLabel: "Corte" });
    await registerVisit(shop.id, ready.client!.id, { serviceLabel: "Corte" });

    const notReady = await createClient(shop.id, { name: "Não pronto", phone: uniquePhone() });
    await registerVisit(shop.id, notReady.client!.id, { serviceLabel: "Corte" });

    const list = await listClientsReadyForRedemption(shop.id);
    expect(list.map((c) => c.id)).toContain(ready.client!.id);
    expect(list.map((c) => c.id)).not.toContain(notReady.client!.id);
  });
});
