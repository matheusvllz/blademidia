import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";
import type { AiConfig } from "./client";
import type { AiClient, ConverseInput, ConverseOutput, ToolCallRecord } from "./types";

/**
 * Único ponto do pacote que importa o SDK da Anthropic de fato (design.md da change
 * `add-atendimento-ia`, Decision 1) — espelha `packages/whatsapp/src/cloud-api/adapter.ts`.
 *
 * Usa `client.beta.messages.toolRunner` (plano § 4.3): elimina o JSON Schema mantido à mão,
 * já que as tools do domínio (`packages/core`) são Zod. O runner é **beta** — registrado como
 * dependência beta no design.md.
 *
 * `thinking` é omitido deliberadamente (Haiku 4.5 não suporta `{type:"adaptive"}`/`effort`, e
 * atendimento de WhatsApp é tarefa rasa — plano § 4.1). `max_tokens` fica em 1024 (mensagem de
 * WhatsApp é curta — mesma seção do plano).
 */

export function createAnthropicAiClient(config: AiConfig): AiClient {
  const client = new Anthropic({ apiKey: config.apiKey });

  return {
    async converse(input: ConverseInput): Promise<ConverseOutput> {
      const toolCalls: ToolCallRecord[] = [];

      const tools = input.tools.map((toolDef) =>
        betaZodTool({
          name: toolDef.name,
          description: toolDef.description,
          inputSchema: toolDef.inputSchema as z.ZodType,
          run: async (args: unknown) => {
            const output = await input.executeTool(toolDef.name, args);
            toolCalls.push({ name: toolDef.name, input: args, output });
            return JSON.stringify(output);
          },
        }),
      );

      const finalMessage = await client.beta.messages.toolRunner({
        model: input.model,
        max_tokens: input.maxTokens,
        system: input.systemPrompt,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
        tools,
        max_iterations: input.maxToolIterations,
      });

      const finalText = extractText(finalMessage.content);
      const usage = finalMessage.usage;

      return {
        finalText,
        toolCalls,
        usage: {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheReadTokens: usage.cache_read_input_tokens ?? 0,
          cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
        },
      };
    },
  };
}

function extractText(content: Anthropic.Beta.Messages.BetaContentBlock[]): string | null {
  const textBlocks = content.filter(
    (block): block is Anthropic.Beta.Messages.BetaTextBlock => block.type === "text",
  );
  if (textBlocks.length === 0) return null;
  const text = textBlocks.map((block) => block.text).join("\n").trim();
  return text.length > 0 ? text : null;
}
