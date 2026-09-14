import { describe, expect, it } from "vitest";
import { buildSystemPrompt, summarizeBusinessHours } from "./system-prompt";

describe("summarizeBusinessHours", () => {
  it("sem grade cadastrada, avisa explicitamente", () => {
    expect(summarizeBusinessHours([])).toMatch(/nenhum horário/i);
  });

  it("resume um dia com uma janela", () => {
    const result = summarizeBusinessHours([{ weekday: 1, startTime: "09:00:00", endTime: "19:00:00" }]);
    expect(result).toBe("segunda: 09:00-19:00");
  });

  it("resume um dia com duas janelas (intervalo de almoço)", () => {
    const result = summarizeBusinessHours([
      { weekday: 1, startTime: "09:00:00", endTime: "12:00:00" },
      { weekday: 1, startTime: "13:00:00", endTime: "19:00:00" },
    ]);
    expect(result).toBe("segunda: 09:00-12:00 e 13:00-19:00");
  });

  it("preserva a ordem dos dias da semana (domingo a sábado)", () => {
    const result = summarizeBusinessHours([
      { weekday: 6, startTime: "09:00:00", endTime: "13:00:00" },
      { weekday: 1, startTime: "09:00:00", endTime: "19:00:00" },
    ]);
    expect(result).toBe("segunda: 09:00-19:00; sábado: 09:00-13:00");
  });
});

describe("buildSystemPrompt", () => {
  it("não contém data nem timestamp dinâmico (nada volátil no system prompt)", () => {
    const prompt = buildSystemPrompt({
      barbershopName: "Barbearia do Zé",
      services: [{ name: "Corte", durationMin: 30, priceCents: 4500 }],
      workSchedules: [{ weekday: 1, startTime: "09:00:00", endTime: "19:00:00" }],
      hasClientOnFile: true,
    });
    expect(prompt).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(prompt).not.toContain(new Date().getFullYear().toString());
  });

  it("inclui o cardápio com preço formatado em reais", () => {
    const prompt = buildSystemPrompt({
      barbershopName: "Barbearia do Zé",
      services: [{ name: "Corte", durationMin: 30, priceCents: 4500 }],
      workSchedules: [],
      hasClientOnFile: true,
    });
    expect(prompt).toContain("Corte");
    expect(prompt).toContain("R$ 45,00");
  });

  it("instrui a cadastrar cliente antes de agendar quando não há cliente na conversa", () => {
    const prompt = buildSystemPrompt({
      barbershopName: "Barbearia do Zé",
      services: [],
      workSchedules: [],
      hasClientOnFile: false,
    });
    expect(prompt).toMatch(/cadastro básico/i);
  });

  it("não inclui a instrução de cadastro quando já há cliente na conversa", () => {
    const prompt = buildSystemPrompt({
      barbershopName: "Barbearia do Zé",
      services: [],
      workSchedules: [],
      hasClientOnFile: true,
    });
    expect(prompt).not.toMatch(/cadastro básico/i);
  });

  it("instrui a nunca inventar horário e a escalar quando fora de escopo", () => {
    const prompt = buildSystemPrompt({
      barbershopName: "Barbearia do Zé",
      services: [],
      workSchedules: [],
      hasClientOnFile: true,
    });
    expect(prompt).toMatch(/nunca invente ou estime/i);
    expect(prompt).toMatch(/escalação para humano/i);
  });
});
