import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createAppointment, createBarber, createBarbershop, createClient, createService, findOrCreateConversation, setWorkSchedules } from "@blademidia/db";
import { executeDomainTool, getBotTools, wasDomainToolCalled } from "./index";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("getBotTools", () => {
  it("expõe as 5 tools de agenda + a de cadastro, todas com schema Zod", () => {
    const tools = getBotTools();
    expect(tools.map((t) => t.name)).toEqual([
      "consultar_disponibilidade",
      "criar_agendamento",
      "remarcar_agendamento",
      "cancelar_agendamento",
      "confirmar_agendamento",
      "cadastrar_cliente_basico",
    ]);
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("não expõe a tool de escalação (é local ao loop, design.md Decision 2)", () => {
    const tools = getBotTools();
    expect(tools.some((t) => t.name === "escalar_para_humano")).toBe(false);
  });
});

describe("executeDomainTool", () => {
  const dummyContext = { conversationId: "conv-1", phone: "+5511900000000" };

  it("lança erro para tool desconhecida (sem chamar nenhum handler)", async () => {
    await expect(
      executeDomainTool("shop-1", "tool_inexistente", {}, dummyContext),
    ).rejects.toThrow(/desconhecida/);
  });

  it("valida a entrada pelo schema antes de delegar ao handler", async () => {
    await expect(
      executeDomainTool("shop-1", "criar_agendamento", { clientId: "c1" }, dummyContext),
    ).rejects.toThrow();
  });

  it.skipIf(!hasDatabase)(
    "despacha cadastrar_cliente_basico com o telefone do contexto, nunca do input do modelo",
    async () => {
      const shop = await createBarbershop(`tools-idx-${randomUUID()}`, "Tools Index Teste");
      const phone = `5561${Date.now()}`;
      const conversation = await findOrCreateConversation(shop.id, "wa-x", phone, null);

      // O modelo tenta smuggling de um telefone diferente — deve ser ignorado (schema não
      // aceita esse campo; nem seria repassado ao createClient de qualquer forma).
      const result = (await executeDomainTool(
        shop.id,
        "cadastrar_cliente_basico",
        { nome: "Cliente Teste", phone: "+5599999999999" },
        { conversationId: conversation.id, phone },
      )) as { client: { phone: string } | null };
      expect(result.client?.phone).toBe(phone);
    },
  );

  it.skipIf(!hasDatabase)(
    "despacha confirmar_agendamento (change add-confirmacao-agendamento) via agendaTools, sem mudança nesta camada",
    async () => {
      const shop = await createBarbershop(`tools-idx-confirma-${randomUUID()}`, "Tools Index Confirma");
      const client = await createClient(shop.id, { name: "Cliente", phone: `5561${Date.now()}` });
      const barber = await createBarber(shop.id, { name: "Barbeiro" });
      await setWorkSchedules(
        shop.id,
        barber.barber!.id,
        Array.from({ length: 7 }, (_, weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" })),
      );
      const service = await createService(shop.id, { name: "Corte", durationMin: 30 });
      const appt = await createAppointment(shop.id, {
        clientId: client.client!.id,
        barberId: barber.barber!.id,
        serviceId: service.service!.id,
        startsAt: new Date("2027-05-10T13:00:00Z"),
        endsAt: new Date("2027-05-10T13:30:00Z"),
      });
      expect(appt.error).toBeNull();

      const dummyContext = { conversationId: "conv-1", phone: "+5511900000000" };
      const result = (await executeDomainTool(
        shop.id,
        "confirmar_agendamento",
        { appointmentId: appt.appointment!.id },
        dummyContext,
      )) as { ok: boolean; value?: { status: string } };
      expect(result).toMatchObject({ ok: true, value: { status: "confirmado" } });
    },
  );
});

describe("wasDomainToolCalled", () => {
  it("é true para tools de domínio", () => {
    expect(wasDomainToolCalled("consultar_disponibilidade")).toBe(true);
    expect(wasDomainToolCalled("cadastrar_cliente_basico")).toBe(true);
    expect(wasDomainToolCalled("confirmar_agendamento")).toBe(true);
  });

  it("é false para a tool de escalação", () => {
    expect(wasDomainToolCalled("escalar_para_humano")).toBe(false);
  });
});
