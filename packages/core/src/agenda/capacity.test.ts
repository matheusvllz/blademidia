/**
 * Testes de integração de capacidade/ocupação (ADR-0010) contra Postgres real
 * (`DATABASE_URL`). Pulados sem banco, como os demais testes de integração do
 * monorepo. Cobrem: capacidade com grade simples, exceção (folga zera o dia),
 * barbearia sem grade (capacidade 0, sem erro), ocupação contando só estados
 * ativos (cancelado não conta) e filtro por barbeiro.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createAppointment,
  createBarber,
  createBarbershop,
  createClient,
  createException,
  createService,
  setAppointmentStatus,
  setWorkSchedules,
} from "@blademidia/db";
import { computeCapacity, computeOccupancy } from "./capacity";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const uniquePhone = () => `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function seedShop(prefix: string) {
  const shop = await createBarbershop(`${prefix}-${randomUUID()}`, prefix);
  const service = await createService(shop.id, { name: "Corte", durationMin: 30 });
  const client = await createClient(shop.id, { name: "Cliente", phone: uniquePhone() });
  return { shopId: shop.id, serviceId: service.service!.id, clientId: client.client!.id };
}

/** Barbeiro com grade 09:00–12:00 (6 slots de 30min) todo dia da semana. */
async function freshBarber(shopId: string) {
  const barber = await createBarber(shopId, { name: `Barb ${randomUUID().slice(0, 6)}` });
  await setWorkSchedules(
    shopId,
    barber.barber!.id,
    Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      startTime: "09:00",
      endTime: "12:00",
    })),
  );
  return barber.barber!.id;
}

describe.skipIf(!hasDatabase)("capacity", () => {
  let shop: { shopId: string; serviceId: string; clientId: string };

  beforeAll(async () => {
    shop = await seedShop("cap");
  });

  it("computeCapacity soma os slots da grade num único dia (09-12, passo 30 = 6 slots)", async () => {
    const barberId = await freshBarber(shop.shopId);
    // 2030-03-18 é uma segunda-feira (weekday 1) — grade cobre todos os dias.
    const capacity = await computeCapacity(shop.shopId, "2030-03-18", "2030-03-18", barberId);
    expect(capacity).toBe(6);
  });

  it("computeCapacity soma vários dias (3 dias × 6 slots = 18)", async () => {
    const barberId = await freshBarber(shop.shopId);
    const capacity = await computeCapacity(shop.shopId, "2030-04-01", "2030-04-03", barberId);
    expect(capacity).toBe(18);
  });

  it("folga zera a capacidade do dia", async () => {
    const barberId = await freshBarber(shop.shopId);
    await createException(shop.shopId, { barberId, date: "2030-05-10", kind: "folga" });
    const capacity = await computeCapacity(shop.shopId, "2030-05-10", "2030-05-10", barberId);
    expect(capacity).toBe(0);
  });

  it("barbearia sem grade → capacidade 0, sem erro", async () => {
    const emptyShop = await seedShop("cap-empty");
    const capacity = await computeCapacity(emptyShop.shopId, "2030-06-01", "2030-06-01");
    expect(capacity).toBe(0);
  });

  it("computeOccupancy conta agendamentos ativos, ignora cancelado", async () => {
    const barberId = await freshBarber(shop.shopId);
    const date = "2030-07-15"; // segunda
    const booked1 = await createAppointment(shop.shopId, {
      clientId: shop.clientId,
      serviceId: shop.serviceId,
      barberId,
      startsAt: new Date("2030-07-15T12:00:00Z"), // 09:00 local
      endsAt: new Date("2030-07-15T12:30:00Z"),
    });
    const booked2 = await createAppointment(shop.shopId, {
      clientId: shop.clientId,
      serviceId: shop.serviceId,
      barberId,
      startsAt: new Date("2030-07-15T13:00:00Z"), // 10:00 local
      endsAt: new Date("2030-07-15T13:30:00Z"),
    });
    const canceled = await createAppointment(shop.shopId, {
      clientId: shop.clientId,
      serviceId: shop.serviceId,
      barberId,
      startsAt: new Date("2030-07-15T14:00:00Z"), // 11:00 local
      endsAt: new Date("2030-07-15T14:30:00Z"),
    });
    if (booked1.error || booked2.error || canceled.error) {
      throw new Error("seed de agendamento falhou no teste de ocupação");
    }
    await setAppointmentStatus(shop.shopId, booked1.appointment.id, "confirmado");
    await setAppointmentStatus(shop.shopId, booked2.appointment.id, "concluido");
    await setAppointmentStatus(shop.shopId, canceled.appointment.id, "cancelado");

    const result = await computeOccupancy(shop.shopId, date, date, barberId);
    expect(result).toEqual({ occupied: 2, capacity: 6 });
  });

  it("computeOccupancy sem grade → capacidade 0, sem divisão por zero/erro", async () => {
    const emptyShop = await seedShop("cap-empty-occ");
    const result = await computeOccupancy(emptyShop.shopId, "2030-08-01", "2030-08-01");
    expect(result).toEqual({ occupied: 0, capacity: 0 });
  });
});
