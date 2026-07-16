import { boolean, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { barbers } from "./barbers";
import { barbershops } from "./barbershops";

/**
 * Auth do produto. Fase 1: um usuário por barbearia, papel único implícito
 * "dono". Fase 4 (`auth-tenancy`, ADR ainda não numerado — ver design.md de
 * `add-fidelizacao-e-funcionarios`): papel explícito + funcionário vinculado a
 * um `barbers` (login opcional do recurso da agenda). `barberId` é obrigatório
 * na APLICAÇÃO quando `role='funcionario'` e sempre `NULL` quando `role='dono'`
 * — validado no repositório (`createEmployeeLogin`), não via CHECK constraint,
 * mesmo padrão de validação de campo obrigatório já usado em `services`/
 * `barbers`. `active`: desativar um login preserva o histórico/agendamentos do
 * barbeiro vinculado, só impede novas sessões (`verifyLogin`).
 */
export const appUserRoleEnum = pgEnum("app_user_role", ["dono", "funcionario"]);

export const crmUsers = pgTable(
  "crm_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    emailOrPhone: text("email_or_phone").notNull(),
    authSecretHash: text("auth_secret_hash").notNull(),
    role: appUserRoleEnum("role").notNull().default("dono"),
    barberId: uuid("barber_id").references(() => barbers.id),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("crm_users_login_idx").on(table.emailOrPhone),
    uniqueIndex("crm_users_barber_id_idx")
      .on(table.barberId)
      .where(sql`${table.barberId} is not null`),
  ],
);
