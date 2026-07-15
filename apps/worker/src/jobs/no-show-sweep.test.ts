/**
 * Testa a função de seleção/execução do job (`runNoShowSweep`), sem subir
 * pg-boss — o agendamento cron é só plumbing (validado manualmente no boot).
 * Precisa de Postgres real; pulado sem `DATABASE_URL`.
 */
import { bookAppointment } from "@blademidia/core";
import {
  createBarber,
  createBarbershop,
  createClient,
  createService,
  getAppointment,
  setWorkSchedules,
} from "@blademidia/db";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { runNoShowSweep } from "./no-show-sweep";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("runNoShowSweep", () => {
  let shopId: string;
  let serviceId: string;
  let barberId: string;
  let clientId: string;

  beforeAll(async () => {
    const shop = await createBarbershop(`worker-noshow-${randomUUID()}`, "Worker No-show");
    shopId = shop.id;
    const service = await createService(shopId, { name: "Corte", durationMin: 30 });
    serviceId = service.service!.id;
    const barber = await createBarber(shopId, { name: "Barbeiro" });
    barberId = barber.barber!.id;
    await setWorkSchedules(
      shopId,
      barberId,
      Array.from({ length: 7 }, (_, weekday) => ({ weekday, startTime: "00:00", endTime: "23:59" })),
    );
    const client = await createClient(shopId, { name: "Cliente", phone: `5561${Date.now()}` });
    clientId = client.client!.id;
  });

  it("marca falta em agendamento vencido além do limite e ignora o que ainda não venceu", async () => {
    const past = await bookAppointment(
      shopId,
      { clientId, serviceId, barberId, startsAt: new Date("2000-01-01T09:00:00Z") },
      new Date("2000-01-01T00:00:00Z"),
    );
    expect(past.ok).toBe(true);

    const future = await bookAppointment(
      shopId,
      { clientId, serviceId, barberId, startsAt: new Date("2099-01-01T09:00:00Z") },
      new Date("2000-01-01T00:00:00Z"),
    );
    expect(future.ok).toBe(true);

    const { processed } = await runNoShowSweep(new Date());
    expect(processed).toBeGreaterThanOrEqual(1);

    if (past.ok) {
      const updated = await getAppointment(shopId, past.value.id);
      expect(updated?.status).toBe("faltou");
    }
    if (future.ok) {
      const stillScheduled = await getAppointment(shopId, future.value.id);
      expect(stillScheduled?.status).toBe("agendado");
    }
  });

  it("rodar de novo não falha (idempotente)", async () => {
    const { processed } = await runNoShowSweep(new Date());
    expect(processed).toBeGreaterThanOrEqual(0);
  });
});
