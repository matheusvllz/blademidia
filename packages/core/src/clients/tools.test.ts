/**
 * Teste de integração contra Postgres real (`DATABASE_URL`). Pulado sem banco, como os demais
 * testes de integração do monorepo.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createBarbershop,
  createClient,
  findOrCreateConversation,
  getConversation,
} from "@blademidia/db";
import { executeCadastrarClienteBasico } from "./tools";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const uniquePhone = () => `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;

describe.skipIf(!hasDatabase)("executeCadastrarClienteBasico", () => {
  it("cadastra o cliente com o telefone da conversa e vincula a conversa a ele", async () => {
    const shop = await createBarbershop(`cadastro-${randomUUID()}`, "Cadastro Teste");
    const phone = uniquePhone();
    const conversation = await findOrCreateConversation(shop.id, "wa-phone-id-teste", phone, null);

    const result = await executeCadastrarClienteBasico(
      shop.id,
      { conversationId: conversation.id, phone },
      { nome: "Cliente Novo" },
    );

    expect(result.error).toBeNull();
    expect(result.client?.name).toBe("Cliente Novo");
    expect(result.client?.phone).toBe(phone);

    const updated = await getConversation(shop.id, conversation.id);
    expect(updated?.clientId).toBe(result.client?.id);
  });

  it("quando o telefone já tem cliente cadastrado, devolve o existente sem duplicar", async () => {
    const shop = await createBarbershop(`cadastro-dup-${randomUUID()}`, "Cadastro Dup Teste");
    const phone = uniquePhone();
    const existing = await createClient(shop.id, { name: "Já Cadastrado", phone });
    const conversation = await findOrCreateConversation(shop.id, "wa-phone-id-teste", phone, null);

    const result = await executeCadastrarClienteBasico(
      shop.id,
      { conversationId: conversation.id, phone },
      { nome: "Nome Que O Cliente Digitou Agora" },
    );

    expect(result.error).toBe("phone_duplicate");
    expect(result.client?.id).toBe(existing.client?.id);

    const updated = await getConversation(shop.id, conversation.id);
    expect(updated?.clientId).toBe(existing.client?.id);
  });

  it("rejeita input sem nome", async () => {
    const shop = await createBarbershop(`cadastro-invalido-${randomUUID()}`, "Cadastro Inválido");
    const phone = uniquePhone();
    const conversation = await findOrCreateConversation(shop.id, "wa-phone-id-teste", phone, null);

    await expect(
      executeCadastrarClienteBasico(shop.id, { conversationId: conversation.id, phone }, { nome: "" }),
    ).rejects.toThrow();
  });
});
