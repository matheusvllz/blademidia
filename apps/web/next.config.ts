import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// Carrega o .env da raiz do monorepo no processo do servidor Next (Node), para
// que Server Components e Route Handlers vejam DATABASE_URL/SESSION_SECRET.
// Não usa a config `env` do Next de propósito — isso vazaria segredos para o
// bundle do cliente. O middleware (Edge) não depende disso: ele só checa a
// presença do cookie; a validação real da sessão é feita server-side (Node).
const rootEnvPath = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  // `quiet: true`: silencia a linha de "tip" promocional do dotenv 17+ (achado incidental
  // durante `add-atendimento-ia` — ver mesmo comentário em packages/db/src/load-env.ts).
  config({ path: rootEnvPath, quiet: true });
}

const nextConfig: NextConfig = {
  transpilePackages: ["@blademidia/db", "@blademidia/whatsapp"],
};

export default nextConfig;
