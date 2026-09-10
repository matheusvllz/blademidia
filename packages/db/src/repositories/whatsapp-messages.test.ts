/**
 * Precisa de Postgres real (`DATABASE_URL`); pulado sem banco, como os demais testes de
 * integração deste pacote.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createBarbershop } from "./barbershops";
import { findOrCreateConversation } from "./whatsapp-conversations";
import { createMessage, listMessages } from "./whatsapp-messages";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("whatsapp-messages — deduplicação por wamid", () => {
  let shop: { id: string };
  let conversation: { id: string };

  beforeAll(async () => {
    shop = await createBarbershop(`wa-msg-${randomUUID()}`, "WhatsApp Msg Test");
    conversation = await findOrCreateConversation(shop.id, "123456", "+5511998765432", null);
  });

  it("insere a primeira mensagem normalmente", async () => {
    const result = await createMessage(shop.id, {
      conversationId: conversation.id,
      wamid: `wamid.${randomUUID()}`,
      direction: "entrada",
      type: "texto",
      body: "oi",
      occurredAt: new Date(),
    });
    expect(result.alreadyProcessed).toBe(false);
  });

  it("a mesma wamid enviada duas vezes NÃO cria segunda linha nem lança erro não tratado", async () => {
    const wamid = `wamid.${randomUUID()}`;
    const first = await createMessage(shop.id, {
      conversationId: conversation.id,
      wamid,
      direction: "entrada",
      type: "texto",
      body: "primeira tentativa",
      occurredAt: new Date(),
    });
    expect(first.alreadyProcessed).toBe(false);

    const second = await createMessage(shop.id, {
      conversationId: conversation.id,
      wamid,
      direction: "entrada",
      type: "texto",
      body: "reentrega da mesma mensagem",
      occurredAt: new Date(),
    });
    expect(second.alreadyProcessed).toBe(true);

    const all = await listMessages(shop.id, conversation.id);
    expect(all.filter((m) => m.wamid === wamid)).toHaveLength(1);
  });
});
