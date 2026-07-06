/**
 * Simulador de conversa — testa o fluxo completo SEM WhatsApp, Docker ou VPS.
 * Dispara eventos no formato do Evolution API contra o webhook-server local
 * e mostra o que o motor decidiu para cada mensagem.
 *
 * Uso:
 *   1. Terminal A: node automation/webhook-server.mjs
 *   2. Terminal B: node automation/simulate.mjs [--port=3333]
 */

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const URL = `http://localhost:${args.port ?? 3333}/webhooks/evolution`;

const ROTEIRO = [
  { de: "5561999990001", texto: "oi, tudo certo?" },
  { de: "5561999990001", texto: "quero marcar um corte com barba pra amanhã" },
  { de: "5561999990002", texto: "quanto tá o corte?" },
  { de: "5561999990003", texto: "vcs vendem pomada?" },
  { de: "5561999990003", texto: "aquela azul da promoção" },
  { de: "5561999990003", texto: "e aí, alguém?" },
];

function evento(de, texto) {
  return {
    event: "messages.upsert",
    instance: "blade-simulacao",
    data: {
      key: { remoteJid: `${de}@s.whatsapp.net`, fromMe: false, id: `SIM${Date.now()}` },
      message: { conversation: texto },
    },
  };
}

console.log(`Disparando ${ROTEIRO.length} mensagens simuladas contra ${URL}\n`);
for (const [i, msg] of ROTEIRO.entries()) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(evento(msg.de, msg.texto)),
  }).catch((e) => ({ ok: false, statusText: e.message }));
  console.log(`${i + 1}. [***${msg.de.slice(-4)}] "${msg.texto}" → HTTP ${res.status ?? "ERRO"} ${res.ok ? "✓" : res.statusText}`);
  await new Promise((r) => setTimeout(r, 150));
}
console.log("\nConfira no terminal do webhook-server as intenções detectadas e as respostas (dry-run).");
