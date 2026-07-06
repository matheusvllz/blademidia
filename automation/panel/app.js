// Painel da Agência — front-end vanilla (sem framework, sem build).
// Consome a API do panel-server.mjs. Tudo em PT-BR, vocabulário do barbeiro.

const app = document.getElementById("app");
const el = (html) => {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstElementChild;
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const connBadge = (s) => {
  const map = {
    conectado: ["ok", "conectado"],
    desconectado: ["off", "desconectado"],
    precisa_reconectar: ["warn", "reconectar"],
  };
  const [cls, txt] = map[s] || ["", s];
  return `<span class="badge ${cls}">${txt}</span>`;
};
const statusBadge = (s) => {
  const map = { ativo: "ok", onboarding: "warn", suspenso: "off", cancelado: "off" };
  return `<span class="badge ${map[s] || ""}">${s}</span>`;
};

// ── Tela: lista de barbearias ─────────────────────────────────────────
async function viewList() {
  app.innerHTML = '<div class="loading">Carregando barbearias…</div>';
  let shops;
  try {
    shops = await api("GET", "/api/barbershops");
  } catch (e) {
    app.innerHTML = `<div class="error">Erro ao carregar: ${esc(e.message)}</div>`;
    return;
  }

  const cards = shops.length
    ? `<div class="shop-grid">${shops
        .map(
          (s) => `
      <div class="card click" data-id="${esc(s.id)}">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
          <div class="shop-name">${esc(s.nome)}</div>
          ${statusBadge(s.status)}
        </div>
        <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center">
          <span class="mono" style="font-size:11px;color:var(--wire)">preset: ${esc(s.preset)}</span>
          ${connBadge(s.connection_status)}
        </div>
      </div>`
        )
        .join("")}</div>`
    : `<div class="empty">Nenhuma barbearia cadastrada ainda.<br />Cadastre a primeira abaixo.</div>`;

  app.innerHTML = `
    <div class="eyebrow">— Carteira de clientes</div>
    <h2>Barbearias</h2>
    <p class="muted">${shops.length} ${shops.length === 1 ? "barbearia" : "barbearias"} na operação.</p>
    ${cards}
    <section class="card">
      <div class="eyebrow" style="margin-bottom:10px">Cadastrar barbearia</div>
      <div class="form">
        <input id="f-id" placeholder="slug (ex: barbearia-do-leo)" style="width:220px" />
        <input id="f-nome" placeholder="Nome da barbearia" style="width:220px" />
        <button class="btn" id="f-add">Adicionar →</button>
      </div>
    </section>`;

  app.querySelectorAll(".card.click").forEach((c) => (c.onclick = () => viewShop(c.dataset.id)));
  app.querySelector("#f-add").onclick = async () => {
    const id = app.querySelector("#f-id").value.trim();
    const nome = app.querySelector("#f-nome").value.trim();
    if (!id || !nome) return alert("Preencha slug e nome.");
    try {
      await api("POST", "/api/barbershops", { id, nome });
      viewList();
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };
}

// ── Tela: detalhe de uma barbearia (CRM) ──────────────────────────────
async function viewShop(id) {
  app.innerHTML = '<div class="loading">Carregando…</div>';
  let shop, clientes;
  try {
    shop = await api("GET", "/api/barbershop?id=" + encodeURIComponent(id));
    clientes = await api("GET", "/api/clientes?barbershop=" + encodeURIComponent(id));
  } catch (e) {
    app.innerHTML = `<div class="error">Erro: ${esc(e.message)}</div>`;
    return;
  }

  const inativoKeys = new Set(shop.inativos.map((c) => c.telefone_mascarado));
  const linhas = clientes.length
    ? clientes
        .map(
          (c) => `
      <tr class="${inativoKeys.has(c.telefone_mascarado) ? "inativo" : ""}">
        <td>${esc(c.nome)}</td>
        <td><span class="mono">${esc(c.telefone_mascarado)}</span></td>
        <td><span class="mono">${esc(c.ultima_visita || "—")}</span></td>
        <td>${c.visitas}</td>
        <td>${inativoKeys.has(c.telefone_mascarado) ? '<span class="badge warn">reativar</span>' : '<span class="badge ok">ativo</span>'}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="empty" style="padding:28px">Nenhum cliente cadastrado nesta barbearia ainda.</td></tr>`;

  app.innerHTML = `
    <button class="back" id="back">← Voltar</button>
    <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap">
      <div>
        <div class="eyebrow">— ${esc(shop.preset)}</div>
        <h2>${esc(shop.nome)}</h2>
      </div>
      <div style="display:flex;gap:8px;align-items:center">${statusBadge(shop.status)} ${connBadge(shop.connection_status)}</div>
    </div>
    <div class="stat-row">
      <div class="stat"><div class="n">${shop.stats.total}</div><div class="l">clientes</div></div>
      <div class="stat"><div class="n">${shop.stats.ativos}</div><div class="l">ativos</div></div>
      <div class="stat warn"><div class="n">${shop.stats.inativos}</div><div class="l">p/ reativar (21+ dias)</div></div>
    </div>
    <section>
      <div class="eyebrow">Clientes</div>
      <table>
        <thead><tr><th>Nome</th><th>Zap</th><th>Última visita</th><th>Visitas</th><th>Status</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </section>
    <section class="card">
      <div class="eyebrow" style="margin-bottom:10px">Adicionar cliente</div>
      <div class="form">
        <input id="c-nome" placeholder="Nome" style="width:180px" />
        <input id="c-tel" placeholder="WhatsApp" style="width:170px" />
        <input id="c-data" type="date" style="width:160px" />
        <button class="btn" id="c-add">Adicionar →</button>
      </div>
      <p class="muted mono" style="font-size:11px;margin-top:10px">O zap é guardado mascarado (só os 4 últimos dígitos).</p>
    </section>`;

  app.querySelector("#back").onclick = viewList;
  app.querySelector("#c-add").onclick = async () => {
    const nome = app.querySelector("#c-nome").value.trim();
    const telefone = app.querySelector("#c-tel").value.trim();
    const ultima_visita = app.querySelector("#c-data").value || null;
    if (!nome || !telefone) return alert("Preencha nome e zap.");
    try {
      await api("POST", "/api/clientes?barbershop=" + encodeURIComponent(id), { nome, telefone, ultima_visita });
      viewShop(id);
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };
}

viewList();
