/**
 * Fronteira que um cliente de IA concreto precisa implementar (design.md da change
 * `add-atendimento-ia`, Decision 1) — espelha o padrão de `WhatsAppAdapter` em
 * `packages/whatsapp`: nenhum código fora deste arquivo/dos adapters concretos
 * (`anthropic-client.ts`, `dry-run-client.ts`) precisa saber qual provedor está por trás.
 *
 * A interface expõe UM turno completo (mensagem → zero ou mais tool calls → texto final),
 * não uma chamada HTTP individual — o `toolRunner` do SDK da Anthropic já resolve o loop de
 * tool-use internamente; replicar isso turno a turno aqui manteria a mesma forma se um dia o
 * provedor mudar (ADR-0005 trata o provedor de IA como trocável, assim como o de WhatsApp).
 */

export interface ToolDefinitionForRuntime {
  name: string;
  description: string;
  /** Zod schema do input da tool — cada adapter concreto decide como traduzir (ex.:
   * `betaZodTool` no adapter da Anthropic). */
  inputSchema: unknown;
}

export interface ToolCallRecord {
  name: string;
  /** Input já validado pelo schema Zod da tool (não o JSON bruto do modelo). */
  input: unknown;
  /** Resultado devolvido pela tool (sucesso ou falha estruturada do domínio) — nunca uma
   * exceção: erros de domínio (ex.: horário ocupado) são retorno, não exceção. */
  output: unknown;
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface ConverseInput {
  model: string;
  maxTokens: number;
  systemPrompt: string;
  messages: ConversationMessage[];
  tools: ToolDefinitionForRuntime[];
  /** Executor único de tool — despachado pelo chamador (`packages/ai/tools/index.ts`), nunca
   * pelo adapter concreto, para manter `barbershopId` sempre do lado do orquestrador (Decision
   * 7 do design.md: nunca um argumento livre do modelo). */
  executeTool: (name: string, input: unknown) => Promise<unknown>;
  maxToolIterations: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConverseOutput {
  /** Texto final da resposta do modelo; `null` se o turno terminou sem texto (ex.: só chamou
   * `escalar_para_humano`, ou atingiu o limite de iterações sem convergir). */
  finalText: string | null;
  toolCalls: ToolCallRecord[];
  usage: UsageInfo;
}

/** Interface injetável — mesma finalidade de `WhatsAppAdapter` em `packages/whatsapp`. */
export interface AiClient {
  converse(input: ConverseInput): Promise<ConverseOutput>;
}
