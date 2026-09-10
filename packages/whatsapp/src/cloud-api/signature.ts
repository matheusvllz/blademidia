import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verificação HMAC sobre o corpo CRU do webhook (design.md, Decision 1 / plano § 4.4).
 * NUNCA chamar isto sobre um corpo re-serializado (ex.: `JSON.stringify(await req.json())`)
 * — qualquer diferença de bytes (ordem de chaves, espaços) invalida a assinatura.
 * `X-Hub-Signature-256` chega como `sha256=<hex>`.
 */
export function verifyCloudApiSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader) return false;
  const [scheme, receivedHex] = signatureHeader.split("=");
  if (scheme !== "sha256" || !receivedHex) return false;

  const expectedHex = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const receivedBuffer = Buffer.from(receivedHex, "hex");
  const expectedBuffer = Buffer.from(expectedHex, "hex");
  if (receivedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
