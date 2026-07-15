import { listAppointmentsNeedingConfirmation } from "@blademidia/db";
import type PgBoss from "pg-boss";

/**
 * Esqueleto HONESTO (Fase 2, Non-Goal explícito): seleciona os agendamentos que
 * entrariam na janela de confirmação (`confirmation_lead_hours`) e apenas
 * REGISTRA (log) o que enviaria — nenhuma mensagem sai daqui. O envio real
 * depende de `whatsapp-canal` (Fase 5, provedor em aberto por D2/ADR-0004).
 * Nunca loga telefone completo ou conteúdo (não há nem PII nesta seleção).
 */
export const SEND_CONFIRMATION_QUEUE = "agenda.send-confirmation";

export async function runSendConfirmationSelection(
  now: Date = new Date(),
): Promise<{ wouldNotify: number }> {
  const candidates = await listAppointmentsNeedingConfirmation(now);
  for (const candidate of candidates) {
    console.log(
      `[worker] ${SEND_CONFIRMATION_QUEUE}: enviaria confirmação do agendamento ${candidate.id} (barbearia ${candidate.barbershopId}, início ${candidate.startsAt.toISOString()}) — envio real pendente da Fase 5`,
    );
  }
  return { wouldNotify: candidates.length };
}

export async function registerSendConfirmation(boss: PgBoss): Promise<void> {
  await boss.createQueue(SEND_CONFIRMATION_QUEUE);
  await boss.work(SEND_CONFIRMATION_QUEUE, async () => {
    const { wouldNotify } = await runSendConfirmationSelection();
    console.log(`[worker] ${SEND_CONFIRMATION_QUEUE}: ${wouldNotify} agendamento(s) na janela de confirmação`);
  });
  // Verifica a janela a cada hora — o próprio filtro de lead hours evita repetição útil.
  await boss.schedule(SEND_CONFIRMATION_QUEUE, "0 * * * *");
}
