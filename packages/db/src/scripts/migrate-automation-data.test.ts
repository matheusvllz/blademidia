import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrateAutomationData } from "./migrate-automation-data";

function writeFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "blademidia-migration-"));
  const path = join(dir, "db.json");
  const fixture = {
    barbershops: {
      "barbearia-teste": {
        id: "barbearia-teste",
        nome: "Barbearia Teste",
        clientes: {
          "5561999990001": {
            telefone_mascarado: "***0001",
            nome: "Rafael",
            ultima_visita: "2026-06-01",
            visitas: 5,
            criado_em: "2026-01-01",
          },
          "5561999990002": {
            telefone_mascarado: "***0002",
            nome: "",
            ultima_visita: null,
            visitas: 0,
            criado_em: "2026-01-01",
          },
          "123": {
            telefone_mascarado: "***123",
            nome: "Telefone Curto Demais",
            ultima_visita: null,
            visitas: 1,
            criado_em: "2026-01-01",
          },
        },
      },
    },
  };
  writeFileSync(path, JSON.stringify(fixture, null, 2));
  return path;
}

describe("migrateAutomationData (dry-run, sem banco)", () => {
  it("conta clientes válidos e pula os malformados, sem gravar nada", async () => {
    const jsonPath = writeFixture();
    const result = await migrateAutomationData({
      slug: "barbearia-teste",
      jsonPath,
      apply: false,
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped.map((s) => s.reason)).toEqual(
      expect.arrayContaining(["nome ausente", "telefone inválido"]),
    );
  });

  it("lança erro claro se a barbearia não existe no arquivo de origem", async () => {
    const jsonPath = writeFixture();
    await expect(
      migrateAutomationData({ slug: "barbearia-inexistente", jsonPath, apply: false }),
    ).rejects.toThrow(/não encontrada/);
  });
});
