import type { SessionData } from "./session";

/**
 * Fase 4 (`auth-tenancy`, Decision 4 do design.md de
 * `add-fidelizacao-e-funcionarios`): três formas de escopo de agenda por
 * papel, cobrindo toda rota de agenda existente (listar, criar, agir sobre um
 * item). Funções puras — sem I/O, sem consulta ao banco.
 */

/**
 * Leitura com filtro opcional (listar agenda/disponibilidade/ocupação):
 * funcionário sempre lê o próprio barbeiro, IGNORANDO o que veio da query —
 * nunca erro, só substitui o valor.
 */
export function scopeReadBarberId(session: SessionData, requestedBarberId?: string): string | undefined {
  if (session.role === "funcionario") return session.barberId ?? undefined;
  return requestedBarberId;
}

export type AssertWriteBarberIdResult = { ok: true } | { ok: false; reason: "forbidden" };

/** Escrita (criar agendamento): funcionário só pode atribuir a si mesmo. */
export function assertWriteBarberId(session: SessionData, barberId: string): AssertWriteBarberIdResult {
  if (session.role === "funcionario" && barberId !== session.barberId) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true };
}

/**
 * Ação sobre um agendamento específico (detalhe, confirmar, concluir,
 * remarcar, cancelar, falta): dono sempre pode; funcionário só sobre o
 * próprio. Quando falso, a rota SHALL tratar como "não encontrado" (404) —
 * mesma fronteira lógica do isolamento de tenant, não um 403 (Decision 4).
 */
export function isOwnAppointment(session: SessionData, appointment: { barberId: string }): boolean {
  if (session.role === "dono") return true;
  return appointment.barberId === session.barberId;
}
