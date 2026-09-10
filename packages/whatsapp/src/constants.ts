/** Nome da fila pg-boss usada por `apps/web` (produtor) e `apps/worker` (consumidor) para o
 * processamento assíncrono de mensagens recebidas (ADR-0011). Vive aqui — pacote de domínio
 * neutro de infraestrutura — para que produtor e consumidor nunca divirjam no nome da fila. */
export const WHATSAPP_INBOUND_QUEUE = "whatsapp.process-inbound";
