import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Carrega o `.env` da raiz do monorepo. Tanto `apps/web` quanto `packages/db`
 * ficam a dois níveis da raiz, então `<cwd>/../../.env` resolve para o mesmo
 * arquivo nos dois contextos (Next dev roda com cwd=apps/web; os scripts tsx
 * rodam com cwd=packages/db). Se o arquivo não existir (ex.: produção com env
 * injetado pelo host), não faz nada — não sobrescreve variáveis já presentes.
 */
const rootEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  // `quiet: true`: silencia a linha de "tip" promocional que o dotenv 17+ imprime a cada
  // carregamento (inclusive um link para um domínio de terceiro) — achado incidental durante a
  // change `add-atendimento-ia`; sem isso, todo log real (worker, testes) fica poluído.
  config({ path: rootEnvPath, quiet: true });
}
