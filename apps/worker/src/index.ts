import "./load-env";
import PgBoss from "pg-boss";
import { registerJobs } from "./jobs/index";

/**
 * Worker assíncrono do produto (ADR-0009). Roda pg-boss no MESMO Postgres do
 * produto (sem Redis, D4/ADR-0003) — pg-boss cria e mantém seu próprio schema.
 * Toda regra de negócio vive em `@blademidia/core`; o worker só orquestra jobs.
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurado (ver .env.example)");
  }

  const boss = new PgBoss({ connectionString });
  boss.on("error", (error) => console.error("[worker] erro do pg-boss:", error));

  await boss.start();
  await registerJobs(boss);
  console.log("[worker] up — pg-boss iniciado, jobs registrados");

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[worker] recebido ${signal}, encerrando...`);
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("[worker] falha ao iniciar:", error);
  process.exit(1);
});
