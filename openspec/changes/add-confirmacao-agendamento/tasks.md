# Tasks: Confirmação automática de agendamento

> Evidência real (comando + saída), não só `typecheck`. Marcar `[x]` só com evidência colada.
> Branch: `feature/add-confirmacao-agendamento`, a partir da `main`.

## 1. `packages/db` — schema e migração

- [ ] 1.1 `agenda-settings.ts` (schema): `+ confirmationAutomationEnabled boolean NOT NULL
  DEFAULT false`. Repositório (`agenda-settings.ts`): incluir o campo em
  `AgendaSettingsValues`/`DEFAULT_AGENDA_SETTINGS`/`getAgendaSettings`.
  - Depends on: —
  - Validation: unit (repositório) contra Postgres real.
  - Completion criteria: barbearia nunca configurada devolve `false`; `updateAgendaSettings`
    aceita ligar/desligar.

- [ ] 1.2 Schema novo `confirmation-reminders.ts`: tabela `confirmation_reminders`
  (`id`, `barbershopId`, `appointmentId` único, `sentAt`, `wamid`), FKs para `barbershops` e
  `appointments`. Exportar em `schema/index.ts`.
  - Depends on: —
  - Validation: migração aplica sem erro.
  - Completion criteria: constraint de unicidade existe no banco (provar com insert duplicado).

- [ ] 1.3 Repositório `confirmation-reminders.ts`: `wasReminderSent(barbershopId,
  appointmentId)`, `recordReminderSent(barbershopId, appointmentId, wamid)` (idempotente sob
  violação de unicidade — segunda chamada não lança). Exportar em `packages/db/src/index.ts`.
  - Depends on: 1.2
  - Validation: unit contra Postgres real.
  - Completion criteria: segunda chamada de `recordReminderSent` para o mesmo agendamento não
    lança e não duplica linha.

- [ ] 1.4 `drizzle-kit generate` — gerar e revisar a migração SQL antes de aplicar.
  - Depends on: 1.1, 1.2
  - Validation: `pnpm --filter @blademidia/db migrate` contra Postgres local.
  - Completion criteria: migração aplica limpo numa base já com as migrações anteriores.

- [ ] 1.5 `listAppointmentsNeedingConfirmation` (appointments.ts): adicionar os 2 gates
  (`confirmationAutomationEnabled = true`; `confirmation_reminders.sentAt IS NULL`) e o join
  com `clients` (devolver `clientId`, `clientName`, `clientPhone` além do que já retorna).
  - Depends on: 1.1, 1.3
  - Validation: unit contra Postgres real — casos: barbearia sem automação habilitada (não
    aparece); agendamento já notificado (não reaparece); cliente com telefone anonimizado
    (LGPD) não aparece ou é tratado com segurança (decidir no teste, documentar o
    comportamento escolhido); isolamento de tenant.
  - Completion criteria: suíte cobre os 4 casos acima, todos verdes.

## 2. `packages/core` — tool `confirmar_agendamento`

- [ ] 2.1 `agenda/tools.ts`: `confirmarAgendamentoTool` (Decision 6 do design.md), adicionada
  ao array `agendaTools`.
  - Depends on: —
  - Validation: unit, mesmo padrão de `tools.test.ts` já existente.
  - Completion criteria: transiciona `agendado → confirmado`; chamada repetida sobre
    `confirmado` não falha (idempotência herdada de `confirmAppointment`); agendamento
    inexistente devolve erro tipado, não lança.

- [ ] 2.2 `agenda/timezone.ts`: `instantToZonedTimeHHMM(date, timeZone)` (Decision 7).
  - Depends on: —
  - Validation: unit, sem banco.
  - Completion criteria: teste cobre horário de borda (meia-noite local) e o fuso padrão
    `America/Sao_Paulo`.

## 3. `apps/worker` — job real de confirmação

