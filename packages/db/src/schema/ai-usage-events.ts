import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";
import { whatsappConversations } from "./whatsapp-conversations";

/**
 * Consumo de tokens por turno de conversa da IA (Fase 5.2, `add-atendimento-ia`, design.md
 * Decision 5). ADR-0005 exige custo monitorado por tenant desde a v1 — esta tabela é a fonte
 * desse dado; não guarda conteúdo de mensagem nem "raciocínio" do modelo (Decision 4), só
 * contagem de tokens, sem custo em dinheiro calculado aqui (preço muda por modelo/tempo — o
 * relatório mensal, se um dia consumir isto, calcula na hora com o preço vigente).
 */
export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => whatsappConversations.id),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheCreationTokens: integer("cache_creation_tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("ai_usage_events_barbershop_idx").on(table.barbershopId, table.createdAt)],
);
