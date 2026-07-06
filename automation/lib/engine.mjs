import { renderTemplate, listaServicos } from "./presets.mjs";

/**
 * Motor de auto-resposta determinístico (v1 da agência — sem LLM).
 * Recebe o texto do cliente, decide a intenção por palavras-chave e devolve
 * a resposta do preset. A camada de IA conversacional é papel do produto SaaS
 * (change atendimento-ia), não deste motor operacional.
 */

// Ordem = prioridade: pergunta de preço ("quanto tá o corte?") tem que vencer
// a palavra "corte" do agendamento.
const INTENTS = [
  { name: "precos", patterns: [/\bpre[cç]o/i, /\bquanto\b/i, /\bvalor/i, /\btabela\b/i] },
  { name: "agendamento", patterns: [/\bagendar\b/i, /\bmarcar\b/i, /\bhor[aá]rio/i, /\bencaixe\b/i, /\bamanh[aã]\b/i, /\bhoje\b/i, /\bcorte\b/i, /\bbarba\b/i] },
  { name: "saudacao", patterns: [/^(oi|ol[aá]|opa|fala|e a[ií]|bom dia|boa tarde|boa noite)\b/i] },
];

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

export function dentroDoHorario(preset, date = new Date()) {
  const janela = preset.negocio.horario_funcionamento[DIAS[date.getDay()]];
  if (!janela) return false;
  const [abre, fecha] = janela.split("-");
  const hhmm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return hhmm >= abre && hhmm < fecha;
}

export function detectIntent(text) {
  for (const intent of INTENTS) {
    if (intent.patterns.some((p) => p.test(text))) return intent.name;
  }
  return null;
}

/**
 * Decide a resposta para uma mensagem recebida.
 * `state` guarda, por contato, o contador de mensagens sem match (escalação).
 * Retorna { intent, reply, escalate } — reply=null significa "não responder"
 * (já escalado para humano; humano assume a conversa).
 */
export function decide({ text, preset, state, now = new Date(), forceOpen = false }) {
  if (state.escalated) return { intent: "humano", reply: null, escalate: false };

  const context = {
    ...preset,
    servico: "o serviço",
    horarios_disponiveis: "(consultar agenda)",
    lista_servicos: listaServicos(preset),
    horario_hoje: preset.negocio.horario_funcionamento[DIAS[now.getDay()]] ?? "fechado hoje",
  };

  if (!forceOpen && !dentroDoHorario(preset, now) && preset.regras.responder_fora_do_horario) {
    // Avisa fora-de-horário só 1x por contato — repetir a cada mensagem é spam.
    if (state.afterHoursNotified) return { intent: "fora_de_horario", reply: null, escalate: false };
    state.afterHoursNotified = true;
    return { intent: "fora_de_horario", reply: renderTemplate(preset.respostas.fora_de_horario, context), escalate: false };
  }

  const intent = detectIntent(text);
  if (intent) {
    state.misses = 0;
    return { intent, reply: renderTemplate(preset.respostas[intent], context), escalate: false };
  }

  state.misses = (state.misses ?? 0) + 1;
  if (state.misses >= preset.regras.escalar_para_humano_apos_msgs_sem_match) {
    state.escalated = true;
    return { intent: "fallback_humano", reply: renderTemplate(preset.respostas.fallback_humano, context), escalate: true };
  }
  return { intent: "saudacao", reply: renderTemplate(preset.respostas.saudacao, context), escalate: false };
}

/** Mascara telefone para log: mantém só os 4 últimos dígitos (regra do repo: nunca logar telefone completo). */
export function maskPhone(jid) {
  const digits = String(jid).replace(/\D/g, "");
  return `***${digits.slice(-4)}`;
}
