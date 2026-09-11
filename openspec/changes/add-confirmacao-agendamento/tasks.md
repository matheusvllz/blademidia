# Tasks: Confirmação automática de agendamento

> Evidência real (comando + saída), não só `typecheck`. Marcar `[x]` só com evidência colada.
> Branch: `feature/add-confirmacao-agendamento`, a partir da `main`.

## 1. `packages/db` — schema e migração

- [x] 1.1 `agenda-settings.ts` (schema): `+ confirmationAutomationEnabled boolean NOT NULL
  DEFAULT false`. Repositório (`agenda-settings.ts`): incluir o campo em
  `AgendaSettingsValues`/`DEFAULT_AGENDA_SETTINGS`/`getAgendaSettings`.
  - Depends on: —
  - Validation: unit (repositório) contra Postgres real.
  - Completion criteria: barbearia nunca configurada devolve `false`; `updateAgendaSettings`
    aceita ligar/desligar.
  - Evidência: coberto por `confirmation-reminders.test.ts` (casos "sem
    confirmationAutomationEnabled" e "com automação habilitada") — ver 1.5.

- [x] 1.2 Schema novo `confirmation-reminders.ts`: tabela `confirmation_reminders`
  (`id`, `barbershopId`, `appointmentId` único, `sentAt`, `wamid`), FKs para `barbershops` e
  `appointments`. Exportar em `schema/index.ts`.
  - Depends on: —
  - Validation: migração aplica sem erro.
  - Completion criteria: constraint de unicidade existe no banco (provar com insert duplicado).
  - Evidência: `pnpm --filter @blademidia/db generate` → migração
    `0007_smooth_doctor_strange.sql` (tabela + `UNIQUE INDEX confirmation_reminders_appointment_idx`
    + 2 FKs) → `pnpm --filter @blademidia/db migrate` → "Migrações aplicadas com sucesso.".
    Unicidade provada pelo teste "recordReminderSent é idempotente" (1.3).

- [x] 1.3 Repositório `confirmation-reminders.ts`: `wasReminderSent(barbershopId,
  appointmentId)`, `recordReminderSent(barbershopId, appointmentId, wamid)` (idempotente sob
  violação de unicidade — segunda chamada não lança). Exportar em `packages/db/src/index.ts`.
  - Depends on: 1.2
  - Validation: unit contra Postgres real.
  - Completion criteria: segunda chamada de `recordReminderSent` para o mesmo agendamento não
    lança e não duplica linha.
  - Evidência: `src/repositories/confirmation-reminders.test.ts` — 7/7 verdes, incluindo
    "recordReminderSent é idempotente: segunda chamada para o mesmo agendamento não lança nem
    duplica" (`second.id === first.id`, `second.wamid === first.wamid`).

- [x] 1.4 `drizzle-kit generate` — gerar e revisar a migração SQL antes de aplicar.
  - Depends on: 1.1, 1.2
  - Validation: `pnpm --filter @blademidia/db migrate` contra Postgres local.
  - Completion criteria: migração aplica limpo numa base já com as migrações anteriores.
  - Evidência: `pnpm migrate` → "Migrações aplicadas com sucesso." (0007 aplicada sobre 0000-0006
    já existentes).

- [x] 1.5 `listAppointmentsNeedingConfirmation` (appointments.ts): adicionar os 2 gates
  (`confirmationAutomationEnabled = true`; `confirmation_reminders.sentAt IS NULL`) e o join
  com `clients` (devolver `clientId`, `clientName`, `clientPhone` além do que já retorna).
  - Depends on: 1.1, 1.3
  - Validation: unit contra Postgres real — casos: barbearia sem automação habilitada (não
    aparece); agendamento já notificado (não reaparece); cliente com telefone anonimizado
    (LGPD) não aparece ou é tratado com segurança (decidir no teste, documentar o
    comportamento escolhido); isolamento de tenant.
  - Completion criteria: suíte cobre os 4 casos acima, todos verdes.
  - Evidência: `src/repositories/confirmation-reminders.test.ts` (7/7) +
    `confirmation-reminders.isolation.test.ts` (1/1) — `npx vitest run
    src/repositories/confirmation-reminders.test.ts src/repositories/confirmation-reminders.isolation.test.ts`
    → **8/8 verdes** contra Postgres real. Cobre: gate de automação, janela de
    `confirmation_lead_hours`, status ≠ `agendado`, cliente anonimizado (LGPD), envio único, e
    isolamento de tenant.

## 2. `packages/core` — tool `confirmar_agendamento`

- [x] 2.1 `agenda/tools.ts`: `confirmarAgendamentoTool` (Decision 6 do design.md), adicionada
  ao array `agendaTools`.
  - Depends on: —
  - Validation: unit, mesmo padrão de `tools.test.ts` já existente.
  - Completion criteria: transiciona `agendado → confirmado`; chamada repetida sobre
    `confirmado` não falha (idempotência herdada de `confirmAppointment`); agendamento
    inexistente devolve erro tipado, não lança.
  - Evidência: `src/agenda/tools.test.ts` — 5/5 verdes, incluindo 2 testes novos contra
    Postgres real ("confirma um agendamento agendado e é idempotente ao chamar de novo";
    "agendamento inexistente devolve erro tipado, não lança"). Suíte completa de
    `@blademidia/core`: `pnpm typecheck` limpo + `pnpm test` → **53/53 verdes** (0 regressão).

- [x] 2.2 `agenda/timezone.ts`: `instantToZonedTimeHHMM(date, timeZone)` (Decision 7).
  - Depends on: —
  - Validation: unit, sem banco.
  - Completion criteria: teste cobre horário de borda (meia-noite local) e o fuso padrão
    `America/Sao_Paulo`.
  - Evidência: `src/agenda/timezone.test.ts` — 3/3 verdes (10:00Z→10:00 local; borda
    00:00 local; padding de 2 dígitos).

## 3. `apps/worker` — job real de confirmação

- [x] 3.1 Reescrever `send-confirmation.ts`: para cada candidato da query nova — relê o status
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
  - Evidência: `src/jobs/send-confirmation.test.ts` — **5/5 verdes** contra Postgres real +
    provedor mockado (`vi.mock("@blademidia/whatsapp")`), cobrindo os 5 casos do completion
    criteria. Achado durante o teste: barbearias de outras suítes (sem
    `whatsappPhoneNumberId`) aparecem no lote cross-tenant e são puladas pela defesa já
    existente no job (log "sem whatsappPhoneNumberId — pulando"), confirmando que a defesa
    funciona também contra poluição real de dados entre suítes.

- [x] 3.2 Teste de isolamento de tenant para a query/gravação novas (duas barbearias, garantir
  que uma nunca vê/afeta a outra).
  - Depends on: 3.1
  - Validation: unit contra Postgres real.
  - Completion criteria: teste dedicado, verde.
  - Evidência: `packages/db/src/repositories/confirmation-reminders.isolation.test.ts` (1/1,
    query/gravação a nível de repositório) + `send-confirmation.test.ts` ("falha do provedor
    num agendamento não impede os demais do mesmo lote", 2 barbearias reais, uma falha e a
    outra é confirmada independentemente).

- [x] 3.3 Boot real do worker (`node`/`tsx` conforme já usado nas changes anteriores),
  confirmando que `agenda.send-confirmation` continua registrado em `pgboss.queue`/
  `pgboss.schedule` sem erro após a reescrita.
  - Depends on: 3.1
  - Validation: manual/integração, evidência colada (consulta real no `pgboss.schedule`).
  - Completion criteria: mesmo cron `0 * * * *`, sem regressão.
  - Evidência: `npx tsx src/index.ts` real (Postgres real) → log "[worker] up — pg-boss
    iniciado, jobs registrados" → consulta real `select name, cron from pgboss.schedule where
    name = 'agenda.send-confirmation'` → `agenda.send-confirmation | 0 * * * *` — cron
    inalterado, job registrado.

## 4. Ativação operacional

- [x] 4.1 `packages/db/src/scripts/enable-confirmation-automation.ts` (Decision 5): recebe
  `--slug=`, valida que a barbearia tem `whatsappPhoneNumberId` configurado, liga
  `confirmationAutomationEnabled=true`; falha com mensagem clara se a validação não passar.
  - Depends on: 1.1
  - Validation: manual (rodar contra barbearia de teste local, com e sem
    `whatsappPhoneNumberId`).
  - Completion criteria: os dois caminhos (falha e sucesso) demonstrados com saída real.
  - Evidência: rodado manualmente contra Postgres local — sem número: "Barbearia 'Ativação
    Teste' (...) ainda não tem whatsappPhoneNumberId configurado." (exit 1); com número:
    "Confirmação automática LIGADA para 'Ativação Teste 2' (...), número wa-manual-...."
    (exit 0). `pnpm --filter @blademidia/db typecheck` limpo.

- [x] 4.2 `docs/operations/onboarding-produto.md`: acrescentar o passo do script 4.1, logo
  após o passo existente de `whatsappPhoneNumberId`.
  - Depends on: 4.1
  - Validation: revisão manual.
  - Completion criteria: runbook cobre o fluxo ponta a ponta de ligar a automação para uma
    barbearia nova.
  - Evidência: passo 8 acrescentado em `docs/operations/onboarding-produto.md`, logo após o
    passo 7 (coexistência) — cobre pré-requisitos (template aprovado + `whatsappPhoneNumberId`)
    e o comando do script.

## 5. Fluxo ponta a ponta (dry-run) e fechamento

- [x] 5.1 Teste/demonstração ponta a ponta com o adapter dry-run já existente
  (`resolveWhatsAppProvider` sem credenciais, Decision 8): agendamento entra na janela → job
  "enviaria" o template (log dry-run) → registro criado → simular resposta de confirmação via
  `confirmarAgendamentoTool` → status `confirmado` no banco.
  - Depends on: 3.1, 2.1
  - Validation: integração, evidência colada (saída real do dry-run + estado final do banco).
  - Completion criteria: os 4 passos demonstrados numa única evidência.
  - Evidência: `src/jobs/send-confirmation.e2e.test.ts` (1/1, sem mock — pacote
    `@blademidia/whatsapp` real, dry-run forçado via env). Log real capturado: `[whatsapp:dry-run]
    enviaria template "confirmacao_agendamento" (pt_BR, 3 parâmetro(s)) para ***7437 via
    wa-e2e-... — wamid=dryrun...`; os 4 passos (envio → registro → confirmação via tool →
    status `confirmado` no banco) verdes na mesma execução.

- [x] 5.2 Suíte completa do monorepo verde (`pnpm -r test` ou equivalente já usado nas changes
  anteriores).
  - Depends on: todas as anteriores
  - Validation: comando real, contagem de testes colada.
  - Completion criteria: 0 falhas, nenhuma suíte pulada por engano (Postgres real disponível).
  - Evidência: `pnpm -r typecheck` limpo (7/7 pacotes). Testes contra Postgres real, por
    pacote: `@blademidia/whatsapp` 35/35, `@blademidia/db` 58/58, `@blademidia/core` 53/53,
    `@blademidia/ai` 46/46, `apps/web` 7/7, `apps/worker` 28/28 (arquivos desta change +
    `no-show-sweep`/`process-inbound`, já existentes) — **227 testes verdes no total**.
    Achado real durante esta task: `packages/ai/src/tools/index.test.ts` tinha a lista de
    tools hardcoded (4+1) e quebrou com a tool nova — corrigido (5+1), com um teste novo de
    despacho real de `confirmar_agendamento` via `executeDomainTool`. **1 falha PRÉ-EXISTENTE,
    não desta change**: `apps/worker/src/jobs/monthly-snapshot.test.ts` (2 testes, timeout de
    30s) — confirmado via `git stash`/rerun contra o commit anterior a esta change: falha
    idêntica no baseline, sem nenhuma alteração minha tocando `relatorios`/`report-snapshots`.
    Registrado como achado a reportar ao Matheus, não corrigido aqui (fora do escopo desta
    change).

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
