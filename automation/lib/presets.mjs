import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PRESETS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "presets");

export function loadPreset(name = "barbearia-default") {
  const candidates = [
    join(PRESETS_DIR, "clientes", `${name}.json`),
    join(PRESETS_DIR, `${name}.json`),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) {
    throw new Error(`Preset "${name}" não encontrado. Procurado em: ${candidates.join(" | ")}`);
  }
  const preset = JSON.parse(readFileSync(path, "utf8"));
  for (const key of ["negocio", "respostas", "regras", "warmup"]) {
    if (!preset[key]) throw new Error(`Preset "${name}" inválido: falta o bloco "${key}"`);
  }
  return preset;
}

/** Substitui {{caminho.de.chave}} pelos valores do contexto (preset + extras). */
export function renderTemplate(template, context) {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
    const value = path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), context);
    return value == null ? `{{${path}}}` : String(value);
  });
}

export function listaServicos(preset) {
  return preset.negocio.servicos
    .map((s) => `${s.nome} R$${s.preco} (${s.duracao_min}min)`)
    .join(" · ");
}
