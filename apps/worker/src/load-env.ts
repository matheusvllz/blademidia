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
  config({ path: rootEnvPath });
}
