import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbers } from "./barbers";
import { barbershops } from "./barbershops";
import { clients } from "./clients";
import { services } from "./services";

/**
 * `serviceLabel`/`staffLabel` são o texto livre da Fase 1 (compatibilidade —
 * atendimentos antigos continuam válidos). A Fase 2 adiciona as FKs de catálogo
 * (`serviceId`/`staffId`), nullable: atendimentos vindos de um agendamento
 * concluído referenciam o catálogo; o retrofit do histórico legado NÃO é
 * forçado (delta de `crm-clientes`).
 */
export const visits = pgTable("visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  barbershopId: uuid("barbershop_id")
    .notNull()
    .references(() => barbershops.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  serviceLabel: text("service_label").notNull(),
  staffLabel: text("staff_label"),
  serviceId: uuid("service_id").references(() => services.id),
  staffId: uuid("staff_id").references(() => barbers.id),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
