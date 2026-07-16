import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

/**
 * Barbeiro como RECURSO da agenda (Fase 2, decisão Q1) — login é OPCIONAL
 * (Fase 4, `auth-tenancy`): o vínculo fica em `crm_users.barber_id` (não aqui),
 * porque a resolução de sessão precisa do `barberId` na mesma linha lida no
 * login (`verifyLogin`), sem uma segunda consulta. Esta tabela não muda.
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
