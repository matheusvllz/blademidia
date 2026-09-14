/**
 * Precisa de Postgres real (`DATABASE_URL`); pulado sem banco, como os demais testes de
 * integração do monorepo.
 */
import { randomUUID } from "node:crypto";
import { createBarbershop, findOrCreateConversation, getConversation } from "@blademidia/db";
import { beforeAll, describe, expect, it } from "vitest";
import { isOptOutMessage, processInboundMessage } from "./process-inbound";

describe("isOptOutMessage", () => {
  it.each(["PARE", "pare", "Sair", "  sair  ", "pare!", "SAIR."])(
    "reconhece %j como opt-out",
    (body) => {
      expect(isOptOutMessage(body)).toBe(true);
    },
  );

  it.each([null, "", "quero agendar um corte", "pare de me ligar", "não quero mais, sair fora"])(
    "NÃO trata %j como opt-out",
    (body) => {
      expect(isOptOutMessage(body)).toBe(false);
    },
  );
});

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("processInboundMessage", () => {
  let shop: { id: string };

  beforeAll(async () => {
    shop = await createBarbershop(`wa-worker-${randomUUID()}`, "WhatsApp Worker Test");
  });

  it("mensagem de cliente atualiza last_inbound_at e NÃO mexe no handover", async () => {
    const conversation = await findOrCreateConversation(shop.id, "num-1", "+5511911112222", null);
    const occurredAt = new Date("2026-09-10T12:00:00Z");

    await processInboundMessage({
      barbershopId: shop.id,
      conversationId: conversation.id,
      origin: "cliente",
      occurredAt: occurredAt.toISOString(),
      body: "quero agendar um corte",
    });

    const updated = await getConversation(shop.id, conversation.id);
    expect(updated?.lastInboundAt?.toISOString()).toBe(occurredAt.toISOString());
    expect(updated?.handover).toBe("bot");
    expect(updated?.optedOutAt).toBeNull();
  });

  it("mensagem espelhada do app (negocio_via_app) marca handover humano e NÃO mexe em last_inbound_at", async () => {
    const conversation = await findOrCreateConversation(shop.id, "num-1", "+5511922223333", null);

    await processInboundMessage({
      barbershopId: shop.id,
      conversationId: conversation.id,
      origin: "negocio_via_app",
      occurredAt: new Date().toISOString(),
      body: "resposta do barbeiro pelo app",
    });

    const updated = await getConversation(shop.id, conversation.id);
    expect(updated?.handover).toBe("humano");
    expect(updated?.lastInboundAt).toBeNull();
  });

  it("mensagem 'PARE' do cliente marca opted_out_at", async () => {
    const conversation = await findOrCreateConversation(shop.id, "num-1", "+5511933334444", null);

    await processInboundMessage({
      barbershopId: shop.id,
      conversationId: conversation.id,
      origin: "cliente",
      occurredAt: new Date().toISOString(),
      body: "PARE",
    });

    const updated = await getConversation(shop.id, conversation.id);
    expect(updated?.optedOutAt).not.toBeNull();
  });

  it("mensagem espelhada do app com corpo 'PARE' NÃO marca opt-out (opt-out só vale para o cliente)", async () => {
    const conversation = await findOrCreateConversation(shop.id, "num-1", "+5511955556666", null);

    await processInboundMessage({
      barbershopId: shop.id,
      conversationId: conversation.id,
      origin: "negocio_via_app",
      occurredAt: new Date().toISOString(),
      body: "PARE",
    });

    const updated = await getConversation(shop.id, conversation.id);
    expect(updated?.optedOutAt).toBeNull();
  });
});
