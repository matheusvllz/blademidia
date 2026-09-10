// `zod/v4` (não a raiz `zod`, que é a API clássica v3): a change `add-atendimento-ia` precisa
// que este schema seja estruturalmente compatível com `betaZodTool` do SDK da Anthropic, que
// espera o `ZodType` do `zod/v4` — v3 e v4 têm `_def` internos incompatíveis em tempo de
// execução, mesmo vindo do mesmo pacote (zod 3.25+ empacota as duas APIs lado a lado
// justamente para essa migração). `.parse()`/`.describe()`/`.optional()` continuam iguais.
import { z } from "zod/v4";
import {
  type AgendaResult,
  bookAppointment,
  cancelAppointment,
  getAvailability,
  rescheduleAppointment,
} from "./agenda-service";

/**
 * Contrato de tools da agenda para o bot de IA (ADR-0008 + D3/ADR-0005). Cada
 * tool mapeia 1:1 para um método do AgendaService, SEMPRE com `barbershopId`
 * explícito (ADR-0007) e origem `bot` nas escritas — não há caminho de escrita
 * paralelo. NADA aqui é executado em runtime na Fase 2: é o contrato que a
 * Fase 5 (`atendimento-ia`) conecta ao loop de conversa da Claude API. O pacote
 * `@blademidia/ai` re-expõe estas definições no formato tool-use do provedor.
 */

export interface AgendaTool<I> {
  name: string;
  description: string;
  inputSchema: z.ZodType<I>;
  /** Executa a ação de domínio para o tenant dado. Origem das escritas: `bot`. */
  handler: (barbershopId: string, input: I) => Promise<unknown>;
}

/**
 * Alias genérico (change `add-atendimento-ia`, design.md "Affected Components"): o formato
 * `{name, description, inputSchema, handler(barbershopId, input)}` não é específico de agenda
 * — é o contrato de qualquer tool que o bot pode chamar (ver também
 * `packages/core/src/clients/tools.ts`). Mantido como alias, não renomeação, para não quebrar
 * `AgendaTool` nos imports já existentes.
 */
export type BotTool<I> = AgendaTool<I>;

const consultarDisponibilidadeInput = z.object({
  date: z.string().describe("Dia desejado no formato YYYY-MM-DD (fuso da barbearia)."),
  serviceId: z.string().describe("Id do serviço a agendar."),
  barberId: z.string().optional().describe("Id do barbeiro; omitir para qualquer barbeiro."),
});

const criarAgendamentoInput = z.object({
  clientId: z.string().describe("Id do cliente já cadastrado."),
  serviceId: z.string().describe("Id do serviço."),
  barberId: z.string().describe("Id do barbeiro que vai atender."),
  startsAt: z.string().describe("Início do atendimento em ISO 8601 (ex.: 2026-07-20T13:00:00Z)."),
});

const remarcarAgendamentoInput = z.object({
  appointmentId: z.string().describe("Id do agendamento a remarcar."),
  startsAt: z.string().describe("Novo início em ISO 8601."),
});

const cancelarAgendamentoInput = z.object({
  appointmentId: z.string().describe("Id do agendamento a cancelar."),
  reason: z.string().optional().describe("Motivo do cancelamento (opcional)."),
});

export const consultarDisponibilidadeTool: AgendaTool<z.infer<typeof consultarDisponibilidadeInput>> = {
  name: "consultar_disponibilidade",
  description:
    "Lista os horários livres de um serviço num dia, por barbeiro ou em qualquer barbeiro.",
  inputSchema: consultarDisponibilidadeInput,
  handler: (barbershopId, input) =>
    getAvailability(barbershopId, {
      date: input.date,
      serviceId: input.serviceId,
      barberId: input.barberId,
    }),
};

export const criarAgendamentoTool: AgendaTool<z.infer<typeof criarAgendamentoInput>> = {
  name: "criar_agendamento",
  description: "Cria um agendamento para um cliente num horário livre.",
  inputSchema: criarAgendamentoInput,
  handler: (barbershopId, input): Promise<AgendaResult<unknown>> =>
    bookAppointment(barbershopId, {
      clientId: input.clientId,
      serviceId: input.serviceId,
      barberId: input.barberId,
      startsAt: new Date(input.startsAt),
      source: "bot",
    }),
};

export const remarcarAgendamentoTool: AgendaTool<z.infer<typeof remarcarAgendamentoInput>> = {
  name: "remarcar_agendamento",
  description: "Remarca um agendamento existente para um novo horário livre.",
  inputSchema: remarcarAgendamentoInput,
  handler: (barbershopId, input) =>
    rescheduleAppointment(barbershopId, input.appointmentId, new Date(input.startsAt)),
};

export const cancelarAgendamentoTool: AgendaTool<z.infer<typeof cancelarAgendamentoInput>> = {
  name: "cancelar_agendamento",
  description: "Cancela um agendamento existente, liberando o horário.",
  inputSchema: cancelarAgendamentoInput,
  handler: (barbershopId, input) =>
    cancelAppointment(barbershopId, input.appointmentId, input.reason),
};

/** Todas as tools da agenda, na ordem de uso típico da conversa. */
export const agendaTools: AgendaTool<unknown>[] = [
  consultarDisponibilidadeTool,
  criarAgendamentoTool,
  remarcarAgendamentoTool,
  cancelarAgendamentoTool,
] as AgendaTool<unknown>[];
