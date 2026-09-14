/**
 * Fase 5.4 (`add-reativacao-clientes`). Precisa de Postgres real (`DATABASE_URL`); pulado sem
 * banco, como os demais.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { setReactivationSettings } from "./settings";
import { createBarbershop } from "./barbershops";
import { createClient, deleteClient } from "./clients";
import { registerVisit } from "./visits";
import { listClientsNeedingReactivation } from "./reactivation-selection";
import { recordReactivationSent } from "./reactivation-sends";

const hasDatabase = Boolean(process.env.DATABASE_URL);

// Fuso não importa aqui (dias, não wall-clock) — data de referência fixa evita flakiness.
const NOW = new Date("2027-06-01T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS);

describe.skipIf(!hasDatabase)("listClientsNeedingReactivation", () => {
  let barbershopId: string;

  beforeAll(async () => {
    const shop = await createBarbershop(`reativ-${randomUUID()}`, "Reativação Teste");
    barbershopId = shop.id;
  });

  async function seedInactiveClient(name: string, visitDaysAgo: number) {
    const client = await createClient(barbershopId, { name, phone: `5561${Date.now()}${Math.floor(Math.random() * 10000)}` });
    await registerVisit(barbershopId, client.client!.id, {
      serviceLabel: "Corte",
      occurredAt: daysAgo(visitDaysAgo),
    });
    return client.client!.id;
  }

  it("barbearia sem reactivationAutomationEnabled não seleciona ninguém", async () => {
    await setReactivationSettings(barbershopId, { reactivationAutomationEnabled: false });
    await seedInactiveClient("Sem Automação", 30);

    const result = await listClientsNeedingReactivation(barbershopId, NOW);
    expect(result).toHaveLength(0);
  });

  it("cliente sem nenhuma visita nunca aparece, mesmo com automação ligada", async () => {
    await setReactivationSettings(barbershopId, { reactivationAutomationEnabled: true, reactivationDailyCap: 50 });
    const client = await createClient(barbershopId, { name: "Nunca Visitou", phone: `5561${Date.now()}1` });

    const result = await listClientsNeedingReactivation(barbershopId, NOW);
    expect(result.find((c) => c.id === client.client!.id)).toBeUndefined();
  });

  it("cliente inativo elegível pela primeira vez aparece com nome/telefone/lastVisitAt", async () => {
    await setReactivationSettings(barbershopId, { reactivationAutomationEnabled: true, reactivationDailyCap: 50 });
    const clientId = await seedInactiveClient("Cliente Inativo", 30); // > 21 dias default

    const result = await listClientsNeedingReactivation(barbershopId, NOW);
    const found = result.find((c) => c.id === clientId);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Cliente Inativo");
    expect(found?.phone).toMatch(/^5561/);
  });

  it("cliente ainda ativo (dentro do limiar) não aparece", async () => {
    await setReactivationSettings(barbershopId, { reactivationAutomationEnabled: true, reactivationDailyCap: 50 });
    const clientId = await seedInactiveClient("Cliente Ativo", 5); // < 21 dias

    const result = await listClientsNeedingReactivation(barbershopId, NOW);
    expect(result.find((c) => c.id === clientId)).toBeUndefined();
  });

  it("cliente já reativado sem visita nova não reaparece", async () => {
    await setReactivationSettings(barbershopId, { reactivationAutomationEnabled: true, reactivationDailyCap: 50 });
    const clientId = await seedInactiveClient("Já Reativado Sem Retorno", 40);

    let result = await listClientsNeedingReactivation(barbershopId, NOW);
    expect(result.find((c) => c.id === clientId)).toBeDefined();

    await recordReactivationSent(barbershopId, clientId, "wamid.reativ.1", daysAgo(40));

    result = await listClientsNeedingReactivation(barbershopId, NOW);
    expect(result.find((c) => c.id === clientId)).toBeUndefined();
  });

  it("cliente reativado que voltou a visitar e ficou inativo de novo reaparece", async () => {
    await setReactivationSettings(barbershopId, { reactivationAutomationEnabled: true, reactivationDailyCap: 50 });
    const clientId = await seedInactiveClient("Voltou E Sumiu De Novo", 60);

    await recordReactivationSent(barbershopId, clientId, "wamid.reativ.2", daysAgo(60));
    // Não deveria aparecer ainda (sem visita nova).
    let result = await listClientsNeedingReactivation(barbershopId, NOW);
    expect(result.find((c) => c.id === clientId)).toBeUndefined();

    // Cliente volta a visitar (mais recente que o snapshot do envio, mas ainda > 21 dias atrás).
    await registerVisit(barbershopId, clientId, { serviceLabel: "Corte", occurredAt: daysAgo(25) });

    result = await listClientsNeedingReactivation(barbershopId, NOW);
    expect(result.find((c) => c.id === clientId)).toBeDefined();
  });

  it("cliente com telefone anonimizado (exclusão LGPD) não aparece", async () => {
    await setReactivationSettings(barbershopId, { reactivationAutomationEnabled: true, reactivationDailyCap: 50 });
    const clientId = await seedInactiveClient("Anonimizado", 30);
    await deleteClient(barbershopId, clientId);

    const result = await listClientsNeedingReactivation(barbershopId, NOW);
    expect(result.find((c) => c.id === clientId)).toBeUndefined();
  });

  it("respeita reactivationDailyCap, priorizando os mais tempo inativos primeiro", async () => {
    const shop = await createBarbershop(`reativ-cap-${randomUUID()}`, "Reativação Cap Teste");
    await setReactivationSettings(shop.id, { reactivationAutomationEnabled: true, reactivationDailyCap: 2 });

    const older = await createClient(shop.id, { name: "Mais Antigo", phone: `5561${Date.now()}a` });
    await registerVisit(shop.id, older.client!.id, { serviceLabel: "Corte", occurredAt: daysAgo(90) });
    const middle = await createClient(shop.id, { name: "Meio Termo", phone: `5561${Date.now()}b` });
    await registerVisit(shop.id, middle.client!.id, { serviceLabel: "Corte", occurredAt: daysAgo(60) });
    const newest = await createClient(shop.id, { name: "Mais Recente", phone: `5561${Date.now()}c` });
    await registerVisit(shop.id, newest.client!.id, { serviceLabel: "Corte", occurredAt: daysAgo(30) });

    const result = await listClientsNeedingReactivation(shop.id, NOW);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toEqual([older.client!.id, middle.client!.id]);
  });
});
