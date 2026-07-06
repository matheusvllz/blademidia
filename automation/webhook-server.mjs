/**
 * Servidor local de webhooks do Evolution API.
 * Recebe eventos, roda o motor de auto-resposta e envia a resposta
 * (ou loga em dry-run quando não há Evolution configurado).
 *
 * Uso:  node automation/webhook-server.mjs [--preset=barbearia-default] [--port=3333]
 *
 * Regra do repositório respeitada: NUNCA loga conteúdo de mensagem de cliente
 * final nem telefone completo — só tipo de evento, instance, intenção e ***4dígitos.
 */
import { createServer } from "node:http";
import { loadPreset } from "./lib/presets.mjs";
import { decide, maskPhone } from "./lib/engine.mjs";
import { sendText, dryRun } from "./lib/evolution.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const PORT = Number(args.port ?? process.env.WEBHOOK_PORT ?? 3333);
const preset = loadPreset(args.preset ?? "barbearia-default");
/** --force-open: ignora horário de funcionamento (testes locais fora do expediente). */
const FORCE_OPEN = "force-open" in args;

/** Estado por contato (misses/escalated). Em memória — v1 local. */
const contacts = new Map();

function handleEvent(evt) {
  const type = evt.event ?? "desconhecido";
  const instance = evt.instance ?? "?";

  if (type === "connection.update" || type === "CONNECTION_UPDATE") {
    console.log(`[evento] ${instance} conexão → ${evt.data?.state ?? "?"}`);
    return null;
  }

  if (type !== "messages.upsert" && type !== "MESSAGES_UPSERT") {
    console.log(`[evento] ${instance} ${type} (ignorado)`);
    return null;
  }

  const data = evt.data ?? {};
  if (data.key?.fromMe) return null; // mensagem nossa, não responder

  const jid = data.key?.remoteJid ?? "";
  const text = data.message?.conversation ?? data.message?.extendedTextMessage?.text ?? "";
  if (!text) return null;

  const contactKey = `${instance}:${jid}`;
  if (!contacts.has(contactKey)) contacts.set(contactKey, {});
  const state = contacts.get(contactKey);

  const { intent, reply, escalate } = decide({ text, preset, state, forceOpen: FORCE_OPEN });
  console.log(
    `[msg] ${instance} de=${maskPhone(jid)} intenção=${intent}${escalate ? " → ESCALADO P/ HUMANO" : ""}${reply ? "" : " (sem resposta: humano assumiu)"}`
  );
  return reply ? { jid, reply } : null;
}

const server = createServer((req, res) => {
  if (req.method !== "POST" || !req.url.startsWith("/webhooks/evolution")) {
    res.writeHead(404).end();
    return;
  }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
    try {
      const evt = JSON.parse(body);
      const action = handleEvent(evt);
      if (action) {
        const number = action.jid.replace(/@.*$/, "");
        await sendText(evt.instance, number, action.reply);
        console.log(`[resposta] enviada para ${maskPhone(action.jid)}${dryRun ? " (dry-run)" : ""}`);
      }
    } catch (err) {
      console.error(`[erro] ${err.message}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Webhook server ouvindo em http://localhost:${PORT}/webhooks/evolution`);
  console.log(`Preset: ${preset.preset} · Evolution: ${dryRun ? "DRY-RUN (sem EVOLUTION_URL/EVOLUTION_API_KEY)" : process.env.EVOLUTION_URL}`);
});
