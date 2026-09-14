import PgBoss from "pg-boss";

/**
 * Cliente pg-boss do lado PRODUTOR (`apps/web`) — só enfileira jobs que `apps/worker` consome
 * (ADR-0011). Nunca registra handler de job aqui; isso é responsabilidade exclusiva do worker.
 * Singleton por processo, iniciado sob demanda na primeira chamada (mesmo padrão lazy do
 * `db` em `packages/db/src/client.ts`).
 */
let bossPromise: Promise<PgBoss> | null = null;

async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL não configurado (ver .env.example)");
    }
    const boss = new PgBoss({ connectionString });
    boss.on("error", (error) => console.error("[web] erro do pg-boss (produtor):", error));
    bossPromise = boss.start().then(() => boss);
  }
  return bossPromise;
}

/**
 * Enfileira um job. `createQueue` é idempotente — chamado aqui defensivamente para não
 * depender de o worker já ter subido e criado a fila antes do primeiro envio (ordem de boot
 * não é garantida entre `apps/web` e `apps/worker`).
 */
export async function enqueue(
  queueName: string,
  data: Record<string, unknown>,
  options?: { singletonKey?: string },
): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(queueName);
  await boss.send(queueName, data, options ?? {});
}
