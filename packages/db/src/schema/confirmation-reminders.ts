import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { appointments } from "./appointments";
import { barbershops } from "./barbershops";

/**
 * Registro de envio do lembrete de confirmação (Fase 5.3, `add-confirmacao-agendamento`,
 * design.md Decision 2). Um por agendamento, para sempre — é a garantia de banco do requisito
 * "envio único": `UNIQUE (appointment_id)` faz uma segunda tentativa de registro para o mesmo
 * agendamento falhar por violação de unicidade, mesmo sob concorrência (o repositório trata
 * isso como no-op, não como erro).
 *
 * Vive em tabela própria, não como coluna em `appointments`, para manter `agendamento` sem
 * conhecimento de canal de mensageria — mesmo princípio de separação que `whatsapp-canal` e
 * `atendimento-ia` já seguem (dado de canal em tabela de canal).
 *
 * Sem conteúdo de mensagem nem telefone — só identificadores técnicos (regra de log/dado
 * sensível do repositório, aplicada aqui também ao dado persistido, não só a log).
 */
export const confirmationReminders = pgTable(
  "confirmation_reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
    wamid: text("wamid").notNull(),
  },
  (table) => [uniqueIndex("confirmation_reminders_appointment_idx").on(table.appointmentId)],
);
