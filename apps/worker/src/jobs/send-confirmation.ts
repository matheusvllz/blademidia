import { instantToZonedTimeHHMM, instantToZonedDateISO } from "@blademidia/core";
import {
  findOrCreateConversation,
  getAppointment,
  getBarbershop,
  createMessage,
  listAppointmentsNeedingConfirmation,
  recordReminderSent,
} from "@blademidia/db";
import { maskPhone, resolveWhatsAppProvider, type WhatsAppProvider } from "@blademidia/whatsapp";
import type PgBoss from "pg-boss";

/**
 * Job REAL desde a Fase 5.3 (`add-confirmacao-agendamento`, design.md § "Visão geral" e
 * Decisions 3/4/8/9). Antes disso (Fase 2), era um esqueleto honesto que só logava — agora
 * envia de fato, através de `WhatsAppProvider.sendTemplate` (já existente desde
 * `add-whatsapp-canal`), respeitando os 2 gates já aplicados pela query de seleção
 * (`confirmationAutomationEnabled` por barbearia; nunca reenviar um agendamento já
 * notificado — `confirmation_reminders`).
 *
 * Nunca loga corpo de mensagem ou telefone completo (regra do repositório) — só
 * identificadores técnicos e telefone mascarado.
 */
export const SEND_CONFIRMATION_QUEUE = "agenda.send-confirmation";

/** Nome e idioma do template — precisam bater exatamente com o que foi aprovado pela Meta
 * (design.md, rascunho de copy). Ajustar aqui quando o Matheus confirmar o nome definitivo. */
const TEMPLATE_NAME = "confirmacao_agendamento";
const TEMPLATE_LANGUAGE = "pt_BR";

/** Reconstrução local do texto renderizado, só para exibição no histórico de `/conversas` —
 * o envio real usa `templateName`/`bodyParams` (a Meta é quem renderiza de fato). */
function renderTemplateBodyForHistory(clientFirstName: string, diaDDMM: string, horaHHMM: string): string {
  return `oi ${clientFirstName}! passando pra confirmar seu horário dia ${diaDDMM} às ${horaHHMM}. responde "sim" pra confirmar ou me chama aqui se precisar mudar 💈`;
}

function toDDMM(dateISO: string): string {
  const [, month, day] = dateISO.split("-");
  return `${day}/${month}`;
}

export interface SendConfirmationResult {
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * `provider` é injetável (default: `resolveWhatsAppProvider(process.env)`) — usado pelos testes
 * ponta a ponta (change `add-reativacao-clientes`) para passar o adapter dry-run real
 * diretamente, sem precisar mockar o módulo `@blademidia/whatsapp`.
 */
export async function runSendConfirmation(
  now: Date = new Date(),
  provider: WhatsAppProvider = resolveWhatsAppProvider(process.env),
): Promise<SendConfirmationResult> {
  const candidates = await listAppointmentsNeedingConfirmation(now);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      // Decision 4 (design.md): relê o status imediatamente antes de enviar — o candidato pode
      // ter sido cancelado/remarcado/confirmado por outro caminho entre a seleção e este ponto.
      const fresh = await getAppointment(candidate.barbershopId, candidate.id);
      if (!fresh || fresh.status !== "agendado") {
        skipped += 1;
        continue;
      }

      const barbershop = await getBarbershop(candidate.barbershopId);
      if (!barbershop?.whatsappPhoneNumberId) {
        // Não deveria acontecer (o script de ativação exige o número configurado antes de
        // ligar `confirmationAutomationEnabled`) — defesa, não caminho esperado.
        console.log(
          `[worker] ${SEND_CONFIRMATION_QUEUE}: barbearia=${candidate.barbershopId} sem whatsappPhoneNumberId — pulando`,
        );
        skipped += 1;
        continue;
      }

      const timezone = barbershop.timezone;
      const diaDDMM = toDDMM(instantToZonedDateISO(fresh.startsAt, timezone));
      const horaHHMM = instantToZonedTimeHHMM(fresh.startsAt, timezone);
      const clientFirstName = (candidate.clientName ?? "").trim().split(/\s+/)[0] || "tudo bem";

      const conversation = await findOrCreateConversation(
        candidate.barbershopId,
        barbershop.whatsappPhoneNumberId,
        candidate.clientPhone,
        candidate.clientId,
      );

      const sendResult = await provider.sendTemplate(
        {
          waPhoneNumberId: barbershop.whatsappPhoneNumberId,
          toPhone: candidate.clientPhone,
          templateName: TEMPLATE_NAME,
          languageCode: TEMPLATE_LANGUAGE,
          bodyParams: [clientFirstName, diaDDMM, horaHHMM],
        },
        { lastInboundAt: conversation.lastInboundAt, optedOutAt: conversation.optedOutAt },
      );

      if (!sendResult.ok) {
        console.log(
          `[worker] ${SEND_CONFIRMATION_QUEUE}: agendamento=${candidate.id} envio_recusado=${sendResult.reason}`,
        );
        failed += 1;
        continue;
      }

      await recordReminderSent(candidate.barbershopId, candidate.id, sendResult.wamid);
      await createMessage(candidate.barbershopId, {
        conversationId: conversation.id,
        wamid: sendResult.wamid,
        direction: "saida",
        type: "template",
        body: renderTemplateBodyForHistory(clientFirstName, diaDDMM, horaHHMM),
        occurredAt: new Date(),
      });

      sent += 1;
      console.log(
        `[worker] ${SEND_CONFIRMATION_QUEUE}: agendamento=${candidate.id} barbearia=${candidate.barbershopId} telefone=${maskPhone(candidate.clientPhone)} lembrete enviado`,
      );
    } catch (error) {
      // Decision 9 (design.md): falha num agendamento nunca interrompe os demais do lote.
      failed += 1;
      const errorType = error instanceof Error ? error.constructor.name : "erro_desconhecido";
      console.error(
        `[worker] ${SEND_CONFIRMATION_QUEUE}: agendamento=${candidate.id} erro=${errorType} — seguindo para o próximo`,
      );
    }
  }

  return { sent, skipped, failed };
}

export async function registerSendConfirmation(boss: PgBoss): Promise<void> {
  await boss.createQueue(SEND_CONFIRMATION_QUEUE);
  await boss.work(SEND_CONFIRMATION_QUEUE, async () => {
    const result = await runSendConfirmation();
    console.log(
      `[worker] ${SEND_CONFIRMATION_QUEUE}: enviados=${result.sent} pulados=${result.skipped} falhas=${result.failed}`,
    );
  });
  // Verifica a janela a cada hora — o próprio filtro de lead hours evita repetição útil.
  await boss.schedule(SEND_CONFIRMATION_QUEUE, "0 * * * *");
}
