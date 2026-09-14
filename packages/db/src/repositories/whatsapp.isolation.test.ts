/**
 * Isolamento entre tenants para as tabelas de WhatsApp (Fase 5) — DoD do ADR-0007.
 * Precisa de Postgres real (`DATABASE_URL`); pulado sem banco, como os demais.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createBarbershop } from "./barbershops";
import { createClient, deleteClient } from "./clients";
import { findOrCreateConversation, getConversation, listConversations } from "./whatsapp-conversations";
import { createMessage, listMessages } from "./whatsapp-messages";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("isolamento entre barbearias (whatsapp)", () => {
  let a: { id: string };
  let b: { id: string };

  beforeAll(async () => {
    a = await createBarbershop(`wa-a-${randomUUID()}`, "WhatsApp A");
    b = await createBarbershop(`wa-b-${randomUUID()}`, "WhatsApp B");
  });

  it("conversa da barbearia A não aparece nem é buscável pela B", async () => {
    const conv = await findOrCreateConversation(a.id, "num-a", "+5511911110000", null);
    const listB = await listConversations(b.id);
    expect(listB.find((c) => c.id === conv.id)).toBeUndefined();
    expect(await getConversation(b.id, conv.id)).toBeNull();
  });

  it("mensagem da barbearia A não aparece na listagem da B pela conversa de A", async () => {
    const convA = await findOrCreateConversation(a.id, "num-a", "+5511922220000", null);
    await createMessage(a.id, {
      conversationId: convA.id,
      wamid: `wamid.${randomUUID()}`,
      direction: "entrada",
      type: "texto",
      body: "mensagem da barbearia A",
      occurredAt: new Date(),
    });
    // Mesma conversationId de A consultada com o barbershopId de B não deve retornar nada —
    // prova que a query de listMessages está de fato escopada, não só filtrando por FK.
    const listFromB = await listMessages(b.id, convA.id);
    expect(listFromB).toHaveLength(0);
  });

  it("telefones iguais em barbearias diferentes não colidem (índice único é por tenant)", async () => {
    const phone = "+5511933330000";
    const convA = await findOrCreateConversation(a.id, "num-a", phone, null);
    const convB = await findOrCreateConversation(b.id, "num-b", phone, null);
    expect(convA.id).not.toBe(convB.id);
  });

  it("excluir cliente (LGPD) da barbearia A anonimiza a conversa dele, preserva as mensagens e não afeta a B", async () => {
    const client = await createClient(a.id, { name: "Cliente A", phone: "+5511944440000" });
    if (!client.client) throw new Error("falha ao criar cliente de teste");
    const conv = await findOrCreateConversation(a.id, "num-a", "+5511944440000", client.client.id);
    await createMessage(a.id, {
      conversationId: conv.id,
      wamid: `wamid.${randomUUID()}`,
      direction: "entrada",
      type: "texto",
      body: "mensagem que precisa sobreviver à exclusão LGPD do cliente",
      occurredAt: new Date(),
    });

    await deleteClient(a.id, client.client.id);

    const updated = await getConversation(a.id, conv.id);
    expect(updated?.clientId).toBeNull();
    expect(updated?.phone).toBeNull();

    const messages = await listMessages(a.id, conv.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.body).toBe("mensagem que precisa sobreviver à exclusão LGPD do cliente");

    // A operação foi escopada por a.id — não deve ter tocado nada da barbearia B.
    const listB = await listConversations(b.id);
    expect(listB.every((c) => c.clientId === null || c.phone !== null)).toBe(true);
  });
});
