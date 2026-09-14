import { z } from "zod";
import { executeDomainTool, getBotTools, wasDomainToolCalled, type DomainToolContext } from "./tools/index";
import type { AiClient, ConversationMessage, ToolCallRecord, UsageInfo } from "./types";

/**
 * O turno inteiro de conversa (design.md da change `add-atendimento-ia`, "Proposed
 * Architecture"): monta as tools (domínio + escalação local), delega ao `AiClient` injetado, e
 * traduz o resultado para algo que o orquestrador (`apps/worker`) sabe aplicar — sem tocar
 * banco nem canal (Decision 10: `packages/ai` não depende de `@blademidia/whatsapp`).
 */

const ESCALATION_TOOL_NAME = "escalar_para_humano";

const escalationInputSchema = z.object({
  motivo: z.string().trim().min(1).describe("Motivo curto e objetivo da escalação para humano."),
});

/** Tool local ao loop (design.md Decision 2) — não passa por `executeDomainTool`, porque não é
 * uma ação de domínio: só sinaliza que a conversa precisa de um humano. */
const escalationToolDefinition = {
  name: ESCALATION_TOOL_NAME,
  description:
    "Chame quando o cliente pedir para falar com uma pessoa, demonstrar frustração, ou perguntar algo fora do escopo da barbearia (agendar, cardápio, horário de funcionamento). Não tente resolver sozinho nesses casos.",
  inputSchema: escalationInputSchema,
};

export interface RunConversationTurnInput {
  aiClient: AiClient;
  model: string;
  maxTokens: number;
  maxToolIterations: number;
  systemPrompt: string;
  messages: ConversationMessage[];
  barbershopId: string;
  domainContext: DomainToolContext;
}

export interface EscalationSignal {
  requested: boolean;
  reason: string | null;
}

export interface TurnResult {
  finalText: string | null;
  toolCalls: ToolCallRecord[];
  usage: UsageInfo;
  escalate: EscalationSignal;
  /** Alguma tool de domínio (agenda ou cadastro) foi chamada neste turno — sucesso ou recusa de
   * negócio contam igual (design.md Decision 3): reseta o contador de estagnação. */
  domainToolCalled: boolean;
}

export async function runConversationTurn(input: RunConversationTurnInput): Promise<TurnResult> {
  const tools = [...getBotTools(), escalationToolDefinition];

  let escalate: EscalationSignal = { requested: false, reason: null };

  const executeTool = async (name: string, toolInput: unknown): Promise<unknown> => {
    if (name === ESCALATION_TOOL_NAME) {
      const parsed = escalationInputSchema.parse(toolInput);
      escalate = { requested: true, reason: parsed.motivo };
      return { ok: true, mensagem: "combinado, já vou chamar alguém pra continuar" };
    }
    return executeDomainTool(input.barbershopId, name, toolInput, input.domainContext);
  };

  const output = await input.aiClient.converse({
    model: input.model,
    maxTokens: input.maxTokens,
    systemPrompt: input.systemPrompt,
    messages: input.messages,
    tools,
    executeTool,
    maxToolIterations: input.maxToolIterations,
  });

  const domainToolCalled = output.toolCalls.some((call) => wasDomainToolCalled(call.name));

  return {
    finalText: output.finalText,
    toolCalls: output.toolCalls,
    usage: output.usage,
    escalate,
    domainToolCalled,
  };
}
