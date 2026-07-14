import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

/**
 * Catálogo de serviços da barbearia (Fase 2). `priceCents` é o preço de TABELA
 * (referência ao agendar/exibir) — NÃO é o valor pago: o que o cliente pagou de
 * fato continua em `payments_log.amount_cents` por visita (podem divergir:
 * desconto, gorjeta). Decision 3 do design.md.
 */
export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  barbershopId: uuid("barbershop_id")
    .notNull()
    .references(() => barbershops.id),
  name: text("name").notNull(),
  durationMin: integer("duration_min").notNull(),
  priceCents: integer("price_cents"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
