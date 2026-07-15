import { markNoShow } from "@blademidia/core";
import { listNoShowCandidates } from "@blademidia/db";
import type PgBoss from "pg-boss";

/**
 * Job REAL da Fase 2 (design.md, Decision 2 / ADR-0009): marca falta nos
 * agendamentos ativos vencidos além do `no_show_after_min` de cada barbearia.
 * Idempotente — `AgendaService.markNoShow` já trata "já é falta" (ok, no-op) e
 * "não está mais ativo" (recusa segura, sem crash) via checagem de transição.
 */
export const NO_SHOW_SWEEP_QUEUE = "agenda.no-show-sweep";

export async function runNoShowSweep(now: Date = new Date()): Promise<{ processed: number }> {
  const candidates = await listNoShowCandidates(now);
  let processed = 0;
  for (const candidate of candidates) {
    const result = await markNoShow(candidate.barbershopId, candidate.id);
    if (result.ok) processed += 1;
  }
  return { processed };
}

export async function registerNoShowSweep(boss: PgBoss): Promise<void> {
  await boss.createQueue(NO_SHOW_SWEEP_QUEUE);
  await boss.work(NO_SHOW_SWEEP_QUEUE, async () => {
    const { processed } = await runNoShowSweep();
    console.log(`[worker] ${NO_SHOW_SWEEP_QUEUE}: ${processed} agendamento(s) marcados como falta`);
  });

  const intervalMin = Math.max(1, Number(process.env.NO_SHOW_SWEEP_INTERVAL_MIN ?? "5"));
  await boss.schedule(NO_SHOW_SWEEP_QUEUE, `*/${intervalMin} * * * *`);
}
