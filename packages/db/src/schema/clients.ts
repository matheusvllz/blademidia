import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

/**
 * `phone` vira NULL na exclusão LGPD (anonimização) — por isso o índice único
 * (barbershop_id, phone) pode ter vários registros com phone NULL sem colidir
 * (comportamento padrão do Postgres para UNIQUE + NULL).
 *
 * `loyaltyBaselineAt` (Fase 4): a partir de quando as visitas do cliente
 * contam para a fidelização. `DEFAULT now()` resolve "começa do zero" sem
 * backfill manual — o Postgres aplica esse `now()` (avaliado uma vez, no
 * momento do `ALTER TABLE`) a todos os clientes já existentes; clientes novos
 * recebem o próprio instante de criação.
 */
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    name: text("name"),
    phone: text("phone"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    loyaltyBaselineAt: timestamp("loyalty_baseline_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("clients_barbershop_phone_idx").on(table.barbershopId, table.phone)],
);
