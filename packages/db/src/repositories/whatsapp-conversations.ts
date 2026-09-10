import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { whatsappConversations, type whatsappHandoverEnum } from "../schema/whatsapp-conversations";

/**
 * Regra de ouro (ADR-0007): toda função exportada aqui exige `barbershopId` explícito como
 * primeiro argumento.
 */

export type WhatsappConversationRecord = typeof whatsappConversations.$inferSelect;
export type WhatsappHandover = (typeof whatsappHandoverEnum.enumValues)[number];

export async function getConversation(
  barbershopId: string,
  conversationId: string,
): Promise<WhatsappConversationRecord | null> {
  const rows = await db
    .select()
    .from(whatsappConversations)
    .where(
      and(
        eq(whatsappConversations.barbershopId, barbershopId),
        eq(whatsappConversations.id, conversationId),
      ),
    );
  return rows[0] ?? null;
}

export async function listConversations(
  barbershopId: string,
): Promise<WhatsappConversationRecord[]> {
  return db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.barbershopId, barbershopId));
}

async function findConversationByPhone(
  barbershopId: string,
  phone: string,
): Promise<WhatsappConversationRecord | null> {
  const rows = await db
    .select()
    .from(whatsappConversations)
    .where(
      and(eq(whatsappConversations.barbershopId, barbershopId), eq(whatsappConversations.phone, phone)),
    );
  return rows[0] ?? null;
}

/**
 * Uma conversa por (barbershop, telefone normalizado). `phone` chega já normalizado (E.164)
 * pelo normalizador do adapter — não é papel deste repositório resolver ambiguidade de nono
 * dígito (isso é o casamento com `clients`, feito separadamente).
 */
export async function findOrCreateConversation(
  barbershopId: string,
  waPhoneNumberId: string,
  phone: string,
  clientId: string | null,
): Promise<WhatsappConversationRecord> {
  const existing = await findConversationByPhone(barbershopId, phone);
  if (existing) return existing;

  const [created] = await db
    .insert(whatsappConversations)
    .values({ barbershopId, waPhoneNumberId, phone, clientId })
    .returning();

  if (!created) {
    throw new Error("Falha inesperada ao criar conversa de WhatsApp");
  }
  return created;
}

export async function linkClientToConversation(
  barbershopId: string,
  conversationId: string,
  clientId: string,
): Promise<WhatsappConversationRecord | null> {
  const [updated] = await db
    .update(whatsappConversations)
    .set({ clientId })
    .where(
      and(
        eq(whatsappConversations.barbershopId, barbershopId),
        eq(whatsappConversations.id, conversationId),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function updateLastInboundAt(
  barbershopId: string,
  conversationId: string,
  when: Date,
): Promise<void> {
  await db
    .update(whatsappConversations)
    .set({ lastInboundAt: when })
    .where(
      and(
        eq(whatsappConversations.barbershopId, barbershopId),
        eq(whatsappConversations.id, conversationId),
      ),
    );
}

export async function markHandover(
  barbershopId: string,
  conversationId: string,
  handover: WhatsappHandover,
): Promise<void> {
  await db
    .update(whatsappConversations)
    .set({ handover })
    .where(
      and(
        eq(whatsappConversations.barbershopId, barbershopId),
        eq(whatsappConversations.id, conversationId),
      ),
    );
}

export async function markOptOut(barbershopId: string, conversationId: string): Promise<void> {
  await db
    .update(whatsappConversations)
    .set({ optedOutAt: new Date() })
    .where(
      and(
        eq(whatsappConversations.barbershopId, barbershopId),
        eq(whatsappConversations.id, conversationId),
      ),
    );
}

// A anonimização de conversas na exclusão LGPD de cliente vive em `clients.ts`
// (`deleteClient`), na MESMA transação da anonimização do cliente — não duplicada aqui.
// Ver design.md, Flow 3.
