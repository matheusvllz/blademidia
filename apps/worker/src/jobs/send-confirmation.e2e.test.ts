/**
 * Demonstração ponta a ponta (tasks.md 5.1), decidida na exploração (Bloqueante 3): o Done
 * técnico desta change fecha com o adapter DRY-RUN real (`createDryRunAdapter`), sem depender
 * do template/BSP reais aprovados pela Meta. Diferente de `send-confirmation.test.ts` (que
 * mocka `sendTemplate` para inspecionar chamadas), este teste usa o adapter dry-run de
 * verdade, injetado diretamente via o parâmetro `provider` de `runSendConfirmation` — sem
 * `vi.mock`/`vi.stubEnv` nenhum (achado, change `add-reativacao-clientes`: mockar
 * `@blademidia/whatsapp` com fábricas diferentes neste arquivo e em
 * `reactivation-sweep.test.ts` causava flakiness real ao rodar os dois juntos; a injeção
 * direta elimina a fonte do problema em vez de contorná-la).
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
import { WhatsAppProvider, createDryRunAdapter } from "@blademidia/whatsapp";
import { describe, expect, it } from "vitest";
import { runSendConfirmation } from "./send-confirmation";

const dryRunProvider = new WhatsAppProvider(createDryRunAdapter());

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("fluxo ponta a ponta (dry-run): lembrete → confirmação", () => {
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
    const result = await runSendConfirmation(new Date(), dryRunProvider);
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
