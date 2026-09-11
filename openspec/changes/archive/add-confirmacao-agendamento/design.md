# Design: Confirmação automática de agendamento

> Etapa 6 do fluxo. Decisões técnicas — a spec (proposal.md + specs/) já está aprovada
> (etapa 5). Nenhum requisito novo nasce aqui; se algo faltar, volta para a spec.

## Visão geral

O terreno já existe quase todo (`add-whatsapp-canal` e `add-atendimento-ia`). Esta change liga
três pontas que já estavam prontas para isso, mais uma peça que faltava:

```text
apps/worker/src/jobs/send-confirmation.ts (cron 0 * * * *)
  │
  ├─ 1. seleciona agendamentos elegíveis (query nova, com os 2 gates)
  ├─ 2. relê o status do agendamento (defesa contra race)
  ├─ 3. resolve/cria a conversa (findOrCreateConversation, packages/db)
  ├─ 4. WhatsAppProvider.sendTemplate(...)         [packages/whatsapp — já existe]
  └─ 5. registra o envio (confirmation_reminders) + a mensagem (whatsapp_messages)

cliente responde "sim" → mesmo pipeline do atendimento-ia (webhook → worker →
  process-inbound.ts → loop de IA) → tool nova `confirmar_agendamento`
  → AgendaService.confirmAppointment (já existe, já idempotente)   [packages/core — já existe]

cliente pede pra remarcar → mesmo loop → tool `remarcar_agendamento` (já existe, sem mudança)
```

**Achado que simplifica o design**: `packages/ai/src/tools/index.ts` (`getBotTools()` /
`executeDomainTool`) já itera sobre `agendaTools` dinamicamente. Adicionar a tool nova em
`packages/core/src/agenda/tools.ts` é suficiente — **nenhuma linha muda em `packages/ai`**.

**Achado que resolve uma dúvida da exploração**: `barbershops.whatsapp_phone_number_id` já
existe (criado em `add-whatsapp-canal`, usado hoje só para rotear webhook). É exatamente o dado
que faltava para o job enviar proativamente, sem depender de uma conversa já existir.

## Decisões

### Decision 1 — `confirmationAutomationEnabled` em `agenda_settings`
Campo booleano, `NOT NULL DEFAULT false`, ao lado de `confirmationLeadHours`. Decisão já tomada
na exploração (Bloqueante 2). Ligado manualmente pelo Matheus via script CLI (Decision 5) só
depois de confirmar o template aprovado **e** `whatsapp_phone_number_id` já configurado para
aquela barbearia — o script valida os dois antes de ativar (ver Decision 5), para nunca deixar
uma barbearia "elegível para enviar" sem ter como enviar.

### Decision 2 — registro de envio em tabela própria, não em `appointments`
Tabela nova `confirmation_reminders`:

```text
confirmation_reminders
  id             uuid PK default random
  barbershop_id  uuid NOT NULL references barbershops(id)
  appointment_id uuid NOT NULL references appointments(id)
  sent_at        timestamptz NOT NULL default now()
  wamid          text NOT NULL
  UNIQUE (appointment_id)
```

Por que não uma coluna em `appointments`: mantém `agendamento` sem conhecimento de canal de
mensageria — mesmo princípio de separação que `whatsapp-canal`/`atendimento-ia` já seguem (a
tabela vive no schema, mas é dado de `confirmacao-agendamento`, não de `agendamento`).
`UNIQUE (appointment_id)` é a garantia de banco do requisito "envio único" — não depende só da
lógica da query de seleção; mesmo sob concorrência, uma segunda tentativa de `insert` para o
mesmo agendamento falha por violação de unicidade (tratada como no-op no repositório).

### Decision 3 — a query de seleção ganha 2 gates e 1 join, sem trocar de função
`listAppointmentsNeedingConfirmation` (`packages/db/src/repositories/appointments.ts`)
continua a mesma função, mas passa a:
- fazer `LEFT JOIN confirmation_reminders` e filtrar `sent_at IS NULL` (nunca reseleciona quem
  já recebeu);
- fazer `INNER JOIN agenda_settings` (já é `LEFT JOIN` hoje, por causa do lead_hours — vira
  condição adicional) filtrando `confirmation_automation_enabled = true`;
