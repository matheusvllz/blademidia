import { eq } from "drizzle-orm";
import { db } from "../client";
import {
  agendaSettings,
  DEFAULT_CONFIRMATION_LEAD_HOURS,
  DEFAULT_MIN_ADVANCE_MIN,
  DEFAULT_NO_SHOW_AFTER_MIN,
  DEFAULT_SLOT_STEP_MIN,
} from "../schema/agenda-settings";

export type AgendaSettingsRecord = typeof agendaSettings.$inferSelect;

export interface AgendaSettingsValues {
  slotStepMin: number;
  minAdvanceMin: number;
  noShowAfterMin: number;
  confirmationLeadHours: number;
}

export const DEFAULT_AGENDA_SETTINGS: AgendaSettingsValues = {
  slotStepMin: DEFAULT_SLOT_STEP_MIN,
  minAdvanceMin: DEFAULT_MIN_ADVANCE_MIN,
  noShowAfterMin: DEFAULT_NO_SHOW_AFTER_MIN,
  confirmationLeadHours: DEFAULT_CONFIRMATION_LEAD_HOURS,
};

/** Retorna as regras da barbearia, usando os padrões quando nunca configurada. */
export async function getAgendaSettings(
  barbershopId: string,
): Promise<AgendaSettingsValues & { barbershopId: string }> {
  const rows = await db.select().from(agendaSettings).where(eq(agendaSettings.barbershopId, barbershopId));
  const row = rows[0];
  return {
    barbershopId,
    slotStepMin: row?.slotStepMin ?? DEFAULT_AGENDA_SETTINGS.slotStepMin,
    minAdvanceMin: row?.minAdvanceMin ?? DEFAULT_AGENDA_SETTINGS.minAdvanceMin,
    noShowAfterMin: row?.noShowAfterMin ?? DEFAULT_AGENDA_SETTINGS.noShowAfterMin,
    confirmationLeadHours: row?.confirmationLeadHours ?? DEFAULT_AGENDA_SETTINGS.confirmationLeadHours,
  };
}

export async function updateAgendaSettings(
  barbershopId: string,
  input: Partial<AgendaSettingsValues>,
): Promise<AgendaSettingsRecord> {
  const [row] = await db
    .insert(agendaSettings)
    .values({ barbershopId, ...input })
    .onConflictDoUpdate({ target: agendaSettings.barbershopId, set: input })
    .returning();
  if (!row) throw new Error("Falha inesperada ao salvar regras da agenda");
  return row;
}
