import { boolean, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

export const DEFAULT_INACTIVITY_DAYS_THRESHOLD = 21;

/**
 * Fase 5.4 (`add-reativacao-clientes`): gate + throttling por barbearia para o envio
 * automático de reativação. `reactivationAutomationEnabled` segue o mesmo padrão de
 * `agenda_settings.confirmationAutomationEnabled` — ligado manualmente pelo Matheus só depois
 * do template de marketing aprovado pela Meta. `reactivationDailyCap` limita quantos envios
 * saem por execução do job (o plano de execução exige throttling explícito — "não despejar a
 * lista inteira de uma vez").
 */
export const DEFAULT_REACTIVATION_AUTOMATION_ENABLED = false;
export const DEFAULT_REACTIVATION_DAILY_CAP = 5;

export const crmSettings = pgTable("crm_settings", {
  barbershopId: uuid("barbershop_id")
    .primaryKey()
    .references(() => barbershops.id),
  inactivityDaysThreshold: integer("inactivity_days_threshold")
    .notNull()
    .default(DEFAULT_INACTIVITY_DAYS_THRESHOLD),
  reactivationAutomationEnabled: boolean("reactivation_automation_enabled")
    .notNull()
    .default(DEFAULT_REACTIVATION_AUTOMATION_ENABLED),
  reactivationDailyCap: integer("reactivation_daily_cap")
    .notNull()
    .default(DEFAULT_REACTIVATION_DAILY_CAP),
});
