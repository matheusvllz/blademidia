/**
 * Demonstração ponta a ponta (tasks.md 5.1), decidida na exploração (Bloqueante 3): o Done
 * técnico desta change fecha com o adapter DRY-RUN real (`resolveWhatsAppProvider` sem
 * credenciais), sem depender do template/BSP reais aprovados pela Meta. Diferente de
 * `send-confirmation.test.ts` (que mocka `@blademidia/whatsapp` para inspecionar chamadas),
 * este teste usa o pacote de verdade, sem mock — só força o dry-run via env, mesmo padrão de
 * `process-inbound.test.ts`.
 *
 * Fluxo demonstrado: agendamento entra na janela → job "enviaria" o template (log dry-run) →
 * registro de envio criado → resposta de confirmação do cliente simulada via
 * `confirmarAgendamentoTool` (o mesmo caminho que o loop de IA usaria) → status `confirmado`
 * no banco.
 */
import { randomUUID } from "node:crypto";
import {
  createAppointment,
  createBarber,
  createBarbershop,
  createClient,
  createService,
  getAppointment,
  setWhatsappPhoneNumberId,
  setWorkSchedules,
  updateAgendaSettings,
  wasReminderSent,
} from "@blademidia/db";
import { confirmarAgendamentoTool } from "@blademidia/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { runSendConfirmation } from "./send-confirmation";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("fluxo ponta a ponta (dry-run): lembrete → confirmação", () => {
  beforeAll(() => {
    // Força o adapter dry-run mesmo com as credenciais fake do .env (Decision 8 do design.md).
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("agendamento → lembrete (dry-run) → registro → confirmação do cliente → status confirmado", async () => {
    const shop = await createBarbershop(`e2e-confirmacao-${randomUUID()}`, "E2E Confirmação");
    await setWhatsappPhoneNumberId(shop.id, `wa-e2e-${randomUUID()}`);
    await updateAgendaSettings(shop.id, { confirmationAutomationEnabled: true });

    const client = await createClient(shop.id, { name: "Cliente E2E", phone: `5561${Date.now()}` });
    const barber = await createBarber(shop.id, { name: "Barbeiro E2E" });
    await setWorkSchedules(
      shop.id,
      barber.barber!.id,
      Array.from({ length: 7 }, (_, weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" })),
    );
    const service = await createService(shop.id, { name: "Corte", durationMin: 30 });

    const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const booked = await createAppointment(shop.id, {
      clientId: client.client!.id,
      barberId: barber.barber!.id,
      serviceId: service.service!.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
    });
    expect(booked.error).toBeNull();
    const appointmentId = booked.appointment!.id;

    // 1) job "enviaria" o template — dry-run real, sem rede.
    const result = await runSendConfirmation();
    expect(result.sent).toBeGreaterThanOrEqual(1);

    // 2) registro de envio único criado.
    expect(await wasReminderSent(shop.id, appointmentId)).toBe(true);
    const afterSend = await getAppointment(shop.id, appointmentId);
    expect(afterSend?.status).toBe("agendado"); // lembrete não confirma sozinho

    // 3) resposta de confirmação do cliente simulada — mesma tool que o loop de IA chamaria.
    const confirmResult = await confirmarAgendamentoTool.handler(shop.id, { appointmentId });
    expect(confirmResult).toMatchObject({ ok: true, value: { status: "confirmado" } });

    // 4) status final confirmado no banco.
    const afterConfirm = await getAppointment(shop.id, appointmentId);
    expect(afterConfirm?.status).toBe("confirmado");
  });
});
