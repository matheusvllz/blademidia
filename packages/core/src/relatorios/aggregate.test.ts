/**
 * Testes de integração de `aggregateReport` (Fase 3) contra Postgres real
 * (`DATABASE_URL`). Pulados sem banco, como os demais testes de integração.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createBarber,
  createBarbershop,
  createClient,
  createService,
  registerVisit,
} from "@blademidia/db";
import { aggregateReport } from "./aggregate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const uniquePhone = () => `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;

describe.skipIf(!hasDatabase)("aggregateReport", () => {
  it("intervalo inválido (from > to) é recusado sem consultar nada", async () => {
    const result = await aggregateReport(randomUUID(), { from: "2033-07-10", to: "2033-07-05" });
    expect(result).toEqual({ ok: false, reason: "invalid_range" });
  });

  it("período sem dados: estado vazio, sem erro, sem variação", async () => {
    const shop = await createBarbershop(`agg-empty-${randomUUID()}`, "Vazia");
    const result = await aggregateReport(shop.id, { from: "2033-07-01", to: "2033-07-31" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revenueCents).toBe(0);
    expect(result.value.visitsCount).toBe(0);
    expect(result.value.avgTicketCents).toBeNull();
    expect(result.value.occupied).toBe(0);
    expect(result.value.capacity).toBe(0);
    expect(result.value.comparison).toEqual({
      available: false,
      revenueChangePct: null,
      visitsChangePct: null,
      noShowChangePct: null,
    });
  });

  it("período com movimento: indicadores corretos e sinalização de valor ausente", async () => {
    const shop = await createBarbershop(`agg-mov-${randomUUID()}`, "Movimento");
    const service = await createService(shop.id, { name: "Corte", durationMin: 30, priceCents: 4000 });
    const barber = await createBarber(shop.id, { name: "Barbeiro" });
    const client = await createClient(shop.id, { name: "Cliente", phone: uniquePhone() });

    await registerVisit(shop.id, client.client!.id, {
      serviceLabel: "Corte",
      serviceId: service.service!.id,
      staffId: barber.barber!.id,
      occurredAt: new Date("2033-08-05T12:00:00Z"),
      amountCents: 4000,
    });
    await registerVisit(shop.id, client.client!.id, {
      serviceLabel: "Corte",
      serviceId: service.service!.id,
      staffId: barber.barber!.id,
      occurredAt: new Date("2033-08-10T12:00:00Z"),
      // sem valor
    });

    const result = await aggregateReport(shop.id, { from: "2033-08-01", to: "2033-08-31" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revenueCents).toBe(4000);
    expect(result.value.visitsCount).toBe(2);
    expect(result.value.unpricedVisitsCount).toBe(1);
    expect(result.value.avgTicketCents).toBe(4000);
    expect(result.value.topServices).toHaveLength(1);
  });

  it("comparação com período anterior: variação calculada quando o anterior tem dado", async () => {
    const shop = await createBarbershop(`agg-cmp-${randomUUID()}`, "Comparação");
    const service = await createService(shop.id, { name: "Corte", durationMin: 30, priceCents: 5000 });
    const client = await createClient(shop.id, { name: "Cliente", phone: uniquePhone() });

    // Setembro/2033 (período): 1 visita de 10000.
    await registerVisit(shop.id, client.client!.id, {
      serviceLabel: "Corte",
      serviceId: service.service!.id,
      occurredAt: new Date("2033-09-05T12:00:00Z"),
      amountCents: 10_000,
    });
    // Agosto/2033 (período anterior): 1 visita de 5000.
    await registerVisit(shop.id, client.client!.id, {
      serviceLabel: "Corte",
      serviceId: service.service!.id,
      occurredAt: new Date("2033-08-05T12:00:00Z"),
      amountCents: 5_000,
    });

    const result = await aggregateReport(shop.id, { from: "2033-09-01", to: "2033-09-30" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.comparison.available).toBe(true);
    expect(result.value.comparison.revenueChangePct).toBe(100); // 5000 → 10000 = +100%
  });
});
