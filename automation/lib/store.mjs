/**
 * Camada de dados local do painel da agência — JSON em automation/data/.
 * Sem banco, sem Docker: roda em Node puro. É a base de organização/CRM da v1
 * (quando o produto SaaS existir, esta camada é substituída pelo Postgres/Drizzle).
 *
 * Regra do repositório (ADR-0007): TODO acesso a dado de negócio é escopado por
 * barbershop_id. Aqui isso é garantido pelas funções — não há leitura global de
 * clientes sem passar o id da barbearia.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const DB_FILE = join(DATA_DIR, "db.json");

const EMPTY = { barbershops: {}, updated_at: null };

function read() {
  if (!existsSync(DB_FILE)) return structuredClone(EMPTY);
  try {
    return JSON.parse(readFileSync(DB_FILE, "utf8"));
  } catch {
    return structuredClone(EMPTY);
  }
}

function write(db, now) {
  mkdirSync(DATA_DIR, { recursive: true });
  db.updated_at = now ?? db.updated_at;
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  return db;
}

/** Mascara telefone: guarda só os 4 últimos dígitos (regra: nunca telefone completo). */
export function maskPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return digits.length <= 4 ? `***${digits}` : `***${digits.slice(-4)}`;
}

// ── Barbearias (tenants) ──────────────────────────────────────────────
export function listBarbershops() {
  const db = read();
  return Object.values(db.barbershops).sort((a, b) => a.nome.localeCompare(b.nome));
}

export function getBarbershop(id) {
  return read().barbershops[id] ?? null;
}

export function upsertBarbershop({ id, nome, preset = "barbearia-default", status = "onboarding", plano = "pro" }, now) {
  const db = read();
  const existing = db.barbershops[id];
  db.barbershops[id] = {
    id,
    nome,
    preset,
    status, // onboarding | ativo | suspenso | cancelado
    plano,
    connection_status: existing?.connection_status ?? "desconectado",
    created_at: existing?.created_at ?? now,
    clientes: existing?.clientes ?? {},
  };
  write(db, now);
  return db.barbershops[id];
}

export function setConnectionStatus(id, connection_status, now) {
  const db = read();
  if (!db.barbershops[id]) throw new Error(`Barbearia "${id}" não existe`);
  db.barbershops[id].connection_status = connection_status;
  write(db, now);
  return db.barbershops[id];
}

// ── Clientes finais (CRM) — sempre escopado por barbershop_id ──────────
export function listClientes(barbershopId) {
  const b = getBarbershop(barbershopId);
  if (!b) throw new Error(`Barbearia "${barbershopId}" não existe`);
  return Object.values(b.clientes).sort((a, b) => (b.ultima_visita ?? "").localeCompare(a.ultima_visita ?? ""));
}

export function upsertCliente(barbershopId, { telefone, nome, ultima_visita = null, visitas = 0 }, now) {
  const db = read();
  const b = db.barbershops[barbershopId];
  if (!b) throw new Error(`Barbearia "${barbershopId}" não existe`);
  const key = String(telefone).replace(/\D/g, "");
  const existing = b.clientes[key];
  b.clientes[key] = {
    telefone_mascarado: maskPhone(telefone),
    nome,
    ultima_visita: ultima_visita ?? existing?.ultima_visita ?? null,
    visitas: visitas || existing?.visitas || 0,
    criado_em: existing?.criado_em ?? now,
  };
  write(db, now);
  return b.clientes[key];
}

/** Registra uma visita hoje (incrementa contador, atualiza última visita). */
export function registrarVisita(barbershopId, telefone, dataISO, now) {
  const db = read();
  const b = db.barbershops[barbershopId];
  if (!b) throw new Error(`Barbearia "${barbershopId}" não existe`);
  const key = String(telefone).replace(/\D/g, "");
  const c = b.clientes[key];
  if (!c) throw new Error(`Cliente não encontrado nessa barbearia`);
  c.visitas += 1;
  c.ultima_visita = dataISO;
  write(db, now);
  return c;
}

/**
 * Clientes inativos há N+ dias (a mecânica de reativação prometida).
 * `hojeISO` entra por parâmetro — este módulo não lê o relógio (determinístico/testável).
 */
export function clientesInativos(barbershopId, dias, hojeISO) {
  const hoje = new Date(hojeISO);
  return listClientes(barbershopId).filter((c) => {
    if (!c.ultima_visita) return false;
    const diff = Math.floor((hoje - new Date(c.ultima_visita)) / 86400000);
    return diff >= dias;
  });
}

export function stats(barbershopId, hojeISO, diasReativacao = 21) {
  const clientes = listClientes(barbershopId);
  const inativos = clientesInativos(barbershopId, diasReativacao, hojeISO);
  return {
    total: clientes.length,
    ativos: clientes.length - inativos.length,
    inativos: inativos.length,
  };
}
