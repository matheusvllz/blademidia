import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client";

async function main() {
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("Migrações aplicadas com sucesso.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Falha ao aplicar migrações:", err);
  process.exit(1);
});
