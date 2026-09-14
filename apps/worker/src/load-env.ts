import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Carrega o `.env` da raiz do monorepo. O worker roda com cwd=apps/worker (dois
 * níveis abaixo da raiz), então `<cwd>/../../.env` resolve para o mesmo arquivo
 * usado por `apps/web` e `packages/db`. Em produção (env injetado pelo host) o
 * arquivo não existe e nada é sobrescrito. Deve ser o primeiro import do worker.
 */
const rootEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  // `quiet: true`: silencia a linha de "tip" promocional do dotenv 17+ (achado incidental
  // durante `add-atendimento-ia` — ver mesmo comentário em packages/db/src/load-env.ts).
  config({ path: rootEnvPath, quiet: true });
}
