import { integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

/**
 * Regras da agenda por barbearia (Fase 2), 1:1 com a barbearia como
 * `crm_settings`. Valores padrão cobrem a barbearia que nunca configurou
 * (cenário da spec). `confirmationLeadHours` é consumido em fase futura
 * (esqueleto de confirmação no worker) — armazenado desde já.
 */
export const DEFAULT_SLOT_STEP_MIN = 30;
export const DEFAULT_MIN_ADVANCE_MIN = 0;
export const DEFAULT_NO_SHOW_AFTER_MIN = 30;
export const DEFAULT_CONFIRMATION_LEAD_HOURS = 24;

export const agendaSettings = pgTable("agenda_settings", {
  barbershopId: uuid("barbershop_id")
    .primaryKey()
    .references(() => barbershops.id),
  slotStepMin: integer("slot_step_min").notNull().default(DEFAULT_SLOT_STEP_MIN),
  minAdvanceMin: integer("min_advance_min").notNull().default(DEFAULT_MIN_ADVANCE_MIN),
  noShowAfterMin: integer("no_show_after_min").notNull().default(DEFAULT_NO_SHOW_AFTER_MIN),
  confirmationLeadHours: integer("confirmation_lead_hours")
    .notNull()
    .default(DEFAULT_CONFIRMATION_LEAD_HOURS),
});
