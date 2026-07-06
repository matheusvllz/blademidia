/**
 * Lista as instances do Evolution API e o estado de conexão de cada tenant.
 * Uso:  node automation/status.mjs
 * Requer EVOLUTION_URL e EVOLUTION_API_KEY (sem eles roda em dry-run).
 */
import { fetchInstances, dryRun } from "./lib/evolution.mjs";

const result = await fetchInstances();

if (dryRun) {
  console.log("(dry-run) Com Evolution configurado, este comando lista: instance · estado da conexão · dono.");
  process.exit(0);
}

const instances = Array.isArray(result) ? result : result?.instances ?? [];
if (!instances.length) {
  console.log("Nenhuma instance encontrada.");
  process.exit(0);
}
for (const item of instances) {
  const inst = item.instance ?? item;
  console.log(`${inst.instanceName ?? inst.name} → ${inst.connectionStatus ?? inst.state ?? "?"}`);
}
