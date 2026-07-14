import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { barbers } from "./barbers";
import { barbershops } from "./barbershops";
import { services } from "./services";

/**
 * Quais serviços cada barbeiro executa (N:N). Ausência de linhas para um
 * barbeiro = ele faz TODOS os serviços ativos (regra da spec `agendamento`:
 * "Barbeiro sem restrição declarada"). PK composta evita duplicidade.
 */
export const barberServices = pgTable(
  "barber_services",
  {
    barbershopId: uuid("barbershop_id")
      .notNull()
      .references(() => barbershops.id),
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
  },
  (table) => [primaryKey({ columns: [table.barberId, table.serviceId] })],
);
