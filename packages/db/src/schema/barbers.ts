import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

/**
 * Barbeiro como RECURSO da agenda (Fase 2, decisão Q1) — não é usuário do
 * sistema, não tem login. Quando `auth-tenancy` introduzir papel de funcionário
 * (Fase 4), o vínculo com um `crm_users` entra aqui, sem reescrever a tabela.
 * `deletedAt`/`active`: desativar preserva agendamentos futuros já existentes.
 */
export const barbers = pgTable("barbers", {
  id: uuid("id").defaultRandom().primaryKey(),
  barbershopId: uuid("barbershop_id")
    .notNull()
    .references(() => barbershops.id),
  name: text("name").notNull(),
  color: text("color"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
