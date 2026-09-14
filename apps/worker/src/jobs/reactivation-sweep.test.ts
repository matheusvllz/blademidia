/**
 * Precisa de Postgres real (`DATABASE_URL`); pulado sem banco, como os demais testes de
 * integração do monorepo.
 *
 * `resolveWhatsAppProvider` é mockado para devolver um `WhatsAppProvider` com um adapter fake
 * controlado pelo teste — mesmo padrão de `send-confirmation.test.ts`.
 */
import { randomUUID } from "node:crypto";
import {
  createBarbershop,
  createClient,
  findOrCreateConversation,
  getBarbershop,
  getLastReactivationSent,
  markOptOut,
  registerVisit,
  setReactivationSettings,
  setWhatsappPhoneNumberId,
} from "@blademidia/db";
import type { SendResult, SendTemplateInput } from "@blademidia/whatsapp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let sendTemplateCalls: SendTemplateInput[] = [];
let sendTemplateResult: (input: SendTemplateInput) => Promise<SendResult> = async () => ({
  ok: true,
  wamid: `fake.${randomUUID()}`,
});

/** Id de barbearia cuja `getBarbershop` deve lançar nesta execução — usado só pelo teste de
 * isolamento de falha por barbearia (achado durante a implementação: um erro transitório numa
 * barbearia não pode abortar a varredura das demais). */
let barbershopIdToFailOnGet: string | null = null;

