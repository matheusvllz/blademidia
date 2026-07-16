/**
 * Regressão LGPD (Fase 3, spec "Preservação de agregados na exclusão LGPD")
 * contra Postgres real. A exclusão de cliente (`deleteClient`, já existente em
 * `crm-clientes`) anonimiza nome/telefone mas preserva `visits`/`payments_log`
 * — este teste prova que `aggregateReport` continua consistente depois da
 * exclusão e nunca expõe identidade removida (os agregados aqui nunca
 * selecionam `clients.name`/`clients.phone`, então a garantia é estrutural,
 * não apenas comportamental).
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBarbershop, createClient, createService, deleteClient, registerVisit } from "@blademidia/db";
import { aggregateReport } from "./aggregate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const uniquePhone = () => `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;

describe.skipIf(!hasDatabase)("relatorios × exclusão LGPD", () => {
  it("agregados do período permanecem idênticos após excluir o cliente", async () => {
    const shop = await createBarbershop(`rel-lgpd-${randomUUID()}`, "LGPD");
    const service = await createService(shop.id, { name: "Corte", durationMin: 30, priceCents: 6000 });
    const client = await createClient(shop.id, { name: "Cliente LGPD", phone: uniquePhone() });

    await registerVisit(shop.id, client.client!.id, {
      serviceLabel: "Corte",
      serviceId: service.service!.id,
      occurredAt: new Date("2036-01-15T12:00:00Z"),
      amountCents: 6000,
    });

    const period = { from: "2036-01-01", to: "2036-01-31" };
    const before = await aggregateReport(shop.id, period);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.value.revenueCents).toBe(6000);
    expect(before.value.visitsCount).toBe(1);

    const deleted = await deleteClient(shop.id, client.client!.id);
    expect(deleted?.name).toBeNull();
    expect(deleted?.phone).toBeNull();

    const after = await aggregateReport(shop.id, period);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.value.revenueCents).toBe(before.value.revenueCents);
    expect(after.value.visitsCount).toBe(before.value.visitsCount);
    expect(after.value.servedClientsCount).toBe(before.value.servedClientsCount);

    // Nenhuma saída do relatório contém nome/telefone — os agregados só
    // referenciam serviço/barbeiro, nunca identidade de cliente.
    const serialized = JSON.stringify(after.value);
    expect(serialized).not.toContain("Cliente LGPD");
  });
});
