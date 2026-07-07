/**
 * VERIFICAÇÃO PRÉ-VENDA — prova em um comando que a estrutura está pronta.
 *
 * Uso:  node automation/check.mjs
 *
 * Sai com código 0 se tudo verde. Rode antes de qualquer demo/onboarding.
 * Checagens de Evolution só rodam se houver um Evolution acessível
 * (EVOLUTION_URL ou localhost:8080) — sem ele, marcam "pulado", não erro,
 * porque a estrutura local não depende dele para estar íntegra.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, extra = "") => results.push({ name, status: "✓", extra });
const fail = (name, extra = "") => results.push({ name, status: "✗", extra });
const skip = (name, extra = "") => results.push({ name, status: "–", extra });

// 1. Node 18+ (fetch nativo)
const major = Number(process.versions.node.split(".")[0]);
major >= 18 ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node}`, "precisa 18+");

// 2. Módulos importam sem erro
let presets, engine, store;
try {
  presets = await import("./lib/presets.mjs");
  engine = await import("./lib/engine.mjs");
  store = await import("./lib/store.mjs");
  await import("./lib/evolution.mjs");
  ok("Módulos (presets/engine/store/evolution) importam");
} catch (e) {
  fail("Import de módulos", e.message);
}

// 3. Preset padrão íntegro
try {
  const p = presets.loadPreset("barbearia-default");
  const temResposta = ["saudacao", "agendamento", "precos", "confirmacao_24h", "reativacao_21d", "fora_de_horario", "fallback_humano"].every(
    (k) => typeof p.respostas[k] === "string" && p.respostas[k].length > 10
  );
  const temWarmup = p.warmup?.dia_1 > 0 && p.regras?.reativacao_dias_sem_visita > 0;
  temResposta && temWarmup
    ? ok("Preset barbearia-default completo", "7 respostas + warm-up + regras")
    : fail("Preset barbearia-default", "faltam respostas/regras");
} catch (e) {
  fail("Preset barbearia-default", e.message);
}

// 4. Motor de intenções (suite mínima)
try {
  const cases = [
    ["quanto tá o corte?", "precos"],
    ["quero marcar um corte", "agendamento"],
    ["oi, tudo certo?", "saudacao"],
    ["qual o valor da barba?", "precos"],
    ["tem horário amanhã?", "agendamento"],
  ];
  const bad = cases.filter(([t, e]) => engine.detectIntent(t) !== e);
  bad.length === 0 ? ok("Motor de intenções", `${cases.length}/${cases.length} casos`) : fail("Motor de intenções", `${bad.length} casos errados`);

  // escalação: 2 sem-match → humano assume, depois silêncio
  const p = presets.loadPreset("barbearia-default");
  const st = {};
  engine.decide({ text: "vcs vendem pomada?", preset: p, state: st, forceOpen: true });
  const r2 = engine.decide({ text: "aquela azul", preset: p, state: st, forceOpen: true });
  const r3 = engine.decide({ text: "e aí?", preset: p, state: st, forceOpen: true });
  r2.escalate && r3.reply === null ? ok("Escalação p/ humano", "2 sem-match → escala e silencia") : fail("Escalação p/ humano");
} catch (e) {
  fail("Motor de intenções", e.message);
}

// 5. Mascaramento de telefone (regra dura do repo)
try {
  store.maskPhone("5561999887766") === "***7766" ? ok("Mascaramento de telefone", "***7766") : fail("Mascaramento de telefone");
} catch (e) {
  fail("Mascaramento", e.message);
}

// 6. Superfícies existem (painéis + site + infra)
const files = [
  ["panel/index.html", "Painel da agência"],
  ["panel/app.js", "Painel da agência (app)"],
  ["client-panel/index.html", "Painel do cliente"],
  ["client-panel/app.js", "Painel do cliente (app)"],
  ["webhook-server.mjs", "Motor (webhook server)"],
  ["provision.mjs", "Provisionamento"],
  ["../infra/stack/docker-compose.yml", "Preset Docker full-stack (VPS)"],
  ["../infra/evolution/docker-compose.local.yml", "Compose local do Evolution"],
  ["../site/index.html", "Site (landing)"],
];
for (const [rel, label] of files) {
  existsSync(join(HERE, rel)) ? ok(label) : fail(label, `${rel} ausente`);
}

// 7. Form de captação declarado no site (leads)
try {
  const html = readFileSync(join(HERE, "..", "site", "index.html"), "utf8");
  html.includes('data-netlify="true"') && html.includes('name="diagnostico"')
    ? ok("Form de captação de leads no site", "diagnostico + data-netlify")
    : fail("Form de captação", "form estático do Netlify não encontrado no index.html");
} catch (e) {
  fail("Form de captação", e.message);
}

// 8. Evolution acessível? (opcional — estrutura não depende disso p/ estar pronta)
const evoUrl = process.env.EVOLUTION_URL ?? "http://localhost:8080";
try {
  const res = await fetch(evoUrl, { signal: AbortSignal.timeout(3000) });
  const info = await res.json();
  ok(`Evolution API acessível (${evoUrl})`, `v${info.version}`);
} catch {
  skip(`Evolution API (${evoUrl})`, "não está rodando agora — ok, sobe via Docker quando precisar");
}

// ── Relatório ──────────────────────────────────────────────────────────
const failed = results.filter((r) => r.status === "✗");
console.log("\n══ VERIFICAÇÃO PRÉ-VENDA — BLADE MÍDIA ══\n");
for (const r of results) console.log(` ${r.status} ${r.name}${r.extra ? `  · ${r.extra}` : ""}`);
console.log(
  failed.length === 0
    ? `\n✔ TUDO PRONTO (${results.filter((r) => r.status === "✓").length} checks verdes${results.some((r) => r.status === "–") ? ", Evolution pulado" : ""}). Estrutura pronta pra vender e configurar cliente com preset.\n`
    : `\n✘ ${failed.length} problema(s) acima — resolver antes de vender.\n`
);
process.exit(failed.length === 0 ? 0 : 1);
