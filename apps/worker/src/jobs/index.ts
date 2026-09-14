import type PgBoss from "pg-boss";
import { registerMonthlySnapshot } from "./monthly-snapshot";
import { registerNoShowSweep } from "./no-show-sweep";
import { registerProcessInbound } from "./process-inbound";
import { registerReactivationSweep } from "./reactivation-sweep";
import { registerSendConfirmation } from "./send-confirmation";

/**
 * Registro central de jobs do worker:
 * - `agenda.no-show-sweep` (Fase 2) — job REAL, marca falta em agendamentos vencidos.
 * - `agenda.send-confirmation` (Fase 5.3, `add-confirmacao-agendamento`) — job REAL, envia o
 *   template de confirmação (gate por barbearia + envio único) e registra o envio.
 * - `crm.reactivation-sweep` (Fase 5.4, `add-reativacao-clientes`) — job REAL, envia o template
 *   de reativação (marketing, gate por barbearia + regra de "novo ciclo" + throttling) e
 *   registra o envio.
 * - `relatorios.monthly-snapshot` (Fase 3) — job REAL, fecha o mês e materializa o snapshot.
 * - `whatsapp.process-inbound` (Fase 5, `add-whatsapp-canal`) — job REAL, processa mensagem
 *   recebida (last_inbound_at + handover) enfileirada pelo webhook.
 */
export async function registerJobs(boss: PgBoss): Promise<void> {
  await registerNoShowSweep(boss);
  await registerSendConfirmation(boss);
  await registerReactivationSweep(boss);
  await registerMonthlySnapshot(boss);
  await registerProcessInbound(boss);
}
