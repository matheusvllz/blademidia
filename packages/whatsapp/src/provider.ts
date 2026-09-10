import type {
  NormalizedWebhookEvent,
  SendResult,
  SendTemplateInput,
  SendTextInput,
} from "./types";

/**
 * Fronteira que um adapter concreto precisa implementar — formato de wire puro, SEM regra de
 * negócio (janela de 24h, opt-out). Essas regras vivem em `WhatsAppProvider`, que envolve
 * qualquer adapter (design.md da change `add-whatsapp-canal`, Decision 1).
 */
export interface WhatsAppAdapter {
  sendText(input: SendTextInput): Promise<SendResult>;
  sendTemplate(input: SendTemplateInput): Promise<SendResult>;
  /** Compara a assinatura do webhook contra o corpo CRU (string/Buffer) — nunca contra JSON
   * re-serializado, ver design.md § Decision 2 / plano § 4.4. */
  verifySignature(rawBody: string, signatureHeader: string | null): boolean;
  /** Responde ao desafio de verificação (`GET`). Retorna o valor do challenge se o
   * `verify_token` bater, ou `null` caso contrário. */
  respondToChallenge(params: URLSearchParams): string | null;
  normalizeWebhookPayload(rawBody: unknown): NormalizedWebhookEvent[];
}

/** Estado da conversa necessário para aplicar as regras de janela/opt-out antes do envio. */
export interface ConversationWindowState {
  lastInboundAt: Date | null;
  optedOutAt: Date | null;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

/** Pura — testável sem adapter nem banco. */
export function isWithin24hWindow(lastInboundAt: Date | null, now: Date = new Date()): boolean {
  if (!lastInboundAt) return false;
  return now.getTime() - lastInboundAt.getTime() < WINDOW_MS;
}

/**
 * Fronteira única de domínio do canal WhatsApp (ADR-0004). Todo código do produto que precisa
 * enviar ou interpretar mensagem passa por aqui — nunca diretamente pelo adapter concreto.
 * Aplica janela de 24h e opt-out ANTES de delegar ao adapter, para que uma recusa nunca
 * chegue a fazer uma chamada de rede (design.md, Error Flow 2).
 */
export class WhatsAppProvider {
  constructor(private readonly adapter: WhatsAppAdapter) {}

  async sendText(input: SendTextInput, window: ConversationWindowState): Promise<SendResult> {
    if (window.optedOutAt) return { ok: false, reason: "opt_out" };
    if (!isWithin24hWindow(window.lastInboundAt)) return { ok: false, reason: "janela_fechada" };
    return this.adapter.sendText(input);
  }

  /** Templates podem sair fora da janela de 24h (é exatamente para isso que existem) — só
   * opt-out bloqueia. */
  async sendTemplate(
    input: SendTemplateInput,
    window: ConversationWindowState,
  ): Promise<SendResult> {
    if (window.optedOutAt) return { ok: false, reason: "opt_out" };
    return this.adapter.sendTemplate(input);
  }

  verifySignature(rawBody: string, signatureHeader: string | null): boolean {
    return this.adapter.verifySignature(rawBody, signatureHeader);
  }

  respondToChallenge(params: URLSearchParams): string | null {
    return this.adapter.respondToChallenge(params);
  }

  normalizeWebhookPayload(rawBody: unknown): NormalizedWebhookEvent[] {
    return this.adapter.normalizeWebhookPayload(rawBody);
  }
}
