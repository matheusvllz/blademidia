/**
 * Isolamento entre tenants para `ai_usage_events` (Fase 5.2, `add-atendimento-ia`) — DoD do
 * ADR-0007. Precisa de Postgres real (`DATABASE_URL`); pulado sem banco, como os demais.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createBarbershop } from "./barbershops";
import { findOrCreateConversation } from "./whatsapp-conversations";
import { listUsageForBarbershop, listUsageForConversation, recordUsage } from "./ai-usage";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("isolamento entre barbearias (ai_usage_events)", () => {
  let a: { id: string };
  let b: { id: string };

  beforeAll(async () => {
    a = await createBarbershop(`ai-usage-a-${randomUUID()}`, "IA Usage A");
    b = await createBarbershop(`ai-usage-b-${randomUUID()}`, "IA Usage B");
  });

  it("uso registrado para a barbearia A não aparece na listagem da B", async () => {
    const convA = await findOrCreateConversation(a.id, "num-a", "+5511966660000", null);
    await recordUsage(a.id, {
      conversationId: convA.id,
      model: "claude-haiku-4-5",
      inputTokens: 500,
      outputTokens: 80,
    });

    const listA = await listUsageForBarbershop(a.id);
    const listB = await listUsageForBarbershop(b.id);

    expect(listA.some((e) => e.conversationId === convA.id)).toBe(true);
    expect(listB.some((e) => e.conversationId === convA.id)).toBe(false);
  });

  it("consulta por conversa com o barbershopId errado não retorna nada, mesmo com o conversationId certo", async () => {
    const convA = await findOrCreateConversation(a.id, "num-a", "+5511977770000", null);
    await recordUsage(a.id, {
      conversationId: convA.id,
      model: "claude-haiku-4-5",
      inputTokens: 300,
      outputTokens: 50,
      cacheReadTokens: 10,
      cacheCreationTokens: 0,
    });

    const crossTenant = await listUsageForConversation(b.id, convA.id);
    expect(crossTenant).toHaveLength(0);

    const sameTenant = await listUsageForConversation(a.id, convA.id);
    expect(sameTenant).toHaveLength(1);
    expect(sameTenant[0]?.cacheReadTokens).toBe(10);
  });
});