vi.mock("@blademidia/db", async () => {
  const actual = await vi.importActual<typeof import("@blademidia/db")>("@blademidia/db");
  return {
    ...actual,
    getBarbershop: async (barbershopId: string) => {
      if (barbershopId === barbershopIdToFailOnGet) {
        throw new Error("falha simulada de conexão");
      }
      return actual.getBarbershop(barbershopId);
    },
  };
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

const { runReactivationSweep } = await import("./reactivation-sweep");

const hasDatabase = Boolean(process.env.DATABASE_URL);
const NOW = new Date("2027-06-01T00:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe.skipIf(!hasDatabase)("runReactivationSweep", () => {
  beforeEach(() => {
    sendTemplateCalls = [];
    sendTemplateResult = async () => ({ ok: true, wamid: `fake.${randomUUID()}` });
    barbershopIdToFailOnGet = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function seedReadyShop(prefix: string) {
    const shop = await createBarbershop(`${prefix}-${randomUUID()}`, prefix);
    await setWhatsappPhoneNumberId(shop.id, `wa-number-${randomUUID()}`);
    await setReactivationSettings(shop.id, { reactivationAutomationEnabled: true, reactivationDailyCap: 50 });
    return shop.id;
  }

  async function seedInactiveClient(shopId: string, name: string, visitDaysAgo: number) {
    const phone = `5561${Date.now()}${Math.floor(Math.random() * 100000)}`;
    const client = await createClient(shopId, { name, phone });
    await registerVisit(shopId, client.client!.id, { serviceLabel: "Corte", occurredAt: daysAgo(visitDaysAgo) });
    return { clientId: client.client!.id, phone };
  }

  it("envia o template com o primeiro nome e registra envio + mensagem", async () => {
    const shopId = await seedReadyShop("react-sweep-ok");
    const { clientId, phone } = await seedInactiveClient(shopId, "Cliente Sumido", 30);

    const result = await runReactivationSweep(NOW);
    expect(result.sent).toBeGreaterThanOrEqual(1);

    const call = sendTemplateCalls.find((c) => c.toPhone === phone);
    expect(call).toBeDefined();
    expect(call?.templateName).toBe("reativacao_cliente");
    expect(call?.bodyParams).toEqual(["Cliente"]);

    expect(await getLastReactivationSent(shopId, clientId)).not.toBeNull();
  });

  it("segunda execução não reenvia sem visita nova", async () => {
    const shopId = await seedReadyShop("react-sweep-once");
    const { phone } = await seedInactiveClient(shopId, "Cliente Sem Retorno", 40);

    await runReactivationSweep(NOW);
    const callsAfterFirst = sendTemplateCalls.filter((c) => c.toPhone === phone).length;
    expect(callsAfterFirst).toBe(1);

    await runReactivationSweep(NOW);
    const callsAfterSecond = sendTemplateCalls.filter((c) => c.toPhone === phone).length;
    expect(callsAfterSecond).toBe(1); // nenhuma chamada nova
  });

  it("cliente que volta a visitar e fica inativo de novo é reativado outra vez", async () => {
    const shopId = await seedReadyShop("react-sweep-cycle");
    const { clientId, phone } = await seedInactiveClient(shopId, "Cliente Volta E Some", 60);

    await runReactivationSweep(NOW);
    expect(sendTemplateCalls.filter((c) => c.toPhone === phone)).toHaveLength(1);

    await registerVisit(shopId, clientId, { serviceLabel: "Corte", occurredAt: daysAgo(25) });

    await runReactivationSweep(NOW);
    expect(sendTemplateCalls.filter((c) => c.toPhone === phone)).toHaveLength(2);
  });

  it("respeita o opt-out já registrado na conversa", async () => {
    const shopId = await seedReadyShop("react-sweep-optout");
    const { clientId, phone } = await seedInactiveClient(shopId, "Cliente Opt Out", 30);

    // Cria a conversa antecipadamente e marca opt-out, simulando um "PARE" anterior.
    const barbershop = await getBarbershop(shopId);
    const conversation = await findOrCreateConversation(shopId, barbershop!.whatsappPhoneNumberId!, phone, clientId);
    await markOptOut(shopId, conversation.id);

    await runReactivationSweep(NOW);
    const call = sendTemplateCalls.find((c) => c.toPhone === phone);
    expect(call).toBeUndefined(); // sendTemplate real recusa por opt-out antes de chamar o adapter
    expect(await getLastReactivationSent(shopId, clientId)).toBeNull(); // nenhum registro de envio criado
  });

  it("falha do provedor num cliente não impede os demais do mesmo lote", async () => {
    const shopId = await seedReadyShop("react-sweep-fail");
    const { phone: failPhone } = await seedInactiveClient(shopId, "Cliente Falha", 30);
    const { phone: okPhone } = await seedInactiveClient(shopId, "Cliente Ok", 31);

    sendTemplateResult = async (input) => {
      if (input.toPhone === failPhone) {
        return { ok: false, reason: "erro_provedor", detail: "simulado" };
      }
      return { ok: true, wamid: `fake.${randomUUID()}` };
    };

    const result = await runReactivationSweep(NOW);
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.sent).toBeGreaterThanOrEqual(1);
    expect(sendTemplateCalls.find((c) => c.toPhone === okPhone)).toBeDefined();
  });

  it("erro ao resolver uma barbearia não impede a varredura das demais", async () => {
    const shopThatFails = await seedReadyShop("react-sweep-shop-fail");
    await seedInactiveClient(shopThatFails, "Vítima Do Erro", 30);
    const shopOk = await seedReadyShop("react-sweep-shop-ok");
    const { phone: okPhone } = await seedInactiveClient(shopOk, "Barbearia Ok", 31);

    barbershopIdToFailOnGet = shopThatFails;

    const result = await runReactivationSweep(NOW);
    expect(sendTemplateCalls.find((c) => c.toPhone === okPhone)).toBeDefined();
    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("respeita reactivationDailyCap", async () => {
    // Não usa result.sent/result.failed globais de propósito: runReactivationSweep varre TODAS
    // as barbearias (mesmo padrão cross-tenant de no-show-sweep) — outros testes deste arquivo
    // podem deixar candidatos pendentes (ex.: o cliente de "falha do provedor", que nunca
    // chega a ser registrado como enviado). Escopar pelos telefones desta barbearia evita
    // depender da ordem/estado global da suíte.
    const shop = await createBarbershop(`react-sweep-cap-${randomUUID()}`, "React Sweep Cap");
    await setWhatsappPhoneNumberId(shop.id, `wa-number-${randomUUID()}`);
    await setReactivationSettings(shop.id, { reactivationAutomationEnabled: true, reactivationDailyCap: 1 });
    const primeiro = await seedInactiveClient(shop.id, "Primeiro", 90);
    const segundo = await seedInactiveClient(shop.id, "Segundo", 60);

    await runReactivationSweep(NOW);
    const callsThisShop = sendTemplateCalls.filter(
      (c) => c.toPhone === primeiro.phone || c.toPhone === segundo.phone,
    );
    expect(callsThisShop).toHaveLength(1); // só o mais antigo (90 dias) entra, cap=1
    expect(callsThisShop[0]?.toPhone).toBe(primeiro.phone);
  });

  it("nenhum log contém corpo de mensagem ou telefone completo", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const shopId = await seedReadyShop("react-sweep-log");
    const { phone } = await seedInactiveClient(shopId, "Cliente Log Teste", 30);

    await runReactivationSweep(NOW);

    const allLogs = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(allLogs).not.toContain("Cliente Log Teste");
    expect(allLogs).not.toContain(phone);
    logSpy.mockRestore();
  });
});
