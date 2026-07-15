import { agendaTools } from "@blademidia/core";

/**
 * Exposição das tools da agenda no formato de tool-use da Claude API (ADR-0005
 * + ADR-0008). O contrato (nome, descrição, validação, handler) vive em
 * `@blademidia/core` — aqui só traduzimos para o formato que o SDK da
 * Anthropic espera. NADA é executado em runtime nesta fase (sem loop de
 * conversa, sem canal — isso é `atendimento-ia`, Fase 5).
 *
 * O `input_schema` (JSON Schema) é mantido manualmente em espelho ao
 * `inputSchema` (Zod) de cada tool em `packages/core/src/agenda/tools.ts`.
 * Evitamos adicionar uma dependência de conversão (ex.: zod-to-json-schema) só
 * para isto, já que nenhuma tool roda nesta fase; reavaliar quando o loop de
 * conversa da Fase 5 for implementado de verdade.
 */
export interface ClaudeToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const JSON_SCHEMAS: Record<string, Record<string, unknown>> = {
  consultar_disponibilidade: {
    type: "object",
    properties: {
      date: { type: "string", description: "Dia desejado (YYYY-MM-DD, fuso da barbearia)." },
      serviceId: { type: "string", description: "Id do serviço a agendar." },
      barberId: { type: "string", description: "Id do barbeiro; omitir para qualquer barbeiro." },
    },
    required: ["date", "serviceId"],
  },
  criar_agendamento: {
    type: "object",
    properties: {
      clientId: { type: "string", description: "Id do cliente já cadastrado." },
      serviceId: { type: "string", description: "Id do serviço." },
      barberId: { type: "string", description: "Id do barbeiro que vai atender." },
      startsAt: { type: "string", description: "Início do atendimento em ISO 8601." },
    },
    required: ["clientId", "serviceId", "barberId", "startsAt"],
  },
  remarcar_agendamento: {
    type: "object",
    properties: {
      appointmentId: { type: "string", description: "Id do agendamento a remarcar." },
      startsAt: { type: "string", description: "Novo início em ISO 8601." },
    },
    required: ["appointmentId", "startsAt"],
  },
  cancelar_agendamento: {
    type: "object",
    properties: {
      appointmentId: { type: "string", description: "Id do agendamento a cancelar." },
      reason: { type: "string", description: "Motivo do cancelamento (opcional)." },
    },
    required: ["appointmentId"],
  },
};

/** Definições prontas para o parâmetro `tools` de uma chamada à Claude API. */
export function getClaudeToolDefinitions(): ClaudeToolDefinition[] {
  return agendaTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: JSON_SCHEMAS[tool.name] ?? { type: "object", properties: {} },
  }));
}

/**
 * Executa a tool pelo nome — ponto único que a Fase 5 chama ao processar uma
 * resposta de tool-use do modelo. Valida a entrada pelo mesmo Zod schema do
 * core antes de delegar ao `AgendaService`.
 */
export async function executeTool(barbershopId: string, name: string, input: unknown): Promise<unknown> {
  const tool = agendaTools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`tool desconhecida: ${name}`);
  }
  const parsed = tool.inputSchema.parse(input);
  return tool.handler(barbershopId, parsed);
}
