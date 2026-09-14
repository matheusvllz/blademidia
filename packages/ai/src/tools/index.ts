import { agendaTools, cadastrarClienteBasicoDefinition, executeCadastrarClienteBasico } from "@blademidia/core";
import type { ToolDefinitionForRuntime } from "../types";

/**
 * Reescrita da change `add-atendimento-ia` (plano § 4.3, design.md "Affected Components"):
 * elimina o JSON Schema mantido à mão do esqueleto da Fase 2 — as tools continuam Zod
 * (`packages/core`), e é `anthropic-client.ts` (o único lugar que importa o SDK de verdade)
 * quem usa `betaZodTool` para convertê-las. Aqui só ficam nome/descrição/schema (para listar
 * ao modelo) e o despacho de execução.
 *
 * `escalar_para_humano` NÃO está aqui (design.md Decision 2): é tratada localmente em
 * `loop.ts`, porque não é uma ação de domínio — é um sinal de controle da conversa.
 */

export function getBotTools(): ToolDefinitionForRuntime[] {
  return [
    ...agendaTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
    cadastrarClienteBasicoDefinition,
  ];
}

export interface DomainToolContext {
  conversationId: string;
  /** Telefone já resolvido da conversa — nunca aceito como argumento do modelo (design.md
   * Decision 6/7). */
  phone: string;
}

/**
 * Despacha uma tool de domínio pelo nome. `barbershopId` vem SEMPRE do orquestrador (nunca de
 * um campo dentro de `input`, mesmo que o modelo tente incluir um) — design.md Decision 7,
 * defesa estrutural contra prompt injection.
 */
export async function executeDomainTool(
  barbershopId: string,
  name: string,
  input: unknown,
  context: DomainToolContext,
): Promise<unknown> {
  if (name === cadastrarClienteBasicoDefinition.name) {
    return executeCadastrarClienteBasico(barbershopId, context, input);
  }

  const tool = agendaTools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`tool desconhecida: ${name}`);
  }
  const parsed = tool.inputSchema.parse(input);
  return tool.handler(barbershopId, parsed);
}

/**
 * Normaliza "sucesso" entre formatos de retorno diferentes (`AgendaResult` das tools de
 * agenda; `CreateClientResult` da tool de cadastro) para o contador de estagnação (design.md
 * Decision 3). Qualquer chamada de tool de domínio — sucesso ou falha de negócio (ex.: horário
 * ocupado) — mostra que o bot está agindo estruturadamente; só CONTA como estagnação quando
 * NENHUMA tool de domínio foi chamada no turno, não quando a tool foi chamada e recusou.
 */
export function wasDomainToolCalled(toolName: string): boolean {
  return toolName !== "escalar_para_humano";
}
