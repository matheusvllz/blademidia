import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";
import { clients } from "./clients";

/**
 * `serviceLabel`/`staffLabel` são texto livre nesta fase (sem catálogo) — a
 * capability `agendamento` (Fase 2) introduz entidades próprias de serviço e
 * barbeiro; esta tabela ganha as FKs correspondentes quando ela existir.
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
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
