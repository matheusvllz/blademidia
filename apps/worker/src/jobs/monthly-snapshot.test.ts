/**
 * Testa a função de execução do job (`runMonthlySnapshot`), sem subir
 * pg-boss — o agendamento cron é só plumbing (validado manualmente no boot,
 * como os demais jobs). Precisa de Postgres real; pulado sem `DATABASE_URL`.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createBarbershop, createClient, createService, getReportSnapshot, registerVisit } from "@blademidia/db";
import { previousMonthPeriod, runMonthlySnapshot } from "./monthly-snapshot";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const uniquePhone = () => `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;

describe.skipIf(!hasDatabase)("previousMonthPeriod", () => {
  it("mês normal", () => {
    expect(previousMonthPeriod(new Date("2035-03-15T00:00:00Z"))).toEqual({
      year: 2035,
      month: 2,
      from: "2035-02-01",
      to: "2035-02-28",
    });
  });

  it("virada de ano em janeiro volta para dezembro do ano anterior", () => {
    expect(previousMonthPeriod(new Date("2035-01-10T00:00:00Z"))).toEqual({
      year: 2034,
      month: 12,
      from: "2034-12-01",
      to: "2034-12-31",
    });
  });
});

describe.skipIf(!hasDatabase)("runMonthlySnapshot", () => {
  let shopId: string;

  beforeAll(async () => {
    const shop = await createBarbershop(`worker-snap-${randomUUID()}`, "Worker Snapshot");
    shopId = shop.id;
    const service = await createService(shopId, { name: "Corte", durationMin: 30 });
    const client = await createClient(shopId, { name: "Cliente", phone: uniquePhone() });
    // Fevereiro/2035 será o "mês anterior" quando `now` = 2035-03-01.
    await registerVisit(shopId, client.client!.id, {
      serviceLabel: "Corte",
      serviceId: service.service!.id,
      occurredAt: new Date("2035-02-15T12:00:00Z"),
      amountCents: 7000,
    });
  });

  // Timeout maior: `runMonthlySnapshot` varre TODAS as barbearias (varredura de
  // sistema, sem filtro de tenant) e o Postgres de desenvolvimento acumula
  // barbearias de todo o histórico de testes do monorepo (uma por teste de
  // isolamento/agenda/relatórios já rodado) — não é um problema de produção
  // (volume real por ICP é pequeno; risco documentado no design.md).
  it(
    "fecha o mês e materializa o snapshot, sem preencher colunas da Fase 5",
    async () => {
      const { processed, failed } = await runMonthlySnapshot(new Date("2035-03-01T00:05:00Z"));
      expect(processed).toBeGreaterThanOrEqual(1);
      expect(failed).toBe(0);

      const snapshot = await getReportSnapshot(shopId, 2035, 2);
      expect(snapshot).not.toBeNull();
      expect(snapshot?.revenueCents).toBe(7000);
      expect(snapshot?.visitsCount).toBe(1);
      expect(snapshot?.reactivatedCount).toBeNull();
      expect(snapshot?.noShowPreventedCount).toBeNull();
      expect(snapshot?.botMessagesCount).toBeNull();
      expect(snapshot?.recoveredRevenueCents).toBeNull();
    },
    30_000,
  );

  it(
    "rodar de novo não duplica (idempotente) — mesma linha, mesmos agregados",
    async () => {
      const first = await getReportSnapshot(shopId, 2035, 2);
      await runMonthlySnapshot(new Date("2035-03-01T00:05:00Z"));
      const second = await getReportSnapshot(shopId, 2035, 2);
      expect(second?.id).toBe(first?.id);
      expect(second?.revenueCents).toBe(first?.revenueCents);
    },
    30_000,
  );
});
