import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";
import { whatsappConversations } from "./whatsapp-conversations";

/**
 * Mensagem de WhatsApp (Fase 5, `add-whatsapp-canal`). `wamid` é o id do provedor — único no
 * banco, garantindo a deduplicação de reentrega estrutural (design.md, Decision 3), mesmo
 * padrão do anti-double-booking da agenda (Fase 2): a garantia vive no banco, não em lógica de
 * aplicação. `body` fica NULL para tipos de mensagem sem texto (ex.: mídia não suportada
 * ainda nesta fase).
 */
export const whatsappMessageDirectionEnum = pgEnum("whatsapp_message_direction", [
  "entrada",
  "saida",
]);
export const whatsappMessageTypeEnum = pgEnum("whatsapp_message_type", [
  "texto",
  "template",
  "outro",
]);

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => whatsappConversations.id),
    wamid: text("wamid").notNull(),
    direction: whatsappMessageDirectionEnum("direction").notNull(),
    type: whatsappMessageTypeEnum("type").notNull(),
    body: text("body"),
    status: text("status"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("whatsapp_messages_wamid_idx").on(table.wamid),
    index("whatsapp_messages_conversation_idx").on(table.barbershopId, table.conversationId),
  ],
);
