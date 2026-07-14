import { date, index, pgEnum, pgTable, text, time, uuid } from "drizzle-orm/pg-core";
import { barbers } from "./barbers";
import { barbershops } from "./barbershops";

/**
 * Exceções pontuais que sobrepõem a grade semanal numa data (Fase 2):
 * - `folga`: dia inteiro sem atendimento (start/end ignorados);
 * - `bloqueio`: intervalo indisponível (start/end obrigatórios);
 * - `extra`: disponibilidade fora da grade (start/end obrigatórios).
 * `barberId` NULL = exceção de toda a barbearia (ex.: feriado).
 */
export const exceptionKindEnum = pgEnum("exception_kind", ["folga", "bloqueio", "extra"]);

export const scheduleExceptions = pgTable(
  "schedule_exceptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    barberId: uuid("barber_id").references(() => barbers.id),
    date: date("date").notNull(),
    kind: exceptionKindEnum("kind").notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    reason: text("reason"),
  },
  (table) => [index("schedule_exceptions_date_idx").on(table.barbershopId, table.date)],
);
