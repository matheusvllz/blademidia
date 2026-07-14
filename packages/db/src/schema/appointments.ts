import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbers } from "./barbers";
import { barbershops } from "./barbershops";
import { clients } from "./clients";
import { services } from "./services";
import { visits } from "./visits";

/**
 * Agendamento (Fase 2). `endsAt` é derivado da duração do serviço mas
 * persistido para checagem de sobreposição e consulta de agenda.
 *
 * Ausência de double booking é garantida no BANCO por uma restrição de exclusão
 * (btree_gist + tstzrange sobre estados ativos), criada por SQL bruto na
 * migração — Drizzle não modela EXCLUDE. Ver Decision 5 do design.md.
 *
 * `visitId`: preenchido na conclusão (transação) — vínculo com o atendimento do
 * CRM; sua presença torna a conclusão idempotente (não cria segunda visita).
 * `source`: origem do agendamento — `bot` deixa a fronteira pronta para a IA
 * (Fase 5) sem caminho de escrita paralelo.
 */
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "agendado",
  "confirmado",
  "concluido",
  "cancelado",
  "faltou",
]);

export const appointmentSourceEnum = pgEnum("appointment_source", ["painel", "bot", "importacao"]);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatusEnum("status").notNull().default("agendado"),
    source: appointmentSourceEnum("source").notNull().default("painel"),
    notes: text("notes"),
    visitId: uuid("visit_id").references(() => visits.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
  },
  (table) => [
    index("appointments_barber_starts_idx").on(table.barbershopId, table.barberId, table.startsAt),
    index("appointments_client_idx").on(table.barbershopId, table.clientId),
    index("appointments_status_starts_idx").on(table.barbershopId, table.status, table.startsAt),
  ],
);
