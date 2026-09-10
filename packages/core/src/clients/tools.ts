import { createClient, linkClientToConversation, type CreateClientResult } from "@blademidia/db";
// `zod/v4` — mesmo motivo do comentário em `../agenda/tools.ts` (compatibilidade com
// `betaZodTool` do SDK da Anthropic).
import { z } from "zod/v4";
import type { BotTool } from "../agenda/tools";

/**
 * Tool de cadastro básico (change `add-atendimento-ia`, design.md Decision 6): permite que o
 * bot cadastre um cliente que escreve pela primeira vez, antes de agendar (`criar_agendamento`
 * exige `clientId`). O telefone NUNCA vem do modelo — vem do telefone já resolvido da conversa
 * (mesmo princípio da Decision 7: tenant/identidade nunca é argumento livre do modelo).
 *
 * Por precisar de `conversationId`/telefone além do `barbershopId` — contexto que as tools de
 * agenda não precisam —, o formato `handler(barbershopId, input)` comum às `BotTool` não é
 * suficiente sozinho. `cadastrarClienteBasicoDefinition` só carrega nome/descrição/schema (para
 * listar a tool ao modelo); `executeCadastrarClienteBasico` é a função que
 * `packages/ai/src/tools/index.ts` chama de fato, com o contexto da conversa.
 */

export const cadastrarClienteBasicoInputSchema = z.object({
  nome: z.string().trim().min(1).describe("Nome do cliente, como ele se apresentou na conversa."),
});

export type CadastrarClienteBasicoInput = z.infer<typeof cadastrarClienteBasicoInputSchema>;

export const cadastrarClienteBasicoDefinition: Pick<BotTool<CadastrarClienteBasicoInput>, "name" | "description" | "inputSchema"> = {
  name: "cadastrar_cliente_basico",
  description:
    "Cadastra um cliente novo usando o nome informado e o telefone da própria conversa. Use antes de criar_agendamento quando a conversa ainda não tiver um cliente associado.",
  inputSchema: cadastrarClienteBasicoInputSchema,
};

export interface CadastrarClienteBasicoContext {
  conversationId: string;
  phone: string;
}

export async function executeCadastrarClienteBasico(
  barbershopId: string,
  context: CadastrarClienteBasicoContext,
  input: unknown,
): Promise<CreateClientResult> {
  const parsed = cadastrarClienteBasicoInputSchema.parse(input);
  const result = await createClient(barbershopId, { name: parsed.nome, phone: context.phone });
  if (result.client) {
    await linkClientToConversation(barbershopId, context.conversationId, result.client.id);
  }
  return result;
}
