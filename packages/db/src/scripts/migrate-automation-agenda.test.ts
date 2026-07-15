import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { migrateAutomationAgenda } from "./migrate-automation-agenda";

function writeFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "blademidia-agenda-migration-"));
  const path = join(dir, "preset.json");
  const fixture = {
    negocio: {
      nome: "Barbearia Teste",
      servicos: [
        { nome: "Corte", duracao_min: 40, preco: 40 },
        { nome: "Barba", duracao_min: 30, preco: "PREENCHER" },
        { nome: "", duracao_min: 20, preco: 20 },
        { nome: "Sobrancelha", duracao_min: 0, preco: 10 },
      ],
      barbeiros: ["Rafael", "PREENCHER", ""],
      horario_funcionamento: {
        seg: "09:00-19:00",
        ter: "09:00-19:00",
        qua: "09:00-19:00",
        qui: "09:00-19:00",
        sex: "09:00-20:00",
        sab: "08:00-18:00",
        dom: null,
      },
    },
  };
  writeFileSync(path, JSON.stringify(fixture, null, 2));
  return path;
}

describe("migrateAutomationAgenda (dry-run, sem banco)", () => {
  it("conta serviços e barbeiros válidos, pula malformados, reporta preço não numérico", async () => {
    const jsonPath = writeFixture();
    const result = await migrateAutomationAgenda({
      slug: `dry-run-${randomUUID()}`,
      jsonPath,
      apply: false,
    });

    expect(result.servicesCreated).toBe(2); // Corte + Barba
    expect(result.barbersCreated).toBe(1); // Rafael
    expect(result.scheduleWindowsApplied).toBe(6); // 6 dias com horário (dom é null)

    expect(result.skipped.map((s) => s.reason)).toEqual(
      expect.arrayContaining([
        "nome ausente",
        "duração inválida ou ausente",
        "nome ausente ou placeholder não preenchido",
      ]),
    );
    expect(result.divergences).toHaveLength(1);
    expect(result.divergences[0]?.item).toBe("Barba");
    expect(result.divergences[0]?.note).toMatch(/preço/);
  });
});
