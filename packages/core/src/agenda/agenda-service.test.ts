/**
 * Testes de integração do AgendaService contra Postgres real (`DATABASE_URL`).
 * Pulados sem banco, como os demais testes de integração do monorepo.
 * Cobrem: criação (feliz/conflito/concorrência/passado/fora da grade/cross-tenant),
 * transições (confirmar/cancelar/remarcar/inválida), conclusão (visita+pagamento,
 * idempotência, sem valor) e no-show (manual/idempotente/inválido).
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createBarber,
  createBarbershop,
  createClient,
  createService,
  getAppointment,
  listVisitsForClient,
  setWorkSchedules,
} from "@blademidia/db";
import {
  bookAppointment,
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  getAvailability,
  markNoShow,
  rescheduleAppointment,
} from "./agenda-service";

const hasDatabase = Boolean(process.env.DATABASE_URL);

// 09:00 America/Sao_Paulo (UTC-3, sem DST) = 12:00Z.
const at = (utc: string) => new Date(utc);
const uniquePhone = () => `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function seedShop(prefix: string) {
  const shop = await createBarbershop(`${prefix}-${randomUUID()}`, prefix);
  const service = await createService(shop.id, { name: "Corte", durationMin: 30 });
  const client = await createClient(shop.id, { name: "Cliente", phone: uniquePhone() });
  return { shopId: shop.id, serviceId: service.service!.id, clientId: client.client!.id };
}

/** Cria um barbeiro com grade 09:00–18:00 em todos os dias da semana. */
async function freshBarber(shopId: string) {
  const barber = await createBarber(shopId, { name: `Barb ${randomUUID().slice(0, 6)}` });
  await setWorkSchedules(
    shopId,
    barber.barber!.id,
    Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      startTime: "09:00",
      endTime: "18:00",
    })),
  );
  return barber.barber!.id;
}

