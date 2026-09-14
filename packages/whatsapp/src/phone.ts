/**
 * Normalização de telefone para E.164 e a armadilha do nono dígito brasileiro
 * (design.md, Decision 6). Números BR móveis têm DDD(2) + 9 dígitos locais
 * (começando em 9) na forma atual; números antigos, cadastrados sem o nono
 * dígito, têm DDD(2) + 8 dígitos locais. Uma mensagem pode chegar numa forma
 * e o cliente estar cadastrado na outra — por isso `phoneCandidates` sempre
 * devolve as duas formas plausíveis para o casamento em `findClientByPhone`.
 */

/** Remove tudo que não é dígito e prefixa `+55` quando o número parece local (sem DDI). */
export function normalizePhoneToE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    // DDD + número local (8 ou 9 dígitos), sem DDI — assume Brasil (D4/ICP: Brasília/DF).
    return `+55${digits}`;
  }
  return `+${digits}`;
}

/**
 * Para um E.164 brasileiro (`+55DDD...`), devolve a(s) forma(s) alternativa(s) plausível(is)
 * — com ou sem o nono dígito. Vazio para números fora do Brasil (a ambiguidade é específica
 * do BR).
 */
export function alternateBrazilianPhoneForms(e164: string): string[] {
  if (!e164.startsWith("+55")) return [];
  const rest = e164.slice(3);
  if (rest.length < 10) return [];
  const ddd = rest.slice(0, 2);
  const local = rest.slice(2);

  if (local.length === 9 && local.startsWith("9")) {
    return [`+55${ddd}${local.slice(1)}`];
  }
  if (local.length === 8) {
    return [`+55${ddd}9${local}`];
  }
  return [];
}

/** Todas as formas a tentar ao casar um telefone recebido com um cliente cadastrado —
 * a forma normalizada primeiro, seguida das alternativas plausíveis. */
export function phoneCandidates(raw: string): string[] {
  const primary = normalizePhoneToE164(raw);
  return [primary, ...alternateBrazilianPhoneForms(primary)];
}
