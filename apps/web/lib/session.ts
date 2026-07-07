/**
 * Assinatura de sessão via Web Crypto API (SubtleCrypto) — não `node:crypto` —
 * porque este módulo é importado pelo `middleware.ts`, que roda no Edge
 * Runtime por padrão (sem os módulos nativos do Node). SubtleCrypto funciona
 * igual em Edge e em Node, então o mesmo código serve para middleware, route
 * handlers e Server Components.
 */
export const SESSION_COOKIE_NAME = "blademidia_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET não configurado (ver .env.example)");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface SessionData {
  userId: string;
  barbershopId: string;
  exp: number;
}

export async function createSessionCookieValue(data: Omit<SessionData, "exp">): Promise<string> {
  const session: SessionData = { ...data, exp: Date.now() + SESSION_TTL_MS };
  const payload = bufferToBase64Url(encoder.encode(JSON.stringify(session)));
  const key = await getSigningKey();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${bufferToBase64Url(signatureBuffer)}`;
}

export async function parseSessionCookieValue(
  value: string | undefined | null,
): Promise<SessionData | null> {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const key = await getSigningKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBuffer(signature) as BufferSource,
    encoder.encode(payload),
  );
  if (!valid) return null;

  try {
    const session = JSON.parse(decoder.decode(base64UrlToBuffer(payload))) as SessionData;
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
