import { integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

export const DEFAULT_INACTIVITY_DAYS_THRESHOLD = 21;

export const crmSettings = pgTable("crm_settings", {
  barbershopId: uuid("barbershop_id")
    .primaryKey()
    .references(() => barbershops.id),
  inactivityDaysThreshold: integer("inactivity_days_threshold")
    .notNull()
    .default(DEFAULT_INACTIVITY_DAYS_THRESHOLD),
});
