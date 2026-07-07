import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import { clients } from "../schema/clients";
import { isClientInactive } from "../domain/inactivity";
import { paymentsLog } from "../schema/payments-log";
import { visits } from "../schema/visits";
import { getInactivityThreshold } from "./settings";

export interface DashboardData {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  averageTicketCents: number | null;
  clientsToReactivate: { id: string; name: string | null; lastVisitAt: Date | null }[];
}

/**
 * Uma consulta só (CTE com o último atendimento por cliente) em vez de N+1
 * queries por cliente — importante porque o dashboard roda a cada acesso.
 */
export async function getDashboard(barbershopId: string): Promise<DashboardData> {
  const threshold = await getInactivityThreshold(barbershopId);

  const lastVisitPerClient = db.$with("last_visit_per_client").as(
    db
      .select({
        clientId: visits.clientId,
        lastVisitAt: sql<Date>`max(${visits.occurredAt})`.as("last_visit_at"),
      })
      .from(visits)
      .where(eq(visits.barbershopId, barbershopId))
      .groupBy(visits.clientId),
  );

  const rows = await db
    .with(lastVisitPerClient)
    .select({
      id: clients.id,
      name: clients.name,
      lastVisitAt: lastVisitPerClient.lastVisitAt,
    })
    .from(clients)
    .leftJoin(lastVisitPerClient, eq(clients.id, lastVisitPerClient.clientId))
    .where(and(eq(clients.barbershopId, barbershopId), isNull(clients.deletedAt)));

  let activeClients = 0;
  let inactiveClients = 0;
  const clientsToReactivate: DashboardData["clientsToReactivate"] = [];

  for (const row of rows) {
    // `max(occurred_at)` volta como string do driver pg (o `sql<Date>` é só
    // tipagem, não conversão em runtime) — normalizar para Date.
    const lastVisitAt = row.lastVisitAt ? new Date(row.lastVisitAt) : null;
    if (isClientInactive(lastVisitAt, threshold)) {
      inactiveClients += 1;
      clientsToReactivate.push({ id: row.id, name: row.name, lastVisitAt });
    } else {
      activeClients += 1;
    }
  }

  const payments = await db
    .select({ amountCents: paymentsLog.amountCents })
    .from(paymentsLog)
    .where(eq(paymentsLog.barbershopId, barbershopId));

  const averageTicketCents =
    payments.length > 0
      ? Math.round(payments.reduce((sum, p) => sum + p.amountCents, 0) / payments.length)
      : null;

  return {
    totalClients: rows.length,
    activeClients,
    inactiveClients,
    averageTicketCents,
    clientsToReactivate: clientsToReactivate.sort((a, b) => {
      const aTime = a.lastVisitAt?.getTime() ?? 0;
      const bTime = b.lastVisitAt?.getTime() ?? 0;
      return aTime - bTime; // mais tempo sumido primeiro
    }),
  };
}
