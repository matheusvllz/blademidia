/**
 * Migração única (por barbearia) de automation/data/db.json → produto.
 * Dry-run por padrão; só grava com --apply (design.md, Decision 4).
 *
 * Nuance de privacidade encontrada: `automation/lib/store.mjs` guarda o
 * telefone mascarado no campo `telefone_mascarado`, mas usa o telefone
 * completo (só dígitos) como CHAVE do objeto `clientes` — o número integral
 * está fisicamente no arquivo, mesmo que nenhum campo "visível" o exponha.
 * Esta migração lê essa chave para recuperar o telefone real. Vale reportar
 * isso a Vítor: a regra "nunca guardar telefone completo" não é honrada pela
 * chave do JSON, só pelos campos de valor.
 *
 * Uso:
 *   tsx src/scripts/migrate-automation-data.ts --barbershop-slug=<slug> [--json-path=...] [--apply]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";
import { createClient, findClientByPhone } from "../repositories/clients";
import { getOrCreateBarbershopBySlug } from "../repositories/barbershops";
import { registerVisit } from "../repositories/visits";

interface AutomationCliente {
  telefone_mascarado: string;
  nome: string;
  ultima_visita: string | null;
  visitas: number;
  criado_em: string | null;
}

interface AutomationBarbershop {
  id: string;
  nome: string;
  clientes: Record<string, AutomationCliente>;
}

interface AutomationDb {
  barbershops: Record<string, AutomationBarbershop>;
}

export interface MigrationOptions {
  slug: string;
  jsonPath: string;
  apply: boolean;
}

export interface MigrationResult {
  imported: number;
  skipped: { phoneKey: string; reason: string }[];
}

const MIN_PHONE_DIGITS = 8;

export async function migrateAutomationData(options: MigrationOptions): Promise<MigrationResult> {
  const raw = readFileSync(resolve(options.jsonPath), "utf8");
  const parsed = JSON.parse(raw) as AutomationDb;
  const source = parsed.barbershops[options.slug];

  if (!source) {
    throw new Error(`Barbearia "${options.slug}" não encontrada em ${options.jsonPath}`);
  }

  const result: MigrationResult = { imported: 0, skipped: [] };

  const barbershopId = options.apply
    ? (await getOrCreateBarbershopBySlug(options.slug, source.nome)).id
    : null;

  for (const [phoneKey, cliente] of Object.entries(source.clientes)) {
    const phoneDigits = phoneKey.replace(/\D/g, "");

    if (!cliente.nome?.trim()) {
      result.skipped.push({ phoneKey, reason: "nome ausente" });
      continue;
    }
    if (phoneDigits.length < MIN_PHONE_DIGITS) {
      result.skipped.push({ phoneKey, reason: "telefone inválido" });
      continue;
    }

    if (!options.apply) {
      result.imported += 1;
      continue;
    }

    const existing = await findClientByPhone(barbershopId!, phoneDigits);
    if (existing) {
      result.skipped.push({ phoneKey, reason: "já migrado anteriormente (idempotência)" });
      continue;
    }

    const notes = `Migrado de automation/ em ${new Date().toISOString().slice(0, 10)} — ${cliente.visitas} visita(s) registrada(s) antes da migração.`;
    const created = await createClient(barbershopId!, { name: cliente.nome, phone: phoneDigits, notes });

    if (created.error) {
      result.skipped.push({ phoneKey, reason: `não foi possível criar (${created.error})` });
      continue;
    }

    if (cliente.ultima_visita) {
      await registerVisit(barbershopId!, created.client.id, {
        serviceLabel: "Migrado da operação (resumo, sem detalhe por visita)",
        occurredAt: new Date(cliente.ultima_visita),
      });
    }

    result.imported += 1;
  }

  return result;
}

function parseArgs(argv: string[]): MigrationOptions {
  const get = (flag: string): string | undefined => {
    const found = argv.find((a) => a.startsWith(`--${flag}=`));
    return found ? found.slice(flag.length + 3) : undefined;
  };

  const slug = get("barbershop-slug");
  if (!slug) {
    console.error(
      "Uso: tsx src/scripts/migrate-automation-data.ts --barbershop-slug=<slug> " +
        "[--json-path=automation/data/db.json] [--apply]",
    );
    process.exit(1);
  }

  return {
    slug,
    jsonPath: get("json-path") ?? "automation/data/db.json",
    apply: argv.includes("--apply"),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await migrateAutomationData(options);

  console.log(
    options.apply
      ? "Modo: APLICADO (dados gravados no Postgres)"
      : "Modo: DRY-RUN — nada foi gravado. Rode de novo com --apply para gravar de verdade.",
  );
  console.log(`Clientes migrados: ${result.imported}`);
  if (result.skipped.length > 0) {
    console.log(`Registros pulados (${result.skipped.length}):`);
    for (const s of result.skipped) {
      console.log(`  - ${s.phoneKey}: ${s.reason}`);
    }
  }
}

// Detecção cross-platform de "rodado direto" (não importado) — comparar paths
// resolvidos, não strings de URL (no Windows os formatos file:// divergem).
const invokedPath = argv[1] ? resolve(argv[1]) : "";
const thisPath = resolve(fileURLToPath(import.meta.url));
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
