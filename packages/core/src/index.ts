/**
 * @blademidia/core — camada de domínio do produto (ADR-0008).
 *
 * Fronteira única de regras de negócio da agenda: `apps/web`, `apps/worker` e
 * (futuro) `packages/ai` chamam SEMPRE por aqui, com `barbershopId` explícito
 * (ADR-0007). Nenhuma regra de agenda vive nos apps.
 */
export const CORE_PACKAGE = "@blademidia/core";
export * from "./agenda/index";
