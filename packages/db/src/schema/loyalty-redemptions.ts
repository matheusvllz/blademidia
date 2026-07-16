import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";
import { clients } from "./clients";
import { visits } from "./visits";

/**
 * Evento de resgate de fidelização (Fase 4, Decision 6 do design.md de
 * `add-fidelizacao-e-funcionarios`). A contagem é calculada ON-THE-FLY a
 * partir de `visits` posteriores ao resgate mais recente (ou a
 * `clients.loyalty_baseline_at`, se nunca resgatado) — esta tabela é só o
 * registro do EVENTO, nunca um contador mutável, para não divergir dos dois
 * pontos que criam `visits` (`registerVisit` e `completeAppointmentWithVisit`).
 */
export const loyaltyRedemptions = pgTable(
  "loyalty_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
    visitId: uuid("visit_id").references(() => visits.id),
  },
  (table) => [
    index("loyalty_redemptions_client_idx").on(table.barbershopId, table.clientId, table.redeemedAt),
  ],
);
