/**
 * Provisiona um tenant novo (barbearia) no Evolution API a partir de um preset.
 * Cria a instance, configura o webhook e salva o QR code para o barbeiro escanear.
 *
 * Uso:  node automation/provision.mjs <slug-do-cliente> [--preset=barbearia-default] [--webhook=http://host.docker.internal:3333/webhooks/evolution]
 * Ex.:  node automation/provision.mjs barbearia-do-leo
 *
 * Requer EVOLUTION_URL e EVOLUTION_API_KEY no ambiente (sem eles roda em dry-run).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPreset } from "./lib/presets.mjs";
import { createInstance, dryRun } from "./lib/evolution.mjs";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "out");

const [slug] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.replace(/^--/, "").split("=")));

if (!slug) {
  console.error("Uso: node automation/provision.mjs <slug-do-cliente> [--preset=...] [--webhook=...]");
  process.exit(1);
}

const preset = loadPreset(args.preset ?? "barbearia-default");
const instanceName = `${preset.instancia.prefixo}-${slug}`;
const webhookUrl = args.webhook ?? "http://host.docker.internal:3333/webhooks/evolution";

console.log(`Provisionando tenant "${slug}" → instance "${instanceName}"`);
console.log(`Webhook: ${webhookUrl} · Eventos: ${preset.instancia.webhook_eventos.join(", ")}`);
if (dryRun) console.log("(dry-run: defina EVOLUTION_URL e EVOLUTION_API_KEY para provisionar de verdade)");

const result = await createInstance({
  instanceName,
  webhookUrl,
  webhookEvents: preset.instancia.webhook_eventos,
});

const qrBase64 = result?.qrcode?.base64 ?? null;
if (qrBase64) {
  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, `qr-${instanceName}.png`);
  writeFileSync(file, Buffer.from(qrBase64.replace(/^data:image\/png;base64,/, ""), "base64"));
  console.log(`\nQR salvo em: ${file}`);
  console.log("Próximo passo: o barbeiro abre WhatsApp → Dispositivos vinculados → escaneia o QR.");
} else if (!dryRun) {
  console.log("Instance criada, mas sem QR na resposta — consulte GET /instance/connect/" + instanceName);
}
console.log(`\nLembrete warm-up (anti-ban): máx ${preset.warmup.dia_1} envios no dia 1, ${preset.warmup.dia_2} no dia 2, ${preset.warmup.dia_3_a_7} até o dia 7.`);
