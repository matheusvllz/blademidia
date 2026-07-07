const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Cliente sem nenhum atendimento ainda conta como inativo (nunca engajou) —
 * decisão de implementação, não um cenário detalhado literalmente na spec;
 * ver design.md/exploration.md para o racional das premissas desta fase.
 */
export function isClientInactive(
  lastVisitAt: Date | null,
  thresholdDays: number,
  now: Date = new Date(),
): boolean {
  if (!lastVisitAt) return true;
  const diffDays = (now.getTime() - lastVisitAt.getTime()) / MS_PER_DAY;
  return diffDays > thresholdDays;
}
