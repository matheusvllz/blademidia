import { describe, expect, it } from "vitest";
import { executeTool, getClaudeToolDefinitions } from "./index";

describe("getClaudeToolDefinitions", () => {
  it("expõe as 4 tools com input_schema JSON válido", () => {
    const defs = getClaudeToolDefinitions();
    expect(defs.map((d) => d.name)).toEqual([
      "consultar_disponibilidade",
      "criar_agendamento",
      "remarcar_agendamento",
      "cancelar_agendamento",
    ]);
    for (const def of defs) {
      expect(def.description.length).toBeGreaterThan(0);
      expect(def.input_schema.type).toBe("object");
      expect(def.input_schema.properties).toBeDefined();
    }
  });
});

describe("executeTool", () => {
  it("lança erro para tool desconhecida (sem chamar nenhum handler)", async () => {
    await expect(executeTool("shop-1", "tool_inexistente", {})).rejects.toThrow(/desconhecida/);
  });

  it("valida a entrada pelo schema antes de delegar ao handler", async () => {
    await expect(executeTool("shop-1", "criar_agendamento", { clientId: "c1" })).rejects.toThrow();
  });
});
