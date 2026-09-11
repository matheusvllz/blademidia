/**
 * Precisa de Postgres real (`DATABASE_URL`); pulado sem banco, como os demais testes de
 * integração do monorepo.
 *
 * `resolveWhatsAppProvider` é mockado para devolver um `WhatsAppProvider` com um adapter fake
 * controlado pelo teste — permite inspecionar os `bodyParams` enviados e simular falha do
 * provedor, o que o adapter dry-run real (sempre `ok: true`) não permite. Mesmo padrão de
 * `vi.mock` já usado em `process-inbound.test.ts` para `@blademidia/ai`.
 */
import { randomUUID } from "node:crypto";
import {
  createAppointment,
  createBarber,
  createBarbershop,
  createClient,
  createService,
  getAppointment,
  listMessages,
  setAppointmentStatus,
  setWhatsappPhoneNumberId,
  setWorkSchedules,
  updateAgendaSettings,
  wasReminderSent,
} from "@blademidia/db";
import type { SendResult, SendTemplateInput } from "@blademidia/whatsapp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let sendTemplateCalls: SendTemplateInput[] = [];
let sendTemplateResult: (input: SendTemplateInput) => Promise<SendResult> = async () => ({
  ok: true,
  wamid: `fake.${randomUUID()}`,
});

vi.mock("@blademidia/whatsapp", async () => {
  const actual = await vi.importActual<typeof import("@blademidia/whatsapp")>("@blademidia/whatsapp");
  return {
    ...actual,
    resolveWhatsAppProvider: () =>
      new actual.WhatsAppProvider({
        async sendText(): Promise<SendResult> {
          throw new Error("sendText não deveria ser chamado por este job");
        },
        async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
          sendTemplateCalls.push(input);
          return sendTemplateResult(input);
        },
        verifySignature: () => true,
        respondToChallenge: (params: URLSearchParams) => params.get("hub.challenge"),
        normalizeWebhookPayload: () => [],
      }),
  };
});

const { runSendConfirmation } = await import("./send-confirmation");

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("runSendConfirmation", () => {
  beforeEach(() => {
    sendTemplateCalls = [];
    sendTemplateResult = async () => ({ ok: true, wamid: `fake.${randomUUID()}` });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function seedReadyShop(prefix: string) {
    const shop = await createBarbershop(`${prefix}-${randomUUID()}`, prefix);
    await setWhatsappPhoneNumberId(shop.id, `wa-number-${randomUUID()}`);
    await updateAgendaSettings(shop.id, { confirmationAutomationEnabled: true });
    const phone = `5561${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const client = await createClient(shop.id, { name: "Cliente Confirmação", phone });
    const barber = await createBarber(shop.id, { name: "Barbeiro" });
    await setWorkSchedules(
      shop.id,
      barber.barber!.id,
      Array.from({ length: 7 }, (_, weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" })),
    );
    const service = await createService(shop.id, { name: "Corte", durationMin: 30 });
    return {
      shopId: shop.id,
      clientId: client.client!.id,
      clientPhone: phone,
      barberId: barber.barber!.id,
      serviceId: service.service!.id,
    };
  }

  async function bookWithinWindow(shop: Awaited<ReturnType<typeof seedReadyShop>>, hoursFromNow: number) {
    const startsAt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    const result = await createAppointment(shop.shopId, {
      clientId: shop.clientId,
      barberId: shop.barberId,
      serviceId: shop.serviceId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
    });
    expect(result.error).toBeNull();
    return result.appointment!.id;
  }

  it("envia o template com os bodyParams certos e registra envio + mensagem", async () => {
    const shop = await seedReadyShop("send-conf-ok");
    const apptId = await bookWithinWindow(shop, 2);

    const result = await runSendConfirmation();
    expect(result.sent).toBeGreaterThanOrEqual(1);

    // Filtra pelo telefone deste teste (não só pelo nome do template) — o lote pode conter
    // candidatos de outros agendamentos criados por outros `it` do mesmo arquivo.
    const call = sendTemplateCalls.find((c) => c.toPhone === shop.clientPhone);
    expect(call).toBeDefined();
    expect(call?.templateName).toBe("confirmacao_agendamento");
    expect(call?.bodyParams).toHaveLength(3);
    expect(call?.bodyParams[0]).toBe("Cliente"); // primeiro nome de "Cliente Confirmação"

    expect(await wasReminderSent(shop.shopId, apptId)).toBe(true);

    const appt = await getAppointment(shop.shopId, apptId);
    expect(appt?.status).toBe("agendado"); // envio do lembrete não muda o status — só a resposta do cliente muda
  });

  it("segunda execução não reenvia o mesmo agendamento", async () => {
    const shop = await seedReadyShop("send-conf-once");
    await bookWithinWindow(shop, 3);

    await runSendConfirmation();
    const callsAfterFirst = sendTemplateCalls.length;

    await runSendConfirmation();
    expect(sendTemplateCalls.length).toBe(callsAfterFirst); // nenhuma chamada nova
  });

  it("agendamento que muda de status entre seleção e envio é pulado sem erro", async () => {
    const shop = await seedReadyShop("send-conf-race");
    const apptId = await bookWithinWindow(shop, 4);
    await setAppointmentStatus(shop.shopId, apptId, "cancelado");

    const result = await runSendConfirmation();
    expect(sendTemplateCalls.find((c) => c.toPhone)).toBeUndefined();
    expect(result.sent).toBe(0);
  });

  it("falha do provedor num agendamento não impede os demais do mesmo lote", async () => {
    const shopFail = await seedReadyShop("send-conf-fail");
    await bookWithinWindow(shopFail, 5);
    const shopOk = await seedReadyShop("send-conf-ok2");
    const okApptId = await bookWithinWindow(shopOk, 5);

    // Falha determinística por telefone (não por ordem de processamento — o lote pode conter
    // candidatos de outros testes/tenants na mesma suíte, ver runNoShowSweep.test.ts para o
    // mesmo cuidado com sweeps cross-tenant).
    sendTemplateResult = async (input) => {
      if (input.toPhone === shopFail.clientPhone) {
        return { ok: false, reason: "erro_provedor", detail: "simulado" };
      }
      return { ok: true, wamid: `fake.${randomUUID()}` };
    };

    const result = await runSendConfirmation();
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.sent).toBeGreaterThanOrEqual(1);
    expect(await wasReminderSent(shopOk.shopId, okApptId)).toBe(true);
  });

  it("nenhum log contém corpo de mensagem ou telefone completo", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const shop = await seedReadyShop("send-conf-log");
    await bookWithinWindow(shop, 6);

    await runSendConfirmation();

    const allLogs = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(allLogs).not.toContain("Cliente Confirmação");
    expect(allLogs).not.toMatch(/5561\d{6,}/); // telefone completo nunca aparece, só mascarado (***XXXX)
    logSpy.mockRestore();
  });
});
