import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { aiUsageEvents } from "../schema/ai-usage-events";

/**
 * Regra de ouro (ADR-0007): toda função exportada aqui exige `barbershopId` explícito.
 * Custo de IA por tenant desde a v1 (ADR-0005; design.md da change `add-atendimento-ia`,
 * Decision 5) — sem conteúdo de mensagem, só contagem de tokens.
 */

export type AiUsageEventRecord = typeof aiUsageEvents.$inferSelect;

export interface RecordUsageInput {
  conversationId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export async function recordUsage(
  barbershopId: string,
  input: RecordUsageInput,
): Promise<AiUsageEventRecord> {
  const [created] = await db
    .insert(aiUsageEvents)
    .values({
      barbershopId,
      conversationId: input.conversationId,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cacheReadTokens: input.cacheReadTokens ?? 0,
      cacheCreationTokens: input.cacheCreationTokens ?? 0,
    })
    .returning();

  if (!created) {
    throw new Error("Falha inesperada ao registrar uso de IA");
  }
  return created;
}

export async function listUsageForBarbershop(barbershopId: string): Promise<AiUsageEventRecord[]> {
  return db
    .select()
    .from(aiUsageEvents)
    .where(eq(aiUsageEvents.barbershopId, barbershopId))
    .orderBy(desc(aiUsageEvents.createdAt));
}

export async function listUsageForConversation(
  barbershopId: string,
  conversationId: string,
): Promise<AiUsageEventRecord[]> {
  return db
    .select()
    .from(aiUsageEvents)
    .where(and(eq(aiUsageEvents.barbershopId, barbershopId), eq(aiUsageEvents.conversationId, conversationId)))
    .orderBy(desc(aiUsageEvents.createdAt));
}
