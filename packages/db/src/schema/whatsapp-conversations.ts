import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { barbershops } from "./barbershops";
import { clients } from "./clients";

/**
 * Conversa de WhatsApp (Fase 5, `add-whatsapp-canal`). Uma por (barbershop, telefone).
 *
 * `clientId` é NULLABLE de propósito (design.md): quem manda mensagem pode não estar
 * cadastrado no CRM — a conversa existe mesmo assim.
 *
 * `phone` vira NULL na exclusão LGPD do cliente associado — mesmo padrão de `clients.phone`
 * (ver `clients.ts`): o índice único composto (barbershop_id, phone) permite vários registros
 * com `phone` NULL sem colidir (comportamento padrão do Postgres para UNIQUE + NULL).
 *
 * `handover`: quem responde agora — `bot` (produto) ou `humano` (barbeiro, seja pelo painel
 * futuro ou pelo próprio WhatsApp Business App sob coexistência). Ver design.md Decision 5.
 */
export const whatsappHandoverEnum = pgEnum("whatsapp_handover", ["bot", "humano"]);

export const whatsappConversations = pgTable(
  "whatsapp_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    clientId: uuid("client_id").references(() => clients.id),
    phone: text("phone"),
    waPhoneNumberId: text("wa_phone_number_id").notNull(),
    lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }),
    handover: whatsappHandoverEnum("handover").notNull().default("bot"),
    optedOutAt: timestamp("opted_out_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("whatsapp_conversations_barbershop_phone_idx").on(table.barbershopId, table.phone),
  ],
);