- fazer `JOIN clients` para trazer `clientId`, nome e telefone (precisa para montar
  `bodyParams` do template e para achar/criar a conversa) — hoje a função só devolve
  `{id, barbershopId, startsAt}`.

Isso muda a assinatura de retorno da função (campos a mais), o que é uma mudança de
implementação dentro de `agendamento`/`packages/db`, não de comportamento observável da spec
de `agendamento` (nenhum requisito daquela spec permanente menciona essa função) — não exige
delta ali.

### Decision 4 — reler o status antes de enviar, dentro do mesmo `for`
Entre a seleção (que pode ter minutos de defasagem por causa dos demais agendamentos do lote) e
o envio de cada template, o job chama `getAppointment(barbershopId, id)` e só prossegue se
`status === "agendado"` ainda. Mitiga a race descrita na spec (Scenario "Agendamento muda de
estado entre a seleção e o envio").

### Decision 5 — ativação por script CLI, no padrão de `create-barbershop.ts`
`packages/db/src/scripts/enable-confirmation-automation.ts`:

```text
tsx src/scripts/enable-confirmation-automation.ts --slug=<slug>
```

Valida que a barbearia tem `whatsappPhoneNumberId` configurado antes de ligar
`confirmationAutomationEnabled`; se não tiver, falha com mensagem clara (evita o estado
inconsistente "pronta para confirmar, mas sem número"). Documentado como novo passo no runbook
`docs/operations/onboarding-produto.md`, logo após o passo existente que configura
`whatsappPhoneNumberId`.

### Decision 6 — tool `confirmar_agendamento`, mesmo padrão das outras 4
Em `packages/core/src/agenda/tools.ts`, ao lado de `remarcarAgendamentoTool`/
`cancelarAgendamentoTool`:

```ts
const confirmarAgendamentoInput = z.object({
  appointmentId: z.string().describe("Id do agendamento a confirmar."),
});

export const confirmarAgendamentoTool: AgendaTool<z.infer<typeof confirmarAgendamentoInput>> = {
  name: "confirmar_agendamento",
  description: "Confirma um agendamento existente a pedido do cliente.",
  inputSchema: confirmarAgendamentoInput,
  handler: (barbershopId, input) => confirmAppointment(barbershopId, input.appointmentId),
};
```

Adicionada ao array `agendaTools`. Sem mudança em `packages/ai` (Achado acima). O texto de
resposta ao cliente depois da chamada é gerado pelo modelo a partir do `AgendaResult` retornado
(mesmo padrão das outras tools — nenhuma tool de agenda gera texto para o cliente, o modelo faz
isso lendo o resultado).

### Decision 7 — formatação de data/hora do template
`packages/core/src/agenda/timezone.ts` não tem hoje um "instante → HH:MM local". Acrescenta-se
uma função pura `instantToZonedTimeHHMM(date, timeZone)` (mesmo padrão de
`instantToZonedDateISO`, usando `Intl.DateTimeFormat`), usada para montar os `bodyParams` do
template: `[nomeCliente, diaFormatado, horaFormatada]`. Dia formatado como `DD/MM` (não
`YYYY-MM-DD` — é texto para o cliente final, não para o modelo).

### Decision 8 — envio usa `resolveWhatsAppProvider`, mesmo mecanismo de dry-run já existente
Nenhuma infraestrutura nova de teste é necessária: `resolveWhatsAppProvider(process.env)`
(`packages/whatsapp`) já cai automaticamente no adapter dry-run quando as 4 variáveis de
credencial não estão configuradas — é o mesmo mecanismo que resolve a decisão da exploração
("Done técnico fecha com dry-run/mock, sem depender do template real aprovado"). Em produção,
antes de ativar `confirmationAutomationEnabled` para qualquer barbearia real, as credenciais já
precisam estar configuradas (senão nada no canal funciona, não só esta change).

### Decision 9 — falha de envio não interrompe o lote
O `for` de agendamentos elegíveis captura erro por iteração (`try/catch` por agendamento,
mesmo padrão de resiliência do `no-show-sweep`/`monthly-snapshot`), loga sem PII e segue para o
próximo. Nenhuma linha de `confirmation_reminders` é criada para uma tentativa que falhou —
ela volta a ser elegível na próxima execução (é o comportamento correto: "falhou" não é
"enviado").

## Modelo de dados — resumo da migração

- `agenda_settings`: `+ confirmation_automation_enabled boolean NOT NULL DEFAULT false`.
- Tabela nova `confirmation_reminders` (Decision 2), com FK para `barbershops` e `appointments`
  e índice único em `appointment_id`.
- Gerado via `drizzle-kit generate` (mesmo fluxo das migrações anteriores) — sem SQL bruto
  manual, ao contrário da exclusão de sobreposição de `appointments` (aquela precisa de
  `EXCLUDE`, esta não precisa de nada fora do que o Drizzle já modela).

## Rascunho do texto do template (para o Matheus submeter à Meta)

Categoria **utility**, idioma `pt_BR`, 3 parâmetros posicionais no corpo. Segue a voz
"barbearia → cliente" do guia de copy § 13.9 (informal, direto, 1 emoji no máximo, horário
concreto, nunca "confirma?" solto sem contexto) e passa pelo checklist § 14:

```text
Nome do template: confirmacao_agendamento
Categoria: UTILITY
Idioma: pt_BR

Corpo:
oi {{1}}! passando pra confirmar seu horário dia {{2}} às {{3}}. responde "sim" pra
confirmar ou me chama aqui se precisar mudar 💈
```

Checklist § 14 aplicado:
1. Resumível na tese? Não é peça de marketing (é utility, transacional) — critério não se
   aplica da mesma forma, mas não introduz tese nova.
2. Uma coisa só: confirmar o horário. ✅.
3. Palavra banida: nenhuma. ✅.
4. Números: não há valor monetário. ✅ (n/a).
5. Ticket: n/a.
6. Absolvição: n/a (não fala de dor).
7. Resultado vs funcionalidade: é uma ação operacional (confirmar), não uma promessa de
   resultado — correto para o tipo de mensagem.
8. Barbeiro de 32 anos leria sem travar: sim, e principalmente **o cliente final** (é a voz
   dele lendo, não do barbeiro) — linguagem coloquial, sem jargão.
9. CTA mais fácil que a decisão: responder "sim" é o CTA mais simples possível. ✅.
10. Promete algo que a operação não entrega: não — é só confirmação, a barbearia já faz isso
    manualmente hoje.

**Este texto é rascunho para acelerar a submissão** (é o item de maior lead time da change,
conforme decidido na exploração) — ajustável até o Matheus submeter à Meta; não é a fonte de
verdade em runtime (o parâmetro fica hardcoded em `send-confirmation.ts` só depois de o nome do
template estar definitivo).

## Estratégia de testes

Mesmo padrão de rigor das changes anteriores da Fase 5 — Postgres real para `packages/db` e
`packages/core`, mock/dry-run para o provedor de WhatsApp, boot real do worker:

- `packages/db`: teste da query nova (gate por `confirmationAutomationEnabled`, exclusão de
  quem já tem `confirmation_reminders`, join com cliente) contra Postgres real; teste de
  unicidade de `confirmation_reminders` (segunda inserção para o mesmo `appointmentId` falha
  ou é no-op, conforme o repositório decidir).
- `packages/core`: teste de `confirmarAgendamentoTool` (transição real + idempotência) — mesmo
  padrão de `tools.test.ts` já existente para as outras 4 tools.
- `apps/worker`: teste do job com adapter mockado (mesmo padrão de
  `process-inbound.test.ts`/`add-whatsapp-canal`): agendamento elegível → `sendTemplate`
  chamado com os `bodyParams` certos → registro criado; segunda execução não chama de novo;
  falha do adapter não impede o próximo agendamento do lote; agendamento que muda de status
  entre seleção e envio não recebe template.
- Teste de isolamento de tenant para `confirmation_reminders` e para a query nova.
- Boot real do worker (`node --loader tsx apps/worker/src/index.ts` ou equivalente já usado nas
  changes anteriores) confirmando que o job continua registrado no `pgboss.schedule`.

## Non-Goals reafirmados (não fazem parte desta change)
- UI nova no painel para ligar a automação — script CLI (Decision 5).
- Delta em `relatorios` para "no-show evitado".
- Teste com BSP/template reais — pendência operacional separada, documentada no runbook.
