/**
 * Client REST mínimo do Evolution API (fetch nativo do Node 18+, zero deps).
 * Sem EVOLUTION_URL/EVOLUTION_API_KEY definidos, entra em modo DRY-RUN:
 * loga a chamada que faria e retorna ok — permite testar o fluxo local
 * inteiro sem Docker/VPS.
 */

const BASE = process.env.EVOLUTION_URL ?? null;
const KEY = process.env.EVOLUTION_API_KEY ?? null;

export const dryRun = !BASE || !KEY;

async function call(method, path, body) {
  if (dryRun) {
    console.log(`[dry-run] ${method} ${path}${body ? ` payload=${JSON.stringify(body).slice(0, 120)}…` : ""}`);
    return { dryRun: true };
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", apikey: KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Evolution ${method} ${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

export function createInstance({ instanceName, webhookUrl, webhookEvents }) {
  return call("POST", "/instance/create", {
    instanceName,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
    webhook: { url: webhookUrl, events: webhookEvents, byEvents: false },
  });
}

export function connectionState(instanceName) {
  return call("GET", `/instance/connectionState/${instanceName}`);
}

export function fetchInstances() {
  return call("GET", "/instance/fetchInstances");
}

export function sendText(instanceName, number, text) {
  return call("POST", `/message/sendText/${instanceName}`, { number, text });
}
