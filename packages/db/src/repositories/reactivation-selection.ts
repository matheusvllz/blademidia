import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import { clients } from "../schema/clients";
import {
  crmSettings,
  DEFAULT_INACTIVITY_DAYS_THRESHOLD,
  DEFAULT_REACTIVATION_AUTOMATION_ENABLED,
  DEFAULT_REACTIVATION_DAILY_CAP,
} from "../schema/crm-settings";
import { reactivationSends } from "../schema/reactivation-sends";
import { visits } from "../schema/visits";
import { isClientInactive } from "../domain/inactivity";

/**
 * Seleção própria do canal de reativação (Fase 5.4, `add-reativacao-clientes`, design.md
 * Decision 3/4) — separada de `getDashboard` (Fase 1) de propósito: aqui é preciso telefone
 * (a UI de dashboard não precisa) e a regra de "novo ciclo de inatividade" (a UI de dashboard
 * só mostra quem está inativo agora, não quando pode receber mensagem de novo).
 *
 * Cliente sem NENHUMA visita registrada nunca aparece aqui (join interno com o CTE de última
 * visita exclui esse caso) — decisão registrada no proposal: "você sumiu" não se aplica a
 * quem nunca veio.
 */

export interface ClientNeedingReactivation {
  id: string;
  name: string | null;
  phone: string;
  lastVisitAt: Date;
}

export async function listClientsNeedingReactivation(
  barbershopId: string,
  now: Date = new Date(),
): Promise<ClientNeedingReactivation[]> {
  const settingsRows = await db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.barbershopId, barbershopId));
  const settings = settingsRows[0];

  const automationEnabled =
    settings?.reactivationAutomationEnabled ?? DEFAULT_REACTIVATION_AUTOMATION_ENABLED;
  if (!automationEnabled) return [];

  const threshold = settings?.inactivityDaysThreshold ?? DEFAULT_INACTIVITY_DAYS_THRESHOLD;
  const dailyCap = settings?.reactivationDailyCap ?? DEFAULT_REACTIVATION_DAILY_CAP;

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
      phone: clients.phone,
      lastVisitAt: lastVisitPerClient.lastVisitAt,
    })
    .from(clients)
    .innerJoin(lastVisitPerClient, eq(lastVisitPerClient.clientId, clients.id))
    .where(
      and(
        eq(clients.barbershopId, barbershopId),
        isNull(clients.deletedAt),
        sql`${clients.phone} is not null`,
      ),
    );

  // Último envio de reativação por cliente, para aplicar a regra de "novo ciclo" (design.md
  // Decision 3). Volume por barbearia é pequeno o bastante para reduzir em JS, no mesmo
  // espírito de `getDashboard` (que já filtra `isClientInactive` em JS, não em SQL).
  const sentRows = await db
    .select({
      clientId: reactivationSends.clientId,
      clientLastVisitAt: reactivationSends.clientLastVisitAt,
      sentAt: reactivationSends.sentAt,
    })
    .from(reactivationSends)
    .where(eq(reactivationSends.barbershopId, barbershopId));

  const lastSentSnapshotByClient = new Map<string, Date | null>();
  const lastSentAtByClient = new Map<string, number>();
  for (const row of sentRows) {
    const sentAtMs = new Date(row.sentAt).getTime();
    const previous = lastSentAtByClient.get(row.clientId);
    if (previous === undefined || sentAtMs > previous) {
      lastSentAtByClient.set(row.clientId, sentAtMs);
      lastSentSnapshotByClient.set(row.clientId, row.clientLastVisitAt ? new Date(row.clientLastVisitAt) : null);
    }
  }

  const eligible = rows
    .map((row) => ({ ...row, lastVisitAt: new Date(row.lastVisitAt) }))
    .filter((row) => {
      if (!isClientInactive(row.lastVisitAt, threshold, now)) return false;
      if (!lastSentSnapshotByClient.has(row.id)) return true; // nunca recebeu reativação
      const snapshot = lastSentSnapshotByClient.get(row.id);
      if (!snapshot) return true; // defensivo — não deveria acontecer (ver schema)
      return row.lastVisitAt.getTime() > snapshot.getTime(); // novo ciclo: visitou depois do último envio
    })
    .sort((a, b) => a.lastVisitAt.getTime() - b.lastVisitAt.getTime()); // mais tempo sumido primeiro

  return eligible.slice(0, dailyCap).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone!, // garantido pelo filtro `phone is not null` acima
    lastVisitAt: row.lastVisitAt,
  }));
}
