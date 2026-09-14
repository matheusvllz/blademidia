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
    // Fase 5 (`add-whatsapp-canal`): identificador do número/canal no provedor (Meta Cloud
    // API ou BSP escolhido) — chave de roteamento do webhook único para a barbearia dona do
    // número. NULL até a barbearia ter o canal provisionado (ver design.md § Data Model).
    whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("barbershops_slug_idx").on(table.slug),
    uniqueIndex("barbershops_whatsapp_phone_number_id_idx").on(table.whatsappPhoneNumberId),
  ],
);
