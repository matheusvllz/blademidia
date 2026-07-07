/**
 * Teste de isolamento entre tenants — DoD do ADR-0007 ("dado A do tenant 1,
 * o tenant 2 não o vê"). Precisa de Postgres real (`DATABASE_URL` apontando
 * pro docker-compose.yml da raiz ou equivalente); pulado automaticamente se
 * não houver banco configurado, para não quebrar `pnpm test` sem Docker.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBarbershop } from "./barbershops";
import { createClient, getClient, listClients } from "./clients";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("isolamento entre barbearias (clients)", () => {
  let barbershopA: { id: string };
  let barbershopB: { id: string };

  beforeAll(async () => {
    barbershopA = await createBarbershop(`teste-a-${randomUUID()}`, "Barbearia Teste A");
    barbershopB = await createBarbershop(`teste-b-${randomUUID()}`, "Barbearia Teste B");
  });

  it("cliente da barbearia A não aparece na listagem da barbearia B", async () => {
    const created = await createClient(barbershopA.id, {
      name: "Cliente Só de A",
      phone: `5561${Date.now()}`,
    });
    expect(created.error).toBeNull();

    const clientsOfB = await listClients(barbershopB.id);
    expect(clientsOfB.find((c) => c.id === created.client?.id)).toBeUndefined();
  });

  it("getClient com barbershopId errado retorna null, nunca o dado de outro tenant", async () => {
    const created = await createClient(barbershopA.id, {
      name: "Outro Cliente de A",
      phone: `5561${Date.now() + 1}`,
    });
    expect(created.error).toBeNull();
    const asWrongTenant = await getClient(barbershopB.id, created.client!.id);
    expect(asWrongTenant).toBeNull();
  });
});
