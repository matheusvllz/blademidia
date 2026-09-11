# Tasks: Reativação automática de clientes inativos

> Evidência real (comando + saída), não só `typecheck`. Marcar `[x]` só com evidência colada.
> Branch: `feature/add-reativacao-clientes`, a partir de `feature/add-confirmacao-agendamento`
> (mesmo padrão de empilhamento já usado entre as changes da Fase 5).

## 1. `packages/db` — schema, migração e seleção

- [ ] 1.1 `crm-settings.ts` (schema): `+ reactivationAutomationEnabled boolean NOT NULL DEFAULT
  false`, `+ reactivationDailyCap integer NOT NULL DEFAULT 5`. Repositório
  (`settings.ts` ou arquivo próprio): expor getters/setters coerentes com o padrão já usado
  para `inactivityDaysThreshold`.
  - Depends on: —
  - Validation: unit contra Postgres real.
  - Completion criteria: barbearia nunca configurada devolve `false`/`5`.

- [ ] 1.2 Schema novo `reactivation-sends.ts`: tabela `reactivation_sends` (`id`,
  `barbershopId`, `clientId`, `sentAt`, `wamid`, `clientLastVisitAt`), FKs para `barbershops` e
  `clients`, SEM unicidade por cliente (Decision 2). Exportar em `schema/index.ts`.
  - Depends on: —
  - Validation: migração aplica sem erro.

- [ ] 1.3 Repositório `reactivation-sends.ts`: `recordReactivationSent(barbershopId, clientId,
  wamid, clientLastVisitAt)`, `getLastReactivationSent(barbershopId, clientId)`. Exportar em
  `packages/db/src/index.ts`.
  - Depends on: 1.2
  - Validation: unit contra Postgres real.

- [ ] 1.4 `drizzle-kit generate` — gerar e revisar a migração SQL antes de aplicar.
  - Depends on: 1.1, 1.2
  - Validation: `pnpm --filter @blademidia/db migrate` contra Postgres local.

- [ ] 1.5 `listClientsNeedingReactivation(barbershopId)` — nova função (Decision 3/4 do
  design.md): gate `reactivationAutomationEnabled`, cliente com `lastVisitAt` não nulo e
  inativo pelo `inactivityDaysThreshold`, telefone válido, regra de "novo ciclo" (nenhum envio
  registrado OU `lastVisitAt` atual > `clientLastVisitAt` do último envio), ordenada por mais
  tempo inativo primeiro, `LIMIT reactivationDailyCap`.
  - Depends on: 1.1, 1.3
  - Validation: unit contra Postgres real — casos: barbearia sem automação (não aparece);
    cliente sem visita nenhuma (não aparece); cliente já reativado sem visita nova (não
    reaparece); cliente reativado que voltou a visitar e ficou inativo de novo (reaparece);
    cap diário respeitado com mais elegíveis do que o limite; cliente com telefone anonimizado
    (não aparece); isolamento de tenant.
  - Completion criteria: suíte cobre todos os casos acima, todos verdes.

## 2. `apps/worker` — job real de reativação

- [ ] 2.1 Reescrever `reactivation-sweep.ts`: para cada barbearia elegível, para cada cliente
  candidato — resolve/cria a conversa, monta `bodyParams` (nome), chama
  `WhatsAppProvider.sendTemplate`, e em caso de sucesso grava `reactivation_sends` +
  `whatsapp_messages`. Falha por cliente não interrompe o lote (try/catch por iteração).
  - Depends on: 1.5, 1.3
  - Validation: unit com `WhatsAppAdapter` mockado (mesmo padrão de
    `send-confirmation.test.ts`).
  - Completion criteria: cobre — envio bem-sucedido registra tudo; cliente sem visita nova não
    reenvia; cliente com visita nova reaparece; cap diário respeitado; falha de um cliente não
    impede os demais; opt-out bloqueia envio; nenhum log com corpo de mensagem ou telefone
    completo.

- [ ] 2.2 Teste de isolamento de tenant para a seleção/gravação novas.
  - Depends on: 2.1
  - Validation: unit contra Postgres real.

- [ ] 2.3 Boot real do worker, confirmando que `crm.reactivation-sweep` continua registrado em
  `pgboss.queue`/`pgboss.schedule` sem erro após a reescrita (mesmo cron `0 8 * * *`).
  - Depends on: 2.1
  - Validation: manual/integração, evidência colada.

## 3. Ativação operacional

- [ ] 3.1 `packages/db/src/scripts/enable-reactivation-automation.ts` (Decision 5): recebe
  `--slug=` e `--daily-cap=` (opcional), valida `whatsappPhoneNumberId` configurado, liga
  `reactivationAutomationEnabled=true` e ajusta `reactivationDailyCap` se informado.
  - Depends on: 1.1
  - Validation: manual (rodar contra barbearia de teste local, com e sem
    `whatsappPhoneNumberId`, com e sem `--daily-cap`).

- [ ] 3.2 `docs/operations/onboarding-produto.md`: acrescentar o passo do script 3.1, incluindo
  o lembrete explícito do pré-requisito "fazer a conta de custo contra a base real antes do
  primeiro envio" (plano § 9).
  - Depends on: 3.1
  - Validation: revisão manual.

## 4. Fluxo ponta a ponta (dry-run) e fechamento

- [ ] 4.1 Teste/demonstração ponta a ponta com o adapter dry-run já existente: cliente inativo
  elegível → job "enviaria" o template (log dry-run) → registro criado → confirmar que uma
  segunda execução, sem visita nova, não reenvia.
  - Depends on: 2.1
  - Validation: integração, evidência colada.

- [ ] 4.2 Suíte completa do monorepo verde (`pnpm -r test`).
  - Depends on: todas as anteriores
  - Validation: comando real, contagem de testes colada. Registrar explicitamente se a falha
    pré-existente de `monthly-snapshot.test.ts` (não relacionada, ver
    `add-confirmacao-agendamento`) ainda ocorre — não é regressão desta change se persistir sem
    mudança de causa.

- [ ] 4.3 `CHANGELOG.md` atualizado (entrada da change, versão `MINOR`).
  - Depends on: 4.2
  - Validation: revisão manual.

- [ ] 4.4 Fechamento formal: aplicar o delta de `specs/reativacao-clientes/spec.md` à spec
  permanente nova, atualizar os índices (`openspec/changes/README.md`,
  `openspec/specs/README.md` — inclusive marcar a Fase 5 como CONCLUÍDA, 4/4), atualizar
  `CLAUDE.md`, arquivar a change em `openspec/changes/archive/add-reativacao-clientes/`,
  `Status: Done` no proposal.
  - Depends on: 4.2, 4.3
  - Validation: revisão manual (checklist DoD do workflow.md + checklist do avaliador).
