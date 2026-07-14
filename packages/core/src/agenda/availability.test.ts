import { describe, expect, it } from "vitest";
import {
  type AvailabilityParams,
  type BarberAvailabilityInput,
  computeAvailability,
  computeBarberDaySlots,
} from "./availability";

const TZ = "America/Sao_Paulo"; // UTC-3, sem horário de verão → 09:00 local = 12:00Z
const DATE = "2026-07-20";
const LONG_AGO = new Date("2000-01-01T00:00:00Z");

function params(over: Partial<AvailabilityParams> = {}): AvailabilityParams {
  return {
    date: DATE,
    durationMin: 30,
    slotStepMin: 30,
    minAdvanceMin: 0,
    timezone: TZ,
    now: LONG_AGO,
    ...over,
  };
}

function barber(over: Partial<BarberAvailabilityInput> = {}): BarberAvailabilityInput {
  return { barberId: "b1", windows: [], exceptions: [], appointments: [], ...over };
}

const iso = (slots: { startsAt: Date }[]) => slots.map((s) => s.startsAt.toISOString());

describe("computeBarberDaySlots", () => {
  it("grade 09:00–12:00, passo 30, serviço 60 → 5 horários (09:00…11:00), sem 11:30", () => {
    const slots = computeBarberDaySlots(
      barber({ windows: [{ startTime: "09:00", endTime: "12:00" }] }),
      params({ durationMin: 60 }),
    );
    expect(iso(slots)).toEqual([
      "2026-07-20T12:00:00.000Z",
      "2026-07-20T12:30:00.000Z",
      "2026-07-20T13:00:00.000Z",
      "2026-07-20T13:30:00.000Z",
      "2026-07-20T14:00:00.000Z",
    ]);
    // 11:30 (14:30Z) não cabe: um serviço de 60 min ultrapassaria as 12:00
    expect(iso(slots)).not.toContain("2026-07-20T14:30:00.000Z");
  });

  it("serviço que encaixa exatamente no fim do expediente é oferecido", () => {
    // 09:00–12:00, passo 30, serviço 30 → 11:30–12:00 encaixa (não ultrapassa) → 6 horários
    const slots = computeBarberDaySlots(
      barber({ windows: [{ startTime: "09:00", endTime: "12:00" }] }),
      params({ durationMin: 30 }),
    );
    expect(slots).toHaveLength(6);
    expect(iso(slots)).toContain("2026-07-20T14:30:00.000Z"); // 11:30 local
  });

  it("intervalo de almoço: 09–12 e 13–19 não oferecem nada entre 12:00 e 13:00", () => {
    const slots = computeBarberDaySlots(
      barber({
        windows: [
          { startTime: "09:00", endTime: "12:00" },
          { startTime: "13:00", endTime: "19:00" },
        ],
      }),
      params({ durationMin: 60, slotStepMin: 60 }),
    );
    // 12:00 local = 15:00Z não pode existir
    expect(iso(slots)).not.toContain("2026-07-20T15:00:00.000Z");
    // 11:00 local (14:00Z) e 13:00 local (16:00Z) existem
    expect(iso(slots)).toContain("2026-07-20T14:00:00.000Z");
    expect(iso(slots)).toContain("2026-07-20T16:00:00.000Z");
  });

  it("folga zera o dia", () => {
    const slots = computeBarberDaySlots(
      barber({
        windows: [{ startTime: "09:00", endTime: "19:00" }],
        exceptions: [{ kind: "folga", startTime: null, endTime: null }],
      }),
      params(),
    );
    expect(slots).toHaveLength(0);
  });

  it("bloqueio 15:00–16:00 não oferece horário que ocupe o intervalo", () => {
    const slots = computeBarberDaySlots(
      barber({
        windows: [{ startTime: "09:00", endTime: "19:00" }],
        exceptions: [{ kind: "bloqueio", startTime: "15:00", endTime: "16:00" }],
      }),
      params({ durationMin: 40 }),
    );
    const times = iso(slots);
    // com passo 30 a partir das 09:00, o último da manhã é 14:00 local (17:00Z);
    // retoma às 16:00 local (19:00Z)
    expect(times).toContain("2026-07-20T17:00:00.000Z");
    expect(times).toContain("2026-07-20T19:00:00.000Z");
    // nada iniciando dentro de [15:00,16:00) local = [18:00,19:00)Z
    expect(times).not.toContain("2026-07-20T18:00:00.000Z");
    expect(times).not.toContain("2026-07-20T18:30:00.000Z");
  });

  it("exceção extra adiciona disponibilidade fora da grade", () => {
    const slots = computeBarberDaySlots(
      barber({
        windows: [{ startTime: "09:00", endTime: "12:00" }],
        exceptions: [{ kind: "extra", startTime: "14:00", endTime: "15:00" }],
      }),
      params(),
    );
    expect(iso(slots)).toContain("2026-07-20T17:00:00.000Z"); // 14:00 local
    expect(iso(slots)).toContain("2026-07-20T17:30:00.000Z"); // 14:30 local
  });

  it("agendamento existente (10:00–10:40) remove os horários que se sobrepõem", () => {
    const slots = computeBarberDaySlots(
      barber({
        windows: [{ startTime: "09:00", endTime: "12:00" }],
        appointments: [
          {
            startsAt: new Date("2026-07-20T13:00:00.000Z"), // 10:00 local
            endsAt: new Date("2026-07-20T13:40:00.000Z"), // 10:40 local
          },
        ],
      }),
      params({ durationMin: 40 }),
    );
    // sobram 09:00 (12:00Z) e 11:00 (14:00Z); 09:30/10:00/10:30 colidem
    expect(iso(slots)).toEqual(["2026-07-20T12:00:00.000Z", "2026-07-20T14:00:00.000Z"]);
  });

  it("antecedência/agora: horários passados são descartados", () => {
    const slots = computeBarberDaySlots(
      barber({ windows: [{ startTime: "09:00", endTime: "12:00" }] }),
      params({ durationMin: 60, slotStepMin: 60, now: new Date("2026-07-20T13:30:00.000Z") }),
    );
    // 09:00(12:00Z) e 10:00(13:00Z) já passaram; sobra 11:00 (14:00Z)
    expect(iso(slots)).toEqual(["2026-07-20T14:00:00.000Z"]);
  });

  it("passo de 15 minutos", () => {
    const slots = computeBarberDaySlots(
      barber({ windows: [{ startTime: "09:00", endTime: "10:00" }] }),
      params({ slotStepMin: 15 }),
    );
    // 09:00, 09:15, 09:30 (09:45+30=10:15 não cabe)
    expect(iso(slots)).toEqual([
      "2026-07-20T12:00:00.000Z",
      "2026-07-20T12:15:00.000Z",
      "2026-07-20T12:30:00.000Z",
    ]);
  });
});

describe("computeAvailability (qualquer barbeiro = união)", () => {
  it("une horários de barbeiros diferentes, marcando o barbeiro de cada um", () => {
    const a = barber({ barberId: "A", windows: [{ startTime: "09:00", endTime: "10:00" }] });
    const b = barber({ barberId: "B", windows: [{ startTime: "09:00", endTime: "09:30" }] });
    const slots = computeAvailability([a, b], params());
    expect(slots.map((s) => `${s.startsAt.toISOString()}#${s.barberId}`)).toEqual([
      "2026-07-20T12:00:00.000Z#A",
      "2026-07-20T12:00:00.000Z#B",
      "2026-07-20T12:30:00.000Z#A",
    ]);
  });
});
