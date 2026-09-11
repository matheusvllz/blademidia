import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";
import { clients } from "./clients";

/**
 * Log de envio de reativação (Fase 5.4, `add-reativacao-clientes`, design.md Decision 2).
 * Diferente de `confirmation_reminders` (único para sempre por agendamento), esta tabela é
 * APPEND-ONLY sem unicidade por cliente: o mesmo cliente pode legitimamente receber mais de
 * um envio ao longo do tempo, um por ciclo de inatividade.
 *
 * `clientLastVisitAt` guarda o valor de `lastVisitAt` do cliente NO MOMENTO do envio — é a
 * peça central da regra de "novo ciclo": um cliente só volta a ser elegível quando seu
 * `lastVisitAt` atual for mais recente que o snapshot aqui guardado (design.md Decision 3).
 *
 * Sem conteúdo de mensagem nem telefone — só identificadores técnicos (mesma regra de
 * `confirmation_reminders`).
 */
export const reactivationSends = pgTable("reactivation_sends", {
  id: uuid("id").defaultRandom().primaryKey(),
  barbershopId: uuid("barbershop_id")
    .notNull()
    .references(() => barbershops.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  wamid: text("wamid").notNull(),
  clientLastVisitAt: timestamp("client_last_visit_at", { withTimezone: true }),
});
