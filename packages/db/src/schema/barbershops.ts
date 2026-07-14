import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Tenant do produto. Não confundir com o registro de barbearia do
 * `automation/lib/store.mjs` (tooling operacional da agência, JSON local) — são
 * sistemas diferentes; `slug` é o campo de correspondência usado na migração
 * (ver `scripts/migrate-automation-data.ts`).
 */
export const barbershops = pgTable(
  "barbershops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // Fuso da barbearia usado no cálculo/exibição de horários da agenda (Fase 2).
    // Padrão Brasília/DF; coluna já nasce para permitir multi-praça no futuro.
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("barbershops_slug_idx").on(table.slug)],
);
