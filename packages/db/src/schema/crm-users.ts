import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

/**
 * Auth mínima da Fase 1 (design.md, Decision 2): um usuário por barbearia,
 * papel único implícito "dono". Quando `auth-tenancy` for especificada de
 * verdade (múltiplos papéis, funcionário), esta tabela ganha coluna de papel
 * — não é reescrita.
 */
export const crmUsers = pgTable(
  "crm_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    emailOrPhone: text("email_or_phone").notNull(),
    authSecretHash: text("auth_secret_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("crm_users_login_idx").on(table.emailOrPhone)],
);