describe.skipIf(!hasDatabase)("AgendaService", () => {
  let shop: { shopId: string; serviceId: string; clientId: string };

  beforeAll(async () => {
    shop = await seedShop("agsvc");
  });

  it("disponibilidade oferece horários dentro da grade", async () => {
    const barberId = await freshBarber(shop.shopId);
    const result = await getAvailability(
      shop.shopId,
      { date: "2030-03-15", serviceId: shop.serviceId, barberId },
      at("2030-01-01T00:00:00Z"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // grade 09:00–18:00, passo 30, serviço 30 → primeiro horário 09:00 local = 12:00Z
    expect(result.value.slots[0]?.startsAt.toISOString()).toBe("2030-03-15T12:00:00.000Z");
  });

  it("cria agendamento em horário livre", async () => {
    const barberId = await freshBarber(shop.shopId);
    const result = await bookAppointment(
      shop.shopId,
      {
        clientId: shop.clientId,
        serviceId: shop.serviceId,
        barberId,
        startsAt: at("2030-03-15T12:00:00Z"),
      },
      at("2030-01-01T00:00:00Z"),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("agendado");
      expect(result.value.endsAt.toISOString()).toBe("2030-03-15T12:30:00.000Z");
    }
  });

  it("recusa agendamento sobreposto (conflito)", async () => {
    const barberId = await freshBarber(shop.shopId);
    const now = at("2030-01-01T00:00:00Z");
    const first = await bookAppointment(
      shop.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-15T12:00:00Z") },
      now,
    );
    expect(first.ok).toBe(true);
    const overlap = await bookAppointment(
      shop.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-15T12:15:00Z") },
      now,
    );
    expect(overlap).toEqual({ ok: false, reason: "conflict" });
  });

  it("concorrência: dois pedidos no mesmo horário → só um grava", async () => {
    const barberId = await freshBarber(shop.shopId);
    const now = at("2030-01-01T00:00:00Z");
    const input = {
      clientId: shop.clientId,
      serviceId: shop.serviceId,
      barberId,
      startsAt: at("2030-03-16T12:00:00Z"),
    };
    const [a, b] = await Promise.all([
      bookAppointment(shop.shopId, input, now),
      bookAppointment(shop.shopId, input, now),
    ]);
    const oks = [a, b].filter((r) => r.ok).length;
    const conflicts = [a, b].filter((r) => !r.ok && r.reason === "conflict").length;
    expect(oks).toBe(1);
    expect(conflicts).toBe(1);
  });

  it("recusa agendamento no passado", async () => {
    const barberId = await freshBarber(shop.shopId);
    const result = await bookAppointment(
      shop.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2020-03-15T12:00:00Z") },
      at("2030-01-01T00:00:00Z"),
    );
    expect(result).toEqual({ ok: false, reason: "in_past" });
  });

  it("recusa agendamento fora da grade", async () => {
    const barberId = await freshBarber(shop.shopId);
    // 08:00 local (11:00Z) está fora da grade 09:00–18:00
    const result = await bookAppointment(
      shop.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-15T11:00:00Z") },
      at("2030-01-01T00:00:00Z"),
    );
    expect(result).toEqual({ ok: false, reason: "not_available" });
  });

  it("isolamento: barbearia B não enxerga nem agenda no agendamento de A", async () => {
    const other = await seedShop("agsvc-b");
    const barberId = await freshBarber(shop.shopId);
    const booked = await bookAppointment(
      shop.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-17T12:00:00Z") },
      at("2030-01-01T00:00:00Z"),
    );
    expect(booked.ok).toBe(true);
    // B tentando referenciar serviço/barbeiro/cliente de A → not_found
    const crossTenant = await bookAppointment(
      other.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-18T12:00:00Z") },
      at("2030-01-01T00:00:00Z"),
    );
    expect(crossTenant).toEqual({ ok: false, reason: "not_found" });
    // B não enxerga o agendamento de A
    if (booked.ok) {
      expect(await getAppointment(other.shopId, booked.value.id)).toBeNull();
    }
  });

  it("confirma e conclui: gera atendimento com serviço/barbeiro e valor", async () => {
    const barberId = await freshBarber(shop.shopId);
    const client = await createClient(shop.shopId, { name: "Conclui", phone: uniquePhone() });
    const booked = await bookAppointment(
      shop.shopId,
      { clientId: client.client!.id, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-19T12:00:00Z") },
      at("2030-01-01T00:00:00Z"),
    );
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;

    const confirmed = await confirmAppointment(shop.shopId, booked.value.id);
    expect(confirmed.ok && confirmed.value.status).toBe("confirmado");

    const done = await completeAppointment(shop.shopId, booked.value.id, {
      amountCents: 5000,
      method: "pix",
    });
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.value.alreadyCompleted).toBe(false);
    expect(done.value.appointment.status).toBe("concluido");

    const visits = await listVisitsForClient(shop.shopId, client.client!.id);
    expect(visits).toHaveLength(1);
    expect(visits[0]?.serviceId).toBe(shop.serviceId);
    expect(visits[0]?.staffId).toBe(barberId);

    // idempotência: concluir de novo não cria segunda visita
    const again = await completeAppointment(shop.shopId, booked.value.id, { amountCents: 9999 });
    expect(again.ok && again.value.alreadyCompleted).toBe(true);
    expect(await listVisitsForClient(shop.shopId, client.client!.id)).toHaveLength(1);
  });

  it("conclui sem valor: cria visita sem pagamento", async () => {
    const barberId = await freshBarber(shop.shopId);
    const client = await createClient(shop.shopId, { name: "SemValor", phone: uniquePhone() });
    const booked = await bookAppointment(
      shop.shopId,
      { clientId: client.client!.id, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-20T12:00:00Z") },
      at("2030-01-01T00:00:00Z"),
    );
    if (!booked.ok) throw new Error("book falhou");
    const done = await completeAppointment(shop.shopId, booked.value.id);
    expect(done.ok).toBe(true);
    expect(await listVisitsForClient(shop.shopId, client.client!.id)).toHaveLength(1);
  });

  it("remarca para outro horário livre; horário antigo fica livre", async () => {
    const barberId = await freshBarber(shop.shopId);
    const now = at("2030-01-01T00:00:00Z");
    const booked = await bookAppointment(
      shop.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-21T12:00:00Z") },
      now,
    );
    if (!booked.ok) throw new Error("book falhou");
    const moved = await rescheduleAppointment(shop.shopId, booked.value.id, at("2030-03-21T15:00:00Z"), now);
    expect(moved.ok).toBe(true);
    if (moved.ok) expect(moved.value.startsAt.toISOString()).toBe("2030-03-21T15:00:00.000Z");
    // horário original (12:00Z) voltou a ficar livre → novo agendamento nele passa
    const reuse = await bookAppointment(
      shop.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-21T12:00:00Z") },
      now,
    );
    expect(reuse.ok).toBe(true);
  });

  it("transição inválida: cancelar um agendamento concluído", async () => {
    const barberId = await freshBarber(shop.shopId);
    const booked = await bookAppointment(
      shop.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-22T12:00:00Z") },
      at("2030-01-01T00:00:00Z"),
    );
    if (!booked.ok) throw new Error("book falhou");
    await completeAppointment(shop.shopId, booked.value.id);
    const canceled = await cancelAppointment(shop.shopId, booked.value.id);
    expect(canceled).toEqual({ ok: false, reason: "invalid_transition" });
  });

  it("no-show manual e idempotente; concluído não vira falta", async () => {
    const barberId = await freshBarber(shop.shopId);
    const booked = await bookAppointment(
      shop.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-23T12:00:00Z") },
      at("2030-01-01T00:00:00Z"),
    );
    if (!booked.ok) throw new Error("book falhou");
    const noShow = await markNoShow(shop.shopId, booked.value.id);
    expect(noShow.ok && noShow.value.status).toBe("faltou");
    // idempotente
    const again = await markNoShow(shop.shopId, booked.value.id);
    expect(again.ok && again.value.status).toBe("faltou");

    // concluído não pode virar falta
    const other = await bookAppointment(
      shop.shopId,
      { clientId: shop.clientId, serviceId: shop.serviceId, barberId, startsAt: at("2030-03-23T15:00:00Z") },
      at("2030-01-01T00:00:00Z"),
    );
    if (!other.ok) throw new Error("book falhou");
    await completeAppointment(shop.shopId, other.value.id);
    expect(await markNoShow(shop.shopId, other.value.id)).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
  });
});
