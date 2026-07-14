import type PgBoss from "pg-boss";

/**
 * Registro central de jobs do worker. Preenchido no Grupo 7 do tasks.md:
 * - `agenda.no-show-sweep` (job real da Fase 2)
 * - `agenda.send-confirmation` / `crm.reactivation-sweep` (esqueletos honestos:
 *   selecionam e REGISTRAM o que enviariam; o envio real é da Fase 5).
 */
export async function registerJobs(_boss: PgBoss): Promise<void> {
  // Nenhum job registrado ainda (Grupo 0). Ver Grupo 7.
}
