import { eq } from "drizzle-orm";
import { db } from "../client";
import {
  crmSettings,
  DEFAULT_INACTIVITY_DAYS_THRESHOLD,
  DEFAULT_REACTIVATION_AUTOMATION_ENABLED,
  DEFAULT_REACTIVATION_DAILY_CAP,
} from "../schema/crm-settings";

export async function getInactivityThreshold(barbershopId: string): Promise<number> {
  const rows = await db.select().from(crmSettings).where(eq(crmSettings.barbershopId, barbershopId));
  return rows[0]?.inactivityDaysThreshold ?? DEFAULT_INACTIVITY_DAYS_THRESHOLD;
}

export async function setInactivityThreshold(barbershopId: string, days: number) {
  const [row] = await db
    .insert(crmSettings)
    .values({ barbershopId, inactivityDaysThreshold: days })
    .onConflictDoUpdate({
      target: crmSettings.barbershopId,
      set: { inactivityDaysThreshold: days },
    })
    .returning();
  if (!row) throw new Error("Falha inesperada ao salvar configuração");
  return row;
}

/** Fase 5.4 (`add-reativacao-clientes`): gate + throttling por barbearia — ver crm-settings.ts. */
export interface ReactivationSettings {
  reactivationAutomationEnabled: boolean;
  reactivationDailyCap: number;
}

export async function getReactivationSettings(barbershopId: string): Promise<ReactivationSettings> {
  const rows = await db.select().from(crmSettings).where(eq(crmSettings.barbershopId, barbershopId));
  const row = rows[0];
  return {
    reactivationAutomationEnabled:
      row?.reactivationAutomationEnabled ?? DEFAULT_REACTIVATION_AUTOMATION_ENABLED,
    reactivationDailyCap: row?.reactivationDailyCap ?? DEFAULT_REACTIVATION_DAILY_CAP,
  };
}

export async function setReactivationSettings(
  barbershopId: string,
  input: Partial<ReactivationSettings>,
) {
  const [row] = await db
    .insert(crmSettings)
    .values({ barbershopId, ...input })
    .onConflictDoUpdate({ target: crmSettings.barbershopId, set: input })
    .returning();
  if (!row) throw new Error("Falha inesperada ao salvar configuração de reativação");
  return row;
}
