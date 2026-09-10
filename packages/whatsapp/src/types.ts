/**
 * Tipos de domínio do canal WhatsApp — deliberadamente neutros de provedor (ADR-0004).
 * Nada aqui carrega formato específico da Meta Cloud API nem de um BSP; isso vive em
 * `cloud-api/*`. Ver design.md da change `add-whatsapp-canal`.
 */

/** Origem de uma mensagem, do ponto de vista de quem a produziu. */
export type MessageOrigin =
  | "cliente" // o cliente final escreveu
  | "negocio_via_sistema" // o próprio produto enviou (bot ou painel)
  | "negocio_via_app"; // o barbeiro respondeu pelo WhatsApp Business App (coexistência),
// espelhado ao produto pelo webhook — ver design.md Decision 5. Detecção é heurística
// até a confirmação contra o BSP real (task 9.2 do tasks.md).

export type MessageType = "texto" | "template" | "outro";

/** Evento de mensagem já normalizado, independente do formato de wire do provedor. */
export interface NormalizedMessageEvent {
  waPhoneNumberId: string;
  /** Telefone do CLIENTE na conversa — não o número do negócio, mesmo quando `origin` é
   * `negocio_via_app` (o telefone que identifica a conversa continua sendo o do cliente). */
  clientPhone: string;
  wamid: string;
  type: MessageType;
  body: string | null;
  origin: MessageOrigin;
  occurredAt: Date;
}

/** Resultado da normalização de um payload de webhook — pode não conter mensagem (ex.: só
 * atualização de status de entrega, ou evento que o sistema ainda não trata). */
export type NormalizedWebhookEvent =
  | { kind: "mensagem"; message: NormalizedMessageEvent }
  | { kind: "ignorado"; reason: string };

export interface SendTextInput {
  waPhoneNumberId: string;
  toPhone: string;
  body: string;
}

export interface SendTemplateInput {
  waPhoneNumberId: string;
  toPhone: string;
  templateName: string;
  languageCode: string;
  /** Parâmetros posicionais do corpo do template, na ordem esperada pelo template aprovado. */
  bodyParams: string[];
}

export type SendResult =
  | { ok: true; wamid: string }
  | { ok: false; reason: "janela_fechada" | "opt_out" | "erro_provedor"; detail?: string };
