/**
 * Precisa de Postgres real (`DATABASE_URL`); pulado sem banco, como os demais testes de
 * integração do monorepo.
 *
 * `resolveAiClient` é mockado para devolver um `AiClient` controlado pelo teste — sem isso,
 * o dry-run padrão (sem `ANTHROPIC_API_KEY` neste ambiente) sempre escalaria, o que
 * impossibilitaria testar os outros caminhos (resposta simples, stall, tool de domínio) de
 * forma determinística. `createDryRunAiClient`/demais exports continuam reais (`...actual`).
 */
import { randomUUID } from "node:crypto";
import {
  createBarbershop,
  createService,
  findOrCreateConversation,
  getConversation,
  listMessages,
  listUsageForConversation,
} from "@blademidia/db";
import type { AiClient } from "@blademidia/ai";
import Anthropic from "@anthropic-ai/sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let mockAiClient: AiClient;

vi.mock("@blademidia/ai", async () => {
  const actual = await vi.importActual<typeof import("@blademidia/ai")>("@blademidia/ai");
  return {
    ...actual,
    resolveAiClient: () => mockAiClient,
  };
});

const { createDryRunAiClient } = await import("@blademidia/ai");
const { isOptOutMessage, processInboundMessage } = await import("./process-inbound");

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
    // Este teste exercita o adapter DRY-RUN de WhatsApp de propósito — as credenciais fake do
    // `.env` (Change 1, só para exercitar a verificação de assinatura do webhook) fariam
    // `resolveWhatsAppProvider` escolher o adapter real e falhar o envio contra uma URL fake.
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
    shop = await createBarbershop(`wa-worker-${randomUUID()}`, "WhatsApp Worker Test");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("mensagem de cliente atualiza last_inbound_at; resposta simples do bot não mexe no handover", async () => {
    mockAiClient = createDryRunAiClient([{ toolCalls: [], finalText: "beleza, e aí, posso ajudar?" }]);
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

  it("mensagem 'PARE' do cliente marca opted_out_at e NÃO aciona o bot", async () => {
    mockAiClient = createDryRunAiClient([{ toolCalls: [], finalText: "isso nunca deveria ser enviado" }]);
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
    const messages = await listMessages(shop.id, conversation.id);
    expect(messages.some((m) => m.direction === "saida")).toBe(false);
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

  it("conversa com handover humano não aciona o bot (silêncio)", async () => {
    mockAiClient = createDryRunAiClient([{ toolCalls: [], finalText: "isso nunca deveria ser chamado" }]);
    const conversation = await findOrCreateConversation(shop.id, "num-1", "+5511966667777", null);

    await processInboundMessage({
      barbershopId: shop.id,
      conversationId: conversation.id,
      origin: "negocio_via_app",
      occurredAt: new Date().toISOString(),
      body: "barbeiro assumiu a conversa",
    });

    await processInboundMessage({
      barbershopId: shop.id,
      conversationId: conversation.id,
      origin: "cliente",
      occurredAt: new Date().toISOString(),
      body: "oi de novo",
    });

    const messages = await listMessages(shop.id, conversation.id);
    expect(messages.some((m) => m.direction === "saida")).toBe(false);
  });

  it("tool de domínio chamada: envia a resposta, persiste como saída e registra uso de IA", async () => {
    const service = await createService(shop.id, { name: "Corte", durationMin: 30, priceCents: 4500 });
    mockAiClient = createDryRunAiClient([
      {
        toolCalls: [
          { name: "consultar_disponibilidade", input: { date: "2026-09-11", serviceId: service.service!.id } },
        ],
        finalText: "tenho 09:00 e 10:00 amanhã, qual prefere?",
      },
    ]);
    const conversation = await findOrCreateConversation(shop.id, "num-1", "+5511977778888", null);
    // Abre a janela de 24h antes do turno (o job também faz isso, mas a ordem de operações no
    // teste real é: primeira mensagem já abre a janela dentro do mesmo processInboundMessage).

    await processInboundMessage({
      barbershopId: shop.id,
      conversationId: conversation.id,
      origin: "cliente",
      occurredAt: new Date().toISOString(),
      body: "quero agendar um corte amanhã",
    });

    const messages = await listMessages(shop.id, conversation.id);
    const outbound = messages.find((m) => m.direction === "saida");
    expect(outbound?.body).toBe("tenho 09:00 e 10:00 amanhã, qual prefere?");

    const usage = await listUsageForConversation(shop.id, conversation.id);
    expect(usage).toHaveLength(1);

    const updated = await getConversation(shop.id, conversation.id);
    expect(updated?.botStallCount).toBe(0);
    expect(updated?.handover).toBe("bot");
  });

  it("escalação explícita do modelo marca handover humano e envia a mensagem fixa de devolução", async () => {
    mockAiClient = createDryRunAiClient([
      { toolCalls: [{ name: "escalar_para_humano", input: { motivo: "cliente pediu para falar com o dono" } }], finalText: null },
    ]);
    const conversation = await findOrCreateConversation(shop.id, "num-1", "+5511988889999", null);

    await processInboundMessage({
      barbershopId: shop.id,
      conversationId: conversation.id,
      origin: "cliente",
      occurredAt: new Date().toISOString(),
      body: "quero falar com o dono, por favor",
    });

    const updated = await getConversation(shop.id, conversation.id);
    expect(updated?.handover).toBe("humano");

    const messages = await listMessages(shop.id, conversation.id);
    const outbound = messages.find((m) => m.direction === "saida");
    expect(outbound?.body).toMatch(/chamar alguém/i);
  });

  it("estagnação: N turnos sem tool de domínio forçam handover humano, ignorando o texto do modelo no turno que estoura", async () => {
    const conversation = await findOrCreateConversation(shop.id, "num-1", "+5511999990000", null);

    for (let i = 0; i < 2; i++) {
      mockAiClient = createDryRunAiClient([{ toolCalls: [], finalText: `resposta sem ação nº ${i + 1}` }]);
      await processInboundMessage({
        barbershopId: shop.id,
        conversationId: conversation.id,
        origin: "cliente",
        occurredAt: new Date().toISOString(),
        body: `mensagem ambígua ${i + 1}`,
      });
    }

    const updated = await getConversation(shop.id, conversation.id);
    expect(updated?.handover).toBe("humano");

    const messages = await listMessages(shop.id, conversation.id);
    const lastOutbound = messages.filter((m) => m.direction === "saida").at(-1);
    expect(lastOutbound?.body).toMatch(/chamar alguém/i);
  });

  it("erro do provedor de IA degrada para humano sem lançar e sem enviar mensagem", async () => {
    mockAiClient = {
      converse: vi.fn().mockRejectedValue(new Anthropic.APIConnectionError({ message: "falha de rede simulada" })),
    };
    const conversation = await findOrCreateConversation(shop.id, "num-1", "+5511900001111", null);

    await expect(
      processInboundMessage({
        barbershopId: shop.id,
        conversationId: conversation.id,
        origin: "cliente",
        occurredAt: new Date().toISOString(),
        body: "mensagem qualquer",
      }),
    ).resolves.toBeUndefined();

    const updated = await getConversation(shop.id, conversation.id);
    expect(updated?.handover).toBe("humano");

    const messages = await listMessages(shop.id, conversation.id);
    expect(messages.some((m) => m.direction === "saida")).toBe(false);
  });
});
