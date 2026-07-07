import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

/**
 * `phone` vira NULL na exclusão LGPD (anonimização) — por isso o índice único
 * (barbershop_id, phone) pode ter vários registros com phone NULL sem colidir
 * (comportamento padrão do Postgres para UNIQUE + NULL).
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
  },
  (table) => [uniqueIndex("clients_barbershop_phone_idx").on(table.barbershopId, table.phone)],
);
