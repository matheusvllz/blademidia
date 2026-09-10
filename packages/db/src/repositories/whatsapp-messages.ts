import { and, asc, eq } from "drizzle-orm";
import { db } from "../client";
import { whatsappMessages } from "../schema/whatsapp-messages";

/**
 * Regra de ouro (ADR-0007): toda função exportada aqui exige `barbershopId` explícito.
 * Deduplicação de `wamid` (design.md, Decision 3): captura o erro de violação de unicidade do
 * Postgres, mesmo padrão de `isExclusionViolation` em `appointments.ts` para o anti-double-
 * booking — a garantia vive no banco, não numa checagem prévia sujeita a corrida.
 */

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}

export type WhatsappMessageRecord = typeof whatsappMessages.$inferSelect;

export interface CreateMessageInput {
  conversationId: string;
  wamid: string;
  direction: "entrada" | "saida";
  type: "texto" | "template" | "outro";
  body: string | null;
  status?: string | null;
  occurredAt: Date;
}

export type CreateMessageResult =
  | { alreadyProcessed: false; message: WhatsappMessageRecord }
  | { alreadyProcessed: true; message: null };

export async function createMessage(
  barbershopId: string,
  input: CreateMessageInput,
): Promise<CreateMessageResult> {
  try {
    const [created] = await db
      .insert(whatsappMessages)
      .values({
        barbershopId,
        conversationId: input.conversationId,
        wamid: input.wamid,
        direction: input.direction,
        type: input.type,
        body: input.body,
        status: input.status ?? null,
        occurredAt: input.occurredAt,
      })
      .returning();

    if (!created) {
      throw new Error("Falha inesperada ao registrar mensagem de WhatsApp");
    }
    return { alreadyProcessed: false, message: created };
  } catch (error) {
    if (isUniqueViolation(error)) return { alreadyProcessed: true, message: null };
    throw error;
  }
}

export async function listMessages(
  barbershopId: string,
  conversationId: string,
): Promise<WhatsappMessageRecord[]> {
  return db
    .select()
    .from(whatsappMessages)
    .where(
      and(eq(whatsappMessages.barbershopId, barbershopId), eq(whatsappMessages.conversationId, conversationId)),
    )
    .orderBy(asc(whatsappMessages.occurredAt));
}
