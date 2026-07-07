import { integer, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";
import { clients } from "./clients";
import { visits } from "./visits";

/**
 * Registro do que já foi pago fora do sistema — nunca processa/intermedeia
 * pagamento (Decision 3 do design.md). Sem campos de gateway (token de cartão,
 * customer_id) de propósito: se o produto um dia processar pagamento de
 * verdade, é uma nova capability (`billing`), não uma extensão silenciosa
 * desta tabela.
 */
export const paymentMethodEnum = pgEnum("payment_method", ["dinheiro", "cartao", "pix", "outro"]);

export const paymentsLog = pgTable("payments_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  barbershopId: uuid("barbershop_id")
    .notNull()
    .references(() => barbershops.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  visitId: uuid("visit_id")
    .notNull()
    .references(() => visits.id),
  amountCents: integer("amount_cents").notNull(),
  method: paymentMethodEnum("method").notNull().default("outro"),
  paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
});
