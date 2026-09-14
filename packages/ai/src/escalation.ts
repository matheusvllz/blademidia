/**
 * Escalação por estagnação (design.md Decision 3): determinística, não auto-relatada pelo
 * modelo. `HANDOFF_MESSAGE` é texto fixo, já aprovado pelo checklist § 14 do guia de copy — a
 * escalação por estagnação e a explícita usam a MESMA mensagem, porque em ambos os casos o
 * cliente só precisa saber que alguém vai continuar o atendimento, não o motivo técnico.
 */

/** Proposto no exploration.md: a 3ª tentativa sem progresso já escala. Ajustável por dado real
 * após o portão de qualidade (plano § 7) — não é decisão de produto, é parâmetro. */
export const STALL_THRESHOLD = 2;

export function shouldForceStallEscalation(stallCount: number): boolean {
  return stallCount >= STALL_THRESHOLD;
}

export const HANDOFF_MESSAGE = "acho melhor chamar alguém aqui pra te ajudar melhor, só um instante 🙏";
