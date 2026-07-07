import { eq } from "drizzle-orm";
import { db } from "../client";
import { crmSettings, DEFAULT_INACTIVITY_DAYS_THRESHOLD } from "../schema/crm-settings";

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
