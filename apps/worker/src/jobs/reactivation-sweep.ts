import {
  createMessage,
  findOrCreateConversation,
  getBarbershop,
  listBarbershops,
  listClientsNeedingReactivation,
  recordReactivationSent,
} from "@blademidia/db";
import { maskPhone, resolveWhatsAppProvider, type WhatsAppProvider } from "@blademidia/whatsapp";
import type PgBoss from "pg-boss";

/**
 * Job REAL desde a Fase 5.4 (`add-reativacao-clientes`, design.md § "Visão geral" e Decisions
 * 3/4/8/9). Antes disso (Fase 2), era um esqueleto honesto que só logava a contagem — agora
 * envia de fato, através de `WhatsAppProvider.sendTemplate` (mesma interface já usada por
 * `add-confirmacao-agendamento`, categoria de template diferente: *marketing*).
 *
 * `listClientsNeedingReactivation` já aplica, por barbearia: gate `reactivationAutomationEnabled`,
 * regra de "novo ciclo de inatividade" (nunca reenvia em loop para quem não voltou a visitar),
 * exclusão de cliente sem visita/telefone, e o limite diário (`reactivationDailyCap`) —
 * este job só itera e envia, sem reimplementar nenhuma dessas regras.
 *
 * Nunca loga corpo de mensagem ou telefone completo — só identificadores técnicos e telefone
 * mascarado.
 */
export const REACTIVATION_SWEEP_QUEUE = "crm.reactivation-sweep";

/** Nome e idioma do template — precisam bater exatamente com o que foi aprovado pela Meta
 * (design.md, rascunho de copy). Categoria MARKETING, diferente do template de confirmação. */
const TEMPLATE_NAME = "reativacao_cliente";
const TEMPLATE_LANGUAGE = "pt_BR";

/** Reconstrução local do texto renderizado, só para exibição no histórico de `/conversas` —
 * o envio real usa `templateName`/`bodyParams` (a Meta é quem renderiza de fato). */
function renderTemplateBodyForHistory(clientFirstName: string): string {
  return `oi ${clientFirstName}! faz um tempo que você não aparece por aqui. bora marcar um horário? é só responder aqui que eu já te mostro os dias livres 💈 (se não quiser mais receber mensagem, responde PARE)`;
}

export interface ReactivationSweepResult {
  sent: number;
  failed: number;
}

/**
 * `provider` é injetável (default: `resolveWhatsAppProvider(process.env)`) — usado pelos testes
 * ponta a ponta para passar o adapter dry-run real diretamente, sem precisar mockar o módulo
 * `@blademidia/whatsapp` (achado: dois arquivos de teste mockando o mesmo módulo com fábricas
 * diferentes, mesmo isolados por arquivo, é uma fonte de fragilidade desnecessária quando dá
 * pra evitar com injeção direta).
 */
export async function runReactivationSweep(
  now: Date = new Date(),
  provider: WhatsAppProvider = resolveWhatsAppProvider(process.env),
): Promise<ReactivationSweepResult> {
  const shops = await listBarbershops();

  let sent = 0;
  let failed = 0;

  for (const shop of shops) {
    let barbershop: Awaited<ReturnType<typeof getBarbershop>>;
    let candidates: Awaited<ReturnType<typeof listClientsNeedingReactivation>>;
    try {
      barbershop = await getBarbershop(shop.id);
      if (!barbershop?.whatsappPhoneNumberId) continue; // sem canal configurado — nada a fazer
      candidates = await listClientsNeedingReactivation(shop.id, now);
    } catch (error) {
      // Falha ao resolver/selecionar UMA barbearia nunca deve abortar a varredura das demais
      // (mesmo princípio de isolamento de falha da Decision 9, aplicado também aqui, não só
      // por cliente — achado durante os testes: sem isto, um erro transitório numa barbearia
      // no meio da lista impediria até as barbearias seguintes de serem processadas).
      const errorType = error instanceof Error ? error.constructor.name : "erro_desconhecido";
      console.error(
        `[worker] ${REACTIVATION_SWEEP_QUEUE}: barbearia=${shop.id} erro_selecao=${errorType} — seguindo para a próxima barbearia`,
      );
      continue;
    }

    for (const candidate of candidates) {
      try {
        const clientFirstName = (candidate.name ?? "").trim().split(/\s+/)[0] || "tudo bem";

        const conversation = await findOrCreateConversation(
          shop.id,
          barbershop.whatsappPhoneNumberId,
          candidate.phone,
          candidate.id,
        );

        const sendResult = await provider.sendTemplate(
          {
            waPhoneNumberId: barbershop.whatsappPhoneNumberId,
            toPhone: candidate.phone,
            templateName: TEMPLATE_NAME,
            languageCode: TEMPLATE_LANGUAGE,
            bodyParams: [clientFirstName],
          },
          { lastInboundAt: conversation.lastInboundAt, optedOutAt: conversation.optedOutAt },
        );

        if (!sendResult.ok) {
          console.log(
            `[worker] ${REACTIVATION_SWEEP_QUEUE}: cliente=${candidate.id} envio_recusado=${sendResult.reason}`,
          );
          failed += 1;
          continue;
        }

        await recordReactivationSent(shop.id, candidate.id, sendResult.wamid, candidate.lastVisitAt);
        await createMessage(shop.id, {
          conversationId: conversation.id,
          wamid: sendResult.wamid,
          direction: "saida",
          type: "template",
          body: renderTemplateBodyForHistory(clientFirstName),
          occurredAt: new Date(),
        });

        sent += 1;
        console.log(
          `[worker] ${REACTIVATION_SWEEP_QUEUE}: cliente=${candidate.id} barbearia=${shop.id} telefone=${maskPhone(candidate.phone)} reativação enviada`,
        );
      } catch (error) {
        // Falha num cliente nunca interrompe os demais do lote (mesmo padrão de send-confirmation).
        failed += 1;
        const errorType = error instanceof Error ? error.constructor.name : "erro_desconhecido";
        console.error(
          `[worker] ${REACTIVATION_SWEEP_QUEUE}: cliente=${candidate.id} erro=${errorType} — seguindo para o próximo`,
        );
      }
    }
  }

  return { sent, failed };
}

export async function registerReactivationSweep(boss: PgBoss): Promise<void> {
  await boss.createQueue(REACTIVATION_SWEEP_QUEUE);
  await boss.work(REACTIVATION_SWEEP_QUEUE, async () => {
    const result = await runReactivationSweep();
    console.log(`[worker] ${REACTIVATION_SWEEP_QUEUE}: enviados=${result.sent} falhas=${result.failed}`);
  });
  // Uma vez por dia — reativação não é urgente como no-show/confirmação.
  await boss.schedule(REACTIVATION_SWEEP_QUEUE, "0 8 * * *");
}
