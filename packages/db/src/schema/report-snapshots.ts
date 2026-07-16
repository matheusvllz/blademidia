import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";

/**
 * Snapshot mensal de indicadores operacionais por barbearia (Fase 3, Decision 4
 * do design.md de `add-relatorios`). Materializado pelo job `relatorios.monthly-
 * snapshot` do worker ao fechar cada mês — mesma agregação que a tela consulta
 * sob demanda (`aggregateReport`), só que persistida.
 *
 * As quatro colunas finais são RESERVADAS para a Fase 5 (mensageria/IA) e
 * nascem sempre NULL nesta change — nenhuma leitura da Fase 3 as consome (ver
 * ADR-0010 e o Non-Goal "não exibir como zero enganoso" do proposal).
 */
export const reportSnapshots = pgTable(
  "report_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1–12

    revenueCents: integer("revenue_cents").notNull().default(0),
    visitsCount: integer("visits_count").notNull().default(0),
    avgTicketCents: integer("avg_ticket_cents"),
    newClientsCount: integer("new_clients_count").notNull().default(0),
    servedClientsCount: integer("served_clients_count").notNull().default(0),

    occupiedCount: integer("occupied_count").notNull().default(0),
    capacityCount: integer("capacity_count").notNull().default(0),
    noShowCount: integer("no_show_count").notNull().default(0),
    canceledCount: integer("canceled_count").notNull().default(0),

    topServices: jsonb("top_services").notNull().default([]),
    topBarbers: jsonb("top_barbers").notNull().default([]),

    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),

    // Reservado para a Fase 5 — sempre NULL nesta change (Decision 4).
    reactivatedCount: integer("reactivated_count"),
    noShowPreventedCount: integer("no_show_prevented_count"),
    botMessagesCount: integer("bot_messages_count"),
    recoveredRevenueCents: integer("recovered_revenue_cents"),
  },
  (table) => [
    uniqueIndex("report_snapshots_shop_year_month_idx").on(
      table.barbershopId,
      table.year,
      table.month,
    ),
    index("report_snapshots_shop_idx").on(table.barbershopId),
  ],
);
