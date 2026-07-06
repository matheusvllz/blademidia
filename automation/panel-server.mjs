/**
 * Painel da Agência — servidor local (Node puro, sem dependências).
 * Organização + CRM das barbearias: cadastro de tenant, clientes finais,
 * detecção de inativos (reativação), status de conexão.
 *
 * Uso:  node automation/panel-server.mjs [--port=4545]
 * Abre:  http://localhost:4545
 *
 * Dados em automation/data/db.json (escopo por barbershop_id — ADR-0007).
 * Nunca expõe telefone completo (só ***4dígitos).
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import * as store from "./lib/store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const PORT = Number(args.port ?? process.env.PANEL_PORT ?? 4545);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function json(res, code, body) {
  const s = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(s) });
  res.end(s);
}

function body(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function todayISO() {
  // O relógio é lido aqui (fronteira do servidor), não nos módulos de dados.
  return new Date().toISOString();
}

const routes = {
  "GET /api/barbershops": () => ({ code: 200, body: store.listBarbershops() }),

  "POST /api/barbershops": async (req) => {
    const b = await body(req);
    if (!b.id || !b.nome) return { code: 400, body: { error: "id e nome são obrigatórios" } };
    return { code: 200, body: store.upsertBarbershop(b, todayISO()) };
  },

  "GET /api/barbershop": (req, url) => {
    const id = url.searchParams.get("id");
    const b = store.getBarbershop(id);
    if (!b) return { code: 404, body: { error: "não encontrada" } };
    const hoje = todayISO();
    return { code: 200, body: { ...b, stats: store.stats(id, hoje), inativos: store.clientesInativos(id, 21, hoje) } };
  },

  "GET /api/clientes": (req, url) => {
    const id = url.searchParams.get("barbershop");
    try {
      return { code: 200, body: store.listClientes(id) };
    } catch (e) {
      return { code: 400, body: { error: e.message } };
    }
  },

  "POST /api/clientes": async (req, url) => {
    const id = url.searchParams.get("barbershop");
    const c = await body(req);
    if (!c.telefone || !c.nome) return { code: 400, body: { error: "telefone e nome são obrigatórios" } };
    try {
      return { code: 200, body: store.upsertCliente(id, c, todayISO()) };
    } catch (e) {
      return { code: 400, body: { error: e.message } };
    }
  },

  "POST /api/visita": async (req, url) => {
    const id = url.searchParams.get("barbershop");
    const c = await body(req);
    try {
      return { code: 200, body: store.registrarVisita(id, c.telefone, c.data ?? todayISO().slice(0, 10), todayISO()) };
    } catch (e) {
      return { code: 400, body: { error: e.message } };
    }
  },
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const key = `${req.method} ${url.pathname}`;

  if (routes[key]) {
    const { code, body } = await routes[key](req, url);
    return json(res, code, body);
  }

  // Painel do CLIENTE (barbeiro): /cliente[/...] servido de automation/client-panel/
  // Painel da AGÊNCIA: tudo o mais, servido de automation/panel/
  const isCliente = url.pathname === "/cliente" || url.pathname.startsWith("/cliente/");
  const baseDir = isCliente ? "client-panel" : "panel";
  let file = url.pathname.replace(/^\/cliente/, "") || "/";
  if (file === "/") file = "/index.html";
  const root = join(HERE, baseDir);
  const path = join(root, file);
  if (!path.startsWith(root)) return json(res, 403, { error: "forbidden" });
  try {
    const data = readFileSync(path);
    res.writeHead(200, { "Content-Type": MIME[extname(path)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    json(res, 404, { error: "not found" });
  }
});

server.listen(PORT, () => {
  console.log(`Painel da Agência em http://localhost:${PORT}`);
  console.log(`Dados: automation/data/db.json`);
});
