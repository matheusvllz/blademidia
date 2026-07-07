import "./load-env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";

// Pool conecta sob demanda (lazy) — importar este módulo não exige um Postgres
// já rodando; só a primeira query real precisa da conexão de pé.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
