import { describe, expect, it } from "vitest";
import { agendaTools, criarAgendamentoTool } from "./tools";

describe("contrato de tools da agenda", () => {
  it("expõe as 4 tools esperadas com nome e descrição", () => {
    expect(agendaTools.map((t) => t.name)).toEqual([
      "consultar_disponibilidade",
      "criar_agendamento",
      "remarcar_agendamento",
      "cancelar_agendamento",
    ]);
    for (const tool of agendaTools) {
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it("valida a entrada pelo schema (criar_agendamento)", () => {
    const valid = criarAgendamentoTool.inputSchema.safeParse({
      clientId: "c1",
      serviceId: "s1",
      barberId: "b1",
      startsAt: "2026-07-20T13:00:00Z",
    });
    expect(valid.success).toBe(true);

    const invalid = criarAgendamentoTool.inputSchema.safeParse({ clientId: "c1" });
    expect(invalid.success).toBe(false);
  });
});