- [ ] 3.1 Reescrever `send-confirmation.ts`: para cada candidato da query nova — relê o status
  (Decision 4), monta `bodyParams` (nome, dia `DD/MM`, hora `HH:MM`), resolve/cria a conversa
  (`findOrCreateConversation`), chama `WhatsAppProvider.sendTemplate`, e em caso de sucesso
  grava `confirmation_reminders` + `whatsapp_messages` (direction saída, type template). Falha
  por agendamento não interrompe o lote (Decision 9, try/catch por iteração).
  - Depends on: 1.5, 1.3
  - Validation: unit com `WhatsAppAdapter` mockado (mesmo padrão de `process-inbound.test.ts`).
  - Completion criteria: cobre — envio bem-sucedido registra tudo; segunda execução não reenvia
    (nem chama `sendTemplate` de novo); agendamento que muda de status entre seleção e envio é
    pulado sem erro; falha do adapter num agendamento não impede os demais do lote; nenhum
    log contém corpo de mensagem ou telefone completo.
  - Evidência esperada: `src/jobs/send-confirmation.test.ts`.

- [ ] 3.2 Teste de isolamento de tenant para a query/gravação novas (duas barbearias, garantir
  que uma nunca vê/afeta a outra).
  - Depends on: 3.1
  - Validation: unit contra Postgres real.
  - Completion criteria: teste dedicado, verde.

- [ ] 3.3 Boot real do worker (`node`/`tsx` conforme já usado nas changes anteriores),
  confirmando que `agenda.send-confirmation` continua registrado em `pgboss.queue`/
  `pgboss.schedule` sem erro após a reescrita.
  - Depends on: 3.1
  - Validation: manual/integração, evidência colada (consulta real no `pgboss.schedule`).
  - Completion criteria: mesmo cron `0 * * * *`, sem regressão.

## 4. Ativação operacional

- [ ] 4.1 `packages/db/src/scripts/enable-confirmation-automation.ts` (Decision 5): recebe
  `--slug=`, valida que a barbearia tem `whatsappPhoneNumberId` configurado, liga
  `confirmationAutomationEnabled=true`; falha com mensagem clara se a validação não passar.
  - Depends on: 1.1
  - Validation: manual (rodar contra barbearia de teste local, com e sem
    `whatsappPhoneNumberId`).
  - Completion criteria: os dois caminhos (falha e sucesso) demonstrados com saída real.

- [ ] 4.2 `docs/operations/onboarding-produto.md`: acrescentar o passo do script 4.1, logo
  após o passo existente de `whatsappPhoneNumberId`.
  - Depends on: 4.1
  - Validation: revisão manual.
  - Completion criteria: runbook cobre o fluxo ponta a ponta de ligar a automação para uma
    barbearia nova.

## 5. Fluxo ponta a ponta (dry-run) e fechamento

- [ ] 5.1 Teste/demonstração ponta a ponta com o adapter dry-run já existente
  (`resolveWhatsAppProvider` sem credenciais, Decision 8): agendamento entra na janela → job
  "enviaria" o template (log dry-run) → registro criado → simular resposta de confirmação via
  `confirmarAgendamentoTool` → status `confirmado` no banco.
  - Depends on: 3.1, 2.1
  - Validation: integração, evidência colada (saída real do dry-run + estado final do banco).
  - Completion criteria: os 4 passos demonstrados numa única evidência.

- [ ] 5.2 Suíte completa do monorepo verde (`pnpm -r test` ou equivalente já usado nas changes
  anteriores).
  - Depends on: todas as anteriores
  - Validation: comando real, contagem de testes colada.
  - Completion criteria: 0 falhas, nenhuma suíte pulada por engano (Postgres real disponível).

- [ ] 5.3 `CHANGELOG.md` atualizado (entrada da change, versão `MINOR`).
  - Depends on: 5.2
  - Validation: revisão manual.
  - Completion criteria: segue o formato Keep a Changelog já usado nas entradas anteriores.

- [ ] 5.4 Fechamento formal: aplicar os deltas de `specs/` às specs permanentes
  (`openspec/specs/confirmacao-agendamento/spec.md` novo,
  `openspec/specs/atendimento-ia/spec.md` com o requisito novo), atualizar os índices
  (`openspec/changes/README.md`, `openspec/specs/README.md`), arquivar a change em
  `openspec/changes/archive/add-confirmacao-agendamento/`, `Status: Done` no proposal.
  - Depends on: 5.2, 5.3
  - Validation: revisão manual (checklist DoD do workflow.md).
  - Completion criteria: todos os itens do DoD (workflow.md) marcados.
