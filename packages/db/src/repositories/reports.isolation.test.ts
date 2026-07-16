/**
 * Teste de isolamento entre tenants (Fase 3) — DoD do ADR-0007. Precisa de
 * Postgres real (`DATABASE_URL`); pulado automaticamente se não houver banco.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createBarber } from "./barbers";
import { createBarbershop } from "./barbershops";
import { createClient } from "./clients";
import {
  getRevenueStats,
  getReportSnapshot,
  getTopServices,
  upsertReportSnapshot,
} from "./reports";
import { createService } from "./services";
import { registerVisit } from "./visits";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const uniquePhone = () => `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;

describe.skipIf(!hasDatabase)("isolamento entre barbearias (reports)", () => {
  let shopA: { id: string };
  let shopB: { id: string };
  const from = new Date("2032-01-01T00:00:00Z");
  const to = new Date("2032-02-01T00:00:00Z");

  beforeAll(async () => {
    shopA = await createBarbershop(`rep-iso-a-${randomUUID()}`, "Barbearia A");
    shopB = await createBarbershop(`rep-iso-b-${randomUUID()}`, "Barbearia B");

    const serviceA = await createService(shopA.id, { name: "Corte A", durationMin: 30, priceCents: 5000 });
    await createBarber(shopA.id, { name: "Barbeiro A" });
    const clientA = await createClient(shopA.id, { name: "Cliente A", phone: uniquePhone() });
    await registerVisit(shopA.id, clientA.client!.id, {
      serviceLabel: "Corte A",
      serviceId: serviceA.service!.id,
      occurredAt: new Date("2032-01-10T12:00:00Z"),
      amountCents: 5000,
    });
  });

  it("indicadores de B não incluem faturamento/atendimentos de A", async () => {
    const statsB = await getRevenueStats(shopB.id, from, to);
    expect(statsB.revenueCents).toBe(0);
    expect(statsB.visitsCount).toBe(0);
  });

  it("ranking de serviços de B não inclui o serviço de A", async () => {
    const rankingsB = await getTopServices(shopB.id, from, to);
    expect(rankingsB).toHaveLength(0);
  });

  it("snapshot de A não é lido nem sobrescrito pela chave de B", async () => {
    const input = {
      revenueCents: 5000,
      visitsCount: 1,
      avgTicketCents: 5000,
      newClientsCount: 0,
      servedClientsCount: 1,
      occupiedCount: 0,
      capacityCount: 0,
      noShowCount: 0,
      canceledCount: 0,
      topServices: [],
      topBarbers: [],
    };
    await upsertReportSnapshot(shopA.id, 2032, 1, input);
    const snapshotForB = await getReportSnapshot(shopB.id, 2032, 1);
    expect(snapshotForB).toBeNull();
  });
});
