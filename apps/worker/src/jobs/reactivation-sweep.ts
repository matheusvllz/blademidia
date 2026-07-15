import { getDashboard, listBarbershops } from "@blademidia/db";
import type PgBoss from "pg-boss";

/**
 * Esqueleto HONESTO (Fase 2, Non-Goal explícito): reaproveita a regra de
 * inatividade já validada na Fase 1 (`getDashboard`/`isClientInactive`) e
 * apenas REGISTRA (log) quantos clientes entrariam numa campanha de
 * reativação — nenhuma mensagem sai daqui. Envio real depende de
 * `whatsapp-canal` + `atendimento-ia` (Fase 5). Loga só a contagem por
 * barbearia (slug), nunca nome/telefone de cliente.
 */
export const REACTIVATION_SWEEP_QUEUE = "crm.reactivation-sweep";

export async function runReactivationSelection(): Promise<{ barbershops: number; totalCandidates: number }> {
  const shops = await listBarbershops();
  let totalCandidates = 0;
  for (const shop of shops) {
    const dashboard = await getDashboard(shop.id);
    totalCandidates += dashboard.clientsToReactivate.length;
    console.log(
      `[worker] ${REACTIVATION_SWEEP_QUEUE}: barbearia "${shop.slug}" tem ${dashboard.clientsToReactivate.length} cliente(s) a reativar — envio real pendente da Fase 5`,
    );
  }
  return { barbershops: shops.length, totalCandidates };
}

export async function registerReactivationSweep(boss: PgBoss): Promise<void> {
  await boss.createQueue(REACTIVATION_SWEEP_QUEUE);
  await boss.work(REACTIVATION_SWEEP_QUEUE, async () => {
    const { barbershops, totalCandidates } = await runReactivationSelection();
    console.log(
      `[worker] ${REACTIVATION_SWEEP_QUEUE}: ${totalCandidates} candidato(s) em ${barbershops} barbearia(s)`,
    );
  });
  // Uma vez por dia — reativação não é urgente como no-show/confirmação.
  await boss.schedule(REACTIVATION_SWEEP_QUEUE, "0 8 * * *");
}
