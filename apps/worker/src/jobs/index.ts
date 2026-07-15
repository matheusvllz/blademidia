import type PgBoss from "pg-boss";
import { registerNoShowSweep } from "./no-show-sweep";
import { registerReactivationSweep } from "./reactivation-sweep";
import { registerSendConfirmation } from "./send-confirmation";

/**
 * Registro central de jobs do worker (Fase 2):
 * - `agenda.no-show-sweep` — job REAL, marca falta em agendamentos vencidos.
 * - `agenda.send-confirmation` / `crm.reactivation-sweep` — esqueletos honestos:
 *   selecionam e REGISTRAM (log) o que enviariam; o envio real é da Fase 5.
 */
export async function registerJobs(boss: PgBoss): Promise<void> {
  await registerNoShowSweep(boss);
  await registerSendConfirmation(boss);
  await registerReactivationSweep(boss);
}
