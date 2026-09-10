import type { AiClient, ConverseInput, ConverseOutput, ToolCallRecord, UsageInfo } from "./types";

/**
 * Cliente de IA sem rede — usado quando `ANTHROPIC_API_KEY` não está configurada (dev local ou
 * este ambiente antes da credencial existir, ver exploration.md/design.md da change
 * `add-atendimento-ia`, Decision 1). Espelha `packages/whatsapp/src/dry-run.ts`: nunca chama
 * `fetch`, nunca loga conteúdo de mensagem.
 *
 * Comportamento padrão (sem `script`): simula uma chamada à tool `escalar_para_humano`, nunca
 * inventa uma resposta de atendimento. É a opção mais segura para um ambiente sem IA de
 * verdade configurada — se por engano rodar contra um canal de WhatsApp real (credenciais reais
 * de `packages/whatsapp` presentes sem `ANTHROPIC_API_KEY`), o cliente final recebe a devolução
 * humana fixa (`HANDOFF_MESSAGE`, ver `escalation.ts`), nunca um texto improvisado.
 *
 * `script`, quando fornecido, permite roteirizar um turno determinístico — usado nos testes do
 * `loop.ts` e na verificação end-to-end (tasks.md grupo 7) para provar o caminho completo
 * (tool calls reais executadas via `executeTool`, resposta enviada de verdade pelo
 * `WhatsAppProvider` dry-run) sem depender de credencial da Anthropic.
 */

const ZERO_USAGE: UsageInfo = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
};

export interface DryRunStep {
  toolCalls?: { name: string; input: unknown }[];
  finalText: string | null;
}

export type DryRunScript = DryRunStep[];

const DEFAULT_SCRIPT: DryRunScript = [
  {
    toolCalls: [{ name: "escalar_para_humano", input: { motivo: "modo dry-run: IA não configurada" } }],
    finalText: null,
  },
];

export function createDryRunAiClient(script: DryRunScript = DEFAULT_SCRIPT): AiClient {
  return {
    async converse(input: ConverseInput): Promise<ConverseOutput> {
      console.log(
        `[ai:dry-run] converse: model=${input.model} messages=${input.messages.length} tools=${input.tools.length}`,
      );

      const toolCalls: ToolCallRecord[] = [];
      let finalText: string | null = null;

      for (const step of script) {
        for (const call of step.toolCalls ?? []) {
          const output = await input.executeTool(call.name, call.input);
          toolCalls.push({ name: call.name, input: call.input, output });
        }
        finalText = step.finalText;
      }

      return { finalText, toolCalls, usage: ZERO_USAGE };
    },
  };
}
