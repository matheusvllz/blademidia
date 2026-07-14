/**
 * @blademidia/core — camada de domínio do produto (ADR-0008).
 *
 * Fronteira única de regras de negócio da agenda: `apps/web`, `apps/worker` e
 * (futuro) `packages/ai` chamam SEMPRE por aqui, com `barbershopId` explícito
 * (ADR-0007). Nenhuma regra de agenda vive nos apps.
 *
 * O módulo `./agenda` (AgendaService, motor de disponibilidade, contrato de
 * tools) é preenchido no Grupo 2 do tasks.md desta change.
 */
export const CORE_PACKAGE = "@blademidia/core";
