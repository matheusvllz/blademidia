/**
 * Migração ÚNICA e IDEMPOTENTE (por barbearia) de serviços/barbeiros/horário do
 * preset da automação (`automation/presets/clientes/<slug>.json` ou o
 * `barbearia-default.json`) → módulo `agendamento` do produto (Fase 2). Irmã de
 * `migrate-automation-data.ts` (que migra clientes na Fase 1); mesmo padrão:
 * dry-run por padrão, só grava com `--apply`.
 *
 * Premissas (não confirmadas por Vítor, documentadas por serem inferências
 * razoáveis para um import de onboarding, ajustáveis depois nas telas):
 * - O `horario_funcionamento` do preset é do NEGÓCIO, não por barbeiro. Todo
 *   barbeiro importado recebe a MESMA grade — refinável depois em
 *   Configurações → Barbeiros & Horários.
 * - Preço de serviço não numérico no preset (ex.: "PREENCHER") vira serviço
 *   SEM preço de tabela (nulo), reportado como divergência informativa — não
 *   bloqueia a criação do serviço (duração é o único campo obrigatório extra).
 *
 * Uso:
 *   tsx src/scripts/migrate-automation-agenda.ts --barbershop-slug=<slug> [--json-path=...] [--apply]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";
import { getOrCreateBarbershopBySlug } from "../repositories/barbershops";
import { createBarber, listBarbers } from "../repositories/barbers";
import { createService, listServices } from "../repositories/services";
import { setWorkSchedules, type WorkScheduleWindow } from "../repositories/work-schedules";

interface AutomationServico {
  nome: string;
  duracao_min: number;
  preco: string | number;
}

interface AutomationNegocio {
  nome: string;
  servicos: AutomationServico[];
  barbeiros: string[];
  horario_funcionamento: Record<string, string | null>;
}

interface AutomationPreset {
  negocio: AutomationNegocio;
}

const WEEKDAY_BY_KEY: Record<string, number> = {
  dom: 0,
  seg: 1,
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sab: 6,
};

export interface MigrationOptions {
  slug: string;
  jsonPath: string;
  apply: boolean;
}

export interface MigrationResult {
  servicesCreated: number;
  barbersCreated: number;
  scheduleWindowsApplied: number;
  skipped: { item: string; reason: string }[];
  divergences: { item: string; note: string }[];
}

function parsePriceCents(preco: string | number): number | null {
  const value = typeof preco === "number" ? preco : Number(String(preco).replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function parseWindows(horario: Record<string, string | null>): WorkScheduleWindow[] {
  const windows: WorkScheduleWindow[] = [];
  for (const [key, range] of Object.entries(horario)) {
    const weekday = WEEKDAY_BY_KEY[key];
    if (weekday === undefined || !range) continue;
    const [startTime, endTime] = range.split("-");
    if (!startTime || !endTime) continue;
    windows.push({ weekday, startTime, endTime });
  }
  return windows;
}

export async function migrateAutomationAgenda(options: MigrationOptions): Promise<MigrationResult> {
  const raw = readFileSync(resolve(options.jsonPath), "utf8");
  const preset = JSON.parse(raw) as AutomationPreset;
  const negocio = preset.negocio;

  const result: MigrationResult = {
    servicesCreated: 0,
    barbersCreated: 0,
    scheduleWindowsApplied: 0,
    skipped: [],
    divergences: [],
  };

  const barbershopId = options.apply
    ? (await getOrCreateBarbershopBySlug(options.slug, negocio.nome)).id
    : null;

  const existingServiceNames = new Set(
    options.apply ? (await listServices(barbershopId!)).map((s) => s.name.trim().toLowerCase()) : [],
  );
  const existingBarberNames = new Set(
    options.apply ? (await listBarbers(barbershopId!)).map((b) => b.name.trim().toLowerCase()) : [],
  );

  // --- Serviços ---
  for (const servico of negocio.servicos ?? []) {
    const name = servico.nome?.trim();
    if (!name) {
      result.skipped.push({ item: "(serviço sem nome)", reason: "nome ausente" });
      continue;
    }
    if (!Number.isInteger(servico.duracao_min) || servico.duracao_min <= 0) {
      result.skipped.push({ item: name, reason: "duração inválida ou ausente" });
      continue;
    }
    if (existingServiceNames.has(name.toLowerCase())) {
      result.skipped.push({ item: name, reason: "já migrado anteriormente (idempotência)" });
      continue;
    }

    const priceCents = parsePriceCents(servico.preco);
    if (priceCents === null) {
      result.divergences.push({ item: name, note: `preço "${servico.preco}" não numérico — serviço criado sem preço de tabela` });
    }

    if (options.apply) {
      const created = await createService(barbershopId!, { name, durationMin: servico.duracao_min, priceCents });
      if (created.error) {
        result.skipped.push({ item: name, reason: `não foi possível criar (${created.error})` });
        continue;
      }
    }
    result.servicesCreated += 1;
  }

  // --- Barbeiros + grade (mesma grade do negócio para todos, ver Premissa) ---
  const windows = parseWindows(negocio.horario_funcionamento ?? {});
  for (const rawName of negocio.barbeiros ?? []) {
    const name = rawName?.trim();
    if (!name || name.toUpperCase() === "PREENCHER") {
      result.skipped.push({ item: rawName ?? "(vazio)", reason: "nome ausente ou placeholder não preenchido" });
      continue;
    }
    if (existingBarberNames.has(name.toLowerCase())) {
      result.skipped.push({ item: name, reason: "já migrado anteriormente (idempotência)" });
      continue;
    }

    if (options.apply) {
      const created = await createBarber(barbershopId!, { name });
      if (created.error) {
        result.skipped.push({ item: name, reason: `não foi possível criar (${created.error})` });
        continue;
      }
      if (windows.length > 0) {
        await setWorkSchedules(barbershopId!, created.barber.id, windows);
        result.scheduleWindowsApplied += windows.length;
      }
    } else if (windows.length > 0) {
      result.scheduleWindowsApplied += windows.length;
    }
    result.barbersCreated += 1;
  }

  return result;
}

function parseArgs(rawArgv: string[]): MigrationOptions {
  const get = (flag: string): string | undefined => {
    const found = rawArgv.find((a) => a.startsWith(`--${flag}=`));
    return found ? found.slice(flag.length + 3) : undefined;
  };

  const slug = get("barbershop-slug");
  if (!slug) {
    console.error(
      "Uso: tsx src/scripts/migrate-automation-agenda.ts --barbershop-slug=<slug> " +
        "[--json-path=automation/presets/clientes/<slug>.json] [--apply]",
    );
    process.exit(1);
  }

  return {
    slug,
    jsonPath: get("json-path") ?? `automation/presets/clientes/${slug}.json`,
    apply: rawArgv.includes("--apply"),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await migrateAutomationAgenda(options);

  console.log(
    options.apply
      ? "Modo: APLICADO (dados gravados no Postgres)"
      : "Modo: DRY-RUN — nada foi gravado. Rode de novo com --apply para gravar de verdade.",
  );
  console.log(`Serviços migrados: ${result.servicesCreated}`);
  console.log(`Barbeiros migrados: ${result.barbersCreated}`);
  console.log(`Janelas de grade aplicadas: ${result.scheduleWindowsApplied}`);
  if (result.divergences.length > 0) {
    console.log(`Divergências (${result.divergences.length}):`);
    for (const d of result.divergences) console.log(`  - ${d.item}: ${d.note}`);
  }
  if (result.skipped.length > 0) {
    console.log(`Registros pulados (${result.skipped.length}):`);
    for (const s of result.skipped) console.log(`  - ${s.item}: ${s.reason}`);
  }
}

const invokedPath = argv[1] ? resolve(argv[1]) : "";
const thisPath = resolve(fileURLToPath(import.meta.url));
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
