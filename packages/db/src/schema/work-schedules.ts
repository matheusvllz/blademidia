import { index, integer, pgTable, time, uuid } from "drizzle-orm/pg-core";
import { barbers } from "./barbers";
import { barbershops } from "./barbershops";

/**
 * Grade semanal recorrente de um barbeiro (Fase 2, decisão Q3). `weekday`:
 * 0=domingo … 6=sábado (igual a `Date.getDay()` e às chaves do preset da
 * automação). VÁRIAS linhas por barbeiro/dia modelam intervalos (ex.: 09:00–12:00
 * e 13:00–19:00 = almoço no meio). Horários são LOCAIS (fuso da barbearia); a
 * conversão para instante acontece no motor de disponibilidade.
 */
export const workSchedules = pgTable(
  "work_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id),
    weekday: integer("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (table) => [index("work_schedules_barber_weekday_idx").on(table.barbershopId, table.barberId, table.weekday)],
);
