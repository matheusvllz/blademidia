/**
 * Testes de integração da agregação de relatórios (Fase 3) contra Postgres
 * real (`DATABASE_URL`). Pulados sem banco, como os demais testes de
 * integração do monorepo.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createAppointment, setAppointmentStatus } from "./appointments";
import { createBarber } from "./barbers";
import { createBarbershop } from "./barbershops";
import { createClient } from "./clients";
import {
  getAppointmentPeriodStats,
  getNewClientsCount,
  getRevenueStats,
  getReportSnapshot,
  getServedClientsCount,
  getTopBarbers,
  getTopServices,
  upsertReportSnapshot,
} from "./reports";
import { createService } from "./services";
import { registerVisit } from "./visits";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const uniquePhone = () => `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;

describe.skipIf(!hasDatabase)("reports (agregação)", () => {
  let shopId: string;
  let serviceId: string;
  let barberId: string;
  let clientId: string;
  const periodFrom = new Date("2031-01-01T00:00:00Z");
  const periodTo = new Date("2031-02-01T00:00:00Z");

  beforeAll(async () => {
    const shop = await createBarbershop(`rep-${randomUUID()}`, "Relatórios Teste");
    shopId = shop.id;
    const service = await createService(shopId, { name: "Corte", durationMin: 30, priceCents: 4000 });
    serviceId = service.service!.id;
    const barber = await createBarber(shopId, { name: "Barbeiro Um" });
    barberId = barber.barber!.id;
    const client = await createClient(shopId, { name: "Cliente Rel", phone: uniquePhone() });
    clientId = client.client!.id;

    // Duas visitas COM valor dentro do período (jan/2031), uma SEM valor dentro
    // do período, uma FORA do período (não deve contar).
    await registerVisit(shopId, clientId, {
      serviceLabel: "Corte",
      serviceId,
      staffId: barberId,
      occurredAt: new Date("2031-01-05T12:00:00Z"),
      amountCents: 4000,
    });
    await registerVisit(shopId, clientId, {
      serviceLabel: "Corte",
      serviceId,
      staffId: barberId,
      occurredAt: new Date("2031-01-20T12:00:00Z"),
      amountCents: 6000,
    });
    await registerVisit(shopId, clientId, {
      serviceLabel: "Corte",
      serviceId,
      staffId: barberId,
      occurredAt: new Date("2031-01-25T12:00:00Z"),
      // sem valor
    });
    await registerVisit(shopId, clientId, {
      serviceLabel: "Corte",
      serviceId,
      staffId: barberId,
      occurredAt: new Date("2031-03-01T12:00:00Z"), // fora do período
      amountCents: 9999,
    });
  });

  it("getRevenueStats soma só o período, sinaliza atendimentos sem valor", async () => {
    const stats = await getRevenueStats(shopId, periodFrom, periodTo);
    expect(stats.revenueCents).toBe(10_000); // 4000 + 6000, ignora o de fora e o sem valor
    expect(stats.visitsCount).toBe(3); // as 3 de janeiro
    expect(stats.unpricedVisitsCount).toBe(1);
    expect(stats.avgTicketCents).toBe(5_000); // 10000 / 2 visitas com valor
  });

  it("getServedClientsCount conta clientes distintos no período", async () => {
    const count = await getServedClientsCount(shopId, periodFrom, periodTo);
    expect(count).toBe(1);
  });

  it("getNewClientsCount conta clientes criados no período", async () => {
    const count = await getNewClientsCount(shopId, periodFrom, periodTo);
    // o cliente foi criado "agora" (fora de jan/2031) — 0 nesse período.
    expect(count).toBe(0);
    const createdNow = await getNewClientsCount(
      shopId,
      new Date(Date.now() - 60_000),
      new Date(Date.now() + 60_000),
    );
    expect(createdNow).toBe(1);
  });

  it("getTopServices retorna o serviço com receita agregada", async () => {
    const rankings = await getTopServices(shopId, periodFrom, periodTo);
    expect(rankings).toHaveLength(1);
    expect(rankings[0]).toMatchObject({ serviceId, visitsCount: 3, revenueCents: 10_000 });
  });

  it("getTopBarbers retorna o barbeiro com receita agregada", async () => {
    const rankings = await getTopBarbers(shopId, periodFrom, periodTo);
    expect(rankings).toHaveLength(1);
    expect(rankings[0]).toMatchObject({ barberId, visitsCount: 3, revenueCents: 10_000 });
  });

  it("getAppointmentPeriodStats conta falta e cancelado, ignora os demais estados", async () => {
    const noShowAppt = await createAppointment(shopId, {
      clientId,
      barberId,
      serviceId,
      startsAt: new Date("2031-01-10T12:00:00Z"),
      endsAt: new Date("2031-01-10T12:30:00Z"),
    });
    const canceledAppt = await createAppointment(shopId, {
      clientId,
      barberId,
      serviceId,
      startsAt: new Date("2031-01-11T12:00:00Z"),
      endsAt: new Date("2031-01-11T12:30:00Z"),
    });
    const activeAppt = await createAppointment(shopId, {
      clientId,
      barberId,
      serviceId,
      startsAt: new Date("2031-01-12T12:00:00Z"),
      endsAt: new Date("2031-01-12T12:30:00Z"),
    });
    if (noShowAppt.error || canceledAppt.error || activeAppt.error) {
      throw new Error("seed de agendamento falhou");
    }
    await setAppointmentStatus(shopId, noShowAppt.appointment.id, "faltou");
    await setAppointmentStatus(shopId, canceledAppt.appointment.id, "cancelado");
    await setAppointmentStatus(shopId, activeAppt.appointment.id, "confirmado");

    const stats = await getAppointmentPeriodStats(shopId, periodFrom, periodTo);
    expect(stats.noShowCount).toBe(1);
    expect(stats.canceledCount).toBe(1);
  });

  it("upsertReportSnapshot é idempotente por (barbershop, ano, mês) e nunca escreve colunas da Fase 5", async () => {
    const input = {
      revenueCents: 10_000,
      visitsCount: 3,
      avgTicketCents: 5_000,
      newClientsCount: 0,
      servedClientsCount: 1,
      occupiedCount: 2,
      capacityCount: 10,
      noShowCount: 1,
      canceledCount: 1,
      topServices: [],
      topBarbers: [],
    };
    const first = await upsertReportSnapshot(shopId, 2031, 1, input);
    expect(first.revenueCents).toBe(10_000);
    expect(first.reactivatedCount).toBeNull();
    expect(first.noShowPreventedCount).toBeNull();
    expect(first.botMessagesCount).toBeNull();
    expect(first.recoveredRevenueCents).toBeNull();

    // rodar de novo com valores diferentes ATUALIZA a mesma linha, não duplica.
    const second = await upsertReportSnapshot(shopId, 2031, 1, { ...input, revenueCents: 12_000 });
    expect(second.id).toBe(first.id);
    expect(second.revenueCents).toBe(12_000);
    expect(second.reactivatedCount).toBeNull();

    const fetched = await getReportSnapshot(shopId, 2031, 1);
    expect(fetched?.id).toBe(first.id);
    expect(fetched?.revenueCents).toBe(12_000);
  });
});
