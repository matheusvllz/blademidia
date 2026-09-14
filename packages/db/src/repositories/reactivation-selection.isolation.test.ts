/**
 * Isolamento entre tenants para a seleção de reativação (Fase 5.4) — DoD do ADR-0007.
 * Precisa de Postgres real (`DATABASE_URL`); pulado sem banco, como os demais.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { setReactivationSettings } from "./settings";
import { createBarbershop } from "./barbershops";
import { createClient } from "./clients";
import { registerVisit } from "./visits";
import { listClientsNeedingReactivation } from "./reactivation-selection";
import { recordReactivationSent, getLastReactivationSent } from "./reactivation-sends";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const NOW = new Date("2027-06-01T00:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe.skipIf(!hasDatabase)("isolamento entre barbearias (reativação)", () => {
  let a: { id: string };
  let b: { id: string };

  beforeAll(async () => {
    a = await createBarbershop(`reativ-iso-a-${randomUUID()}`, "Reativação Iso A");
    b = await createBarbershop(`reativ-iso-b-${randomUUID()}`, "Reativação Iso B");
    await setReactivationSettings(a.id, { reactivationAutomationEnabled: true, reactivationDailyCap: 50 });
    await setReactivationSettings(b.id, { reactivationAutomationEnabled: true, reactivationDailyCap: 50 });
  });

  it("cliente inativo da barbearia A não aparece na seleção da B, e o registro de envio é escopado", async () => {
    const client = await createClient(a.id, { name: "Cliente Iso A", phone: `5561${Date.now()}` });
    await registerVisit(a.id, client.client!.id, { serviceLabel: "Corte", occurredAt: daysAgo(30) });

    const selectionA = await listClientsNeedingReactivation(a.id, NOW);
    expect(selectionA.find((c) => c.id === client.client!.id)).toBeDefined();

    const selectionB = await listClientsNeedingReactivation(b.id, NOW);
    expect(selectionB.find((c) => c.id === client.client!.id)).toBeUndefined();

    await recordReactivationSent(a.id, client.client!.id, "wamid.iso.a", daysAgo(30));
    expect(await getLastReactivationSent(b.id, client.client!.id)).toBeNull();
    expect(await getLastReactivationSent(a.id, client.client!.id)).not.toBeNull();
  });
});
