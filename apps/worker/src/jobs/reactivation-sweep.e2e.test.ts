/**
 * Demonstração ponta a ponta (tasks.md 4.1), mesmo critério decidido em
 * `add-confirmacao-agendamento` (Bloqueante 3, herdado nesta change): o Done técnico fecha com
 * o adapter DRY-RUN real (`createDryRunAdapter`), sem depender do template/BSP reais aprovados
 * pela Meta. Diferente de `reactivation-sweep.test.ts` (que mocka `sendTemplate` para
 * inspecionar chamadas), este teste usa o adapter dry-run de verdade, injetado diretamente via
 * o parâmetro `provider` de `runReactivationSweep` — sem `vi.mock`/`vi.stubEnv` nenhum (achado:
 * mockar `@blademidia/whatsapp` com fábricas diferentes neste arquivo e em
 * `reactivation-sweep.test.ts` causava flakiness real ao rodar os dois juntos; a injeção
 * direta elimina a fonte do problema em vez de contorná-la).
 */
import { randomUUID } from "node:crypto";
import {
  createBarbershop,
  createClient,
  getLastReactivationSent,
  registerVisit,
  setReactivationSettings,
  setWhatsappPhoneNumberId,
} from "@blademidia/db";
import { WhatsAppProvider, createDryRunAdapter } from "@blademidia/whatsapp";
import { describe, expect, it } from "vitest";
import { runReactivationSweep } from "./reactivation-sweep";

const dryRunProvider = new WhatsAppProvider(createDryRunAdapter());

const hasDatabase = Boolean(process.env.DATABASE_URL);
const NOW = new Date("2027-06-01T00:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe.skipIf(!hasDatabase)("fluxo ponta a ponta (dry-run): cliente inativo → lembrete de reativação", () => {
  it("cliente inativo → lembrete (dry-run) → registro → segunda execução não reenvia", async () => {
    const shop = await createBarbershop(`e2e-reativacao-${randomUUID()}`, "E2E Reativação");
    await setWhatsappPhoneNumberId(shop.id, `wa-e2e-${randomUUID()}`);
    await setReactivationSettings(shop.id, { reactivationAutomationEnabled: true, reactivationDailyCap: 10 });

    const client = await createClient(shop.id, { name: "Cliente E2E Sumido", phone: `5561${Date.now()}` });
    await registerVisit(shop.id, client.client!.id, { serviceLabel: "Corte", occurredAt: daysAgo(40) });

    // 1) job "enviaria" o template — dry-run real, sem rede.
    const first = await runReactivationSweep(NOW, dryRunProvider);
    expect(first.sent).toBeGreaterThanOrEqual(1);

    // 2) registro de envio criado.
    const sent = await getLastReactivationSent(shop.id, client.client!.id);
    expect(sent).not.toBeNull();

    // 3) segunda execução, sem visita nova, não reenvia (o cliente específico não gera nova
    // chamada — validado indiretamente pelo registro permanecer o mesmo).
    const second = await runReactivationSweep(NOW, dryRunProvider);
    const sentAfterSecond = await getLastReactivationSent(shop.id, client.client!.id);
    expect(sentAfterSecond?.id).toBe(sent!.id); // mesmo registro — não houve novo envio
    void second;
  });
});
