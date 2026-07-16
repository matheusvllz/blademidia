import { integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

/**
 * Regra de fidelização por barbearia (Fase 4), 1:1 com a barbearia como
 * `agenda_settings`/`crm_settings`. Contagem simples (não pontos) — ver
 * exploration.md da change `add-fidelizacao-e-funcionarios`.
 */
export const DEFAULT_LOYALTY_THRESHOLD_VISITS = 6;

export const loyaltySettings = pgTable("loyalty_settings", {
  barbershopId: uuid("barbershop_id")
    .primaryKey()
    .references(() => barbershops.id),
  thresholdVisits: integer("threshold_visits").notNull().default(DEFAULT_LOYALTY_THRESHOLD_VISITS),
});
