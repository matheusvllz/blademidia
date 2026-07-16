import { aggregateReport } from "@blademidia/core";
import { listBarbershops, upsertReportSnapshot } from "@blademidia/db";
import type PgBoss from "pg-boss";

/**
 * Job REAL da Fase 3 (design.md, Flow 3 / Decision 1): fecha o mês anterior e
 * materializa o snapshot por barbearia, usando a MESMA `aggregateReport` que a
 * tela consulta sob demanda — nunca dois cálculos. Erro numa barbearia não
 * interrompe as demais (Error Flow 3 do design). Nunca escreve as colunas
 * reservadas da Fase 5 (`upsertReportSnapshot` não as inclui no `set`).
 */
export const MONTHLY_SNAPSHOT_QUEUE = "relatorios.monthly-snapshot";

const pad2 = (n: number): string => String(n).padStart(2, "0");

export function previousMonthPeriod(now: Date): { year: number; month: number; from: string; to: string } {
  const currentMonth0 = now.getUTCMonth(); // 0 = janeiro
  const month = currentMonth0 === 0 ? 12 : currentMonth0; // mês anterior, 1-indexado
  const year = currentMonth0 === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    year,
    month,
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

export async function runMonthlySnapshot(
  now: Date = new Date(),
): Promise<{ processed: number; failed: number }> {
  const { year, month, from, to } = previousMonthPeriod(now);
  const shops = await listBarbershops();

  let processed = 0;
  let failed = 0;
  for (const shop of shops) {
    try {
      const result = await aggregateReport(shop.id, { from, to });
      if (!result.ok) {
        // Não deveria acontecer (from/to sempre válidos aqui) — trata como falha isolada.
        failed += 1;
        console.error(
          `[worker] ${MONTHLY_SNAPSHOT_QUEUE}: barbearia "${shop.slug}" — período inválido (${from} a ${to})`,
        );
        continue;
      }
      const report = result.value;
      await upsertReportSnapshot(shop.id, year, month, {
        revenueCents: report.revenueCents,
        visitsCount: report.visitsCount,
        avgTicketCents: report.avgTicketCents,
        newClientsCount: report.newClientsCount,
        servedClientsCount: report.servedClientsCount,
        occupiedCount: report.occupied,
        capacityCount: report.capacity,
        noShowCount: report.noShowCount,
        canceledCount: report.canceledCount,
        topServices: report.topServices,
        topBarbers: report.topBarbers,
      });
      processed += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `[worker] ${MONTHLY_SNAPSHOT_QUEUE}: falha ao processar barbearia "${shop.slug}":`,
        error,
      );
    }
  }
  return { processed, failed };
}

export async function registerMonthlySnapshot(boss: PgBoss): Promise<void> {
  await boss.createQueue(MONTHLY_SNAPSHOT_QUEUE);
  await boss.work(MONTHLY_SNAPSHOT_QUEUE, async () => {
    const { processed, failed } = await runMonthlySnapshot();
    console.log(
      `[worker] ${MONTHLY_SNAPSHOT_QUEUE}: ${processed} barbearia(s) processada(s), ${failed} falha(s)`,
    );
  });
  // Dia 1 de cada mês, 00:05 — fecha o mês anterior.
  await boss.schedule(MONTHLY_SNAPSHOT_QUEUE, "5 0 1 * *");
}
