// Painel do CLIENTE (barbeiro) — simples, read-mostly.
// Lê ?barbershop=<slug> e mostra os dados daquela barbearia.
// Linguagem do barbeiro: "clientes", "sumido", "voltou faz tempo". Sem jargão.

const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const slug = new URLSearchParams(location.search).get("barbershop");

async function api(path) {
  const res = await fetch(path);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function diasDesde(dataISO) {
  if (!dataISO) return null;
  return Math.floor((Date.now() - new Date(dataISO)) / 86400000);
}

async function render() {
  if (!slug) {
    app.innerHTML = `<div class="error">Falta indicar a barbearia (?barbershop=slug).</div>`;
    return;
  }
  app.innerHTML = `<div class="loading">Carregando seu painel…</div>`;
  let shop, clientes;
  try {
    shop = await api("/api/barbershop?id=" + encodeURIComponent(slug));
    clientes = await api("/api/clientes?barbershop=" + encodeURIComponent(slug));
  } catch (e) {
    app.innerHTML = `<div class="error">Não consegui carregar: ${esc(e.message)}</div>`;
    return;
  }

  const sumidoKeys = new Set(shop.inativos.map((c) => c.telefone_mascarado));

  const listaSumidos = shop.inativos.length
    ? shop.inativos
        .map((c) => {
          const d = diasDesde(c.ultima_visita);
          return `<div class="item">
            <div><div class="nome">${esc(c.nome)}</div><div class="meta">${esc(c.telefone_mascarado)} · sumido faz ${d} dias</div></div>
            <span class="pill warn">reativar</span>
          </div>`;
        })
        .join("")
    : `<div class="empty">Ninguém sumido por enquanto. 👊</div>`;

  const listaTodos = clientes.length
    ? clientes
        .map((c) => {
          const sumido = sumidoKeys.has(c.telefone_mascarado);
          return `<div class="item">
            <div><div class="nome">${esc(c.nome)}</div><div class="meta">${esc(c.telefone_mascarado)} · última vez ${esc(c.ultima_visita || "—")} · ${c.visitas} visitas</div></div>
            <span class="pill ${sumido ? "warn" : "ok"}">${sumido ? "sumido" : "ativo"}</span>
          </div>`;
        })
        .join("")
    : `<div class="empty">Nenhum cliente ainda. A Blade cadastra conforme eles chegam no zap.</div>`;

  app.innerHTML = `
    <header>
      <div><div class="shop">${esc(shop.nome)}</div><div class="sub">Seu painel de clientes</div></div>
    </header>
    <div class="cards">
      <div class="tile"><div class="n">${shop.stats.total}</div><div class="l">clientes na lista</div></div>
      <div class="tile warn"><div class="n">${shop.stats.inativos}</div><div class="l">sumidos (a Blade reativa)</div></div>
    </div>
    <h2>Quem sumiu</h2>
    <div class="list">${listaSumidos}</div>
    <h2>Todos os clientes</h2>
    <div class="list">${listaTodos}</div>
    <div class="foot">Blade Mídia · o sistema cuida disso pra você, sem precisar mexer.</div>`;
}

render();
