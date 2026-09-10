import { describe, expect, it } from "vitest";
import { buildContextNote, mapHistoryToMessages } from "./messages";

describe("mapHistoryToMessages", () => {
  it("histórico vazio vira lista vazia", () => {
    expect(mapHistoryToMessages([])).toEqual([]);
  });

  it("mapeia entrada para user e saída para assistant", () => {
    const result = mapHistoryToMessages([
      { direction: "entrada", type: "texto", body: "oi, quero cortar o cabelo" },
      { direction: "saida", type: "texto", body: "fala! bora marcar, qual dia?" },
      { direction: "entrada", type: "texto", body: "amanhã" },
    ]);
    expect(result).toEqual([
      { role: "user", content: "oi, quero cortar o cabelo" },
      { role: "assistant", content: "fala! bora marcar, qual dia?" },
      { role: "user", content: "amanhã" },
    ]);
  });

  it("une mensagens consecutivas do mesmo papel (API exige alternância)", () => {
    const result = mapHistoryToMessages([
      { direction: "entrada", type: "texto", body: "oi" },
      { direction: "entrada", type: "texto", body: "quero cortar o cabelo" },
      { direction: "saida", type: "texto", body: "fala!" },
    ]);
    expect(result).toEqual([
      { role: "user", content: "oi\nquero cortar o cabelo" },
      { role: "assistant", content: "fala!" },
    ]);
  });

  it("descarta mensagens de saída antes da primeira mensagem do cliente", () => {
    const result = mapHistoryToMessages([
      { direction: "saida", type: "template", body: "mensagem de template (fora do escopo desta change)" },
      { direction: "entrada", type: "texto", body: "oi" },
    ]);
    expect(result).toEqual([{ role: "user", content: "oi" }]);
  });

  it("ignora mensagens sem corpo (mídia não suportada)", () => {
    const result = mapHistoryToMessages([
      { direction: "entrada", type: "texto", body: "oi" },
      { direction: "entrada", type: "outro", body: null },
    ]);
    expect(result).toEqual([{ role: "user", content: "oi" }]);
  });
});

describe("buildContextNote", () => {
  it("inclui a data e o nome do cliente quando disponível", () => {
    const note = buildContextNote({ todayIso: "2026-09-10", clientName: "João" });
    expect(note).toContain("2026-09-10");
    expect(note).toContain("João");
  });

  it("sinaliza cliente não identificado quando não há nome", () => {
    const note = buildContextNote({ todayIso: "2026-09-10", clientName: null });
    expect(note).toContain("não identificado");
  });
});
