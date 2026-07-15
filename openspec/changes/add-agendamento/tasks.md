# Tasks: Agenda Integrada (Produto — Fase 2)

> Tarefas pequenas o bastante para um agente de IA implementar com baixo risco por sessão.
> Marque `[x]` **somente com evidência** (teste passando, screenshot, saída de comando).
> Ordem = ordem recomendada de implementação: **fundação → domínio → API → telas → worker/IA
> → fechamento**. Domínio antes de UI (o motor de disponibilidade é o maior risco).
> Só iniciar após `proposal.md` = `Approved` e esta lista revisada. Branch: `feature/add-agendamento`.

## 0. Fundação técnica da Fase 2

- [x] 0.1 Criar `packages/core` (workspace) com tooling
  - Evidência: `pnpm install` ok (novos workspaces); `pnpm --filter @blademidia/core typecheck` limpo.
  - Objective: novo pacote `@blademidia/core` no monorepo, TS strict, lint/test como os demais.
  - Likely files: `packages/core/package.json`, `tsconfig.json`, `src/index.ts`,
    `pnpm-workspace.yaml` (já cobre `packages/*`).
  - Depends on: —
  - Validation: manual — `pnpm install` sem erro; `pnpm --filter @blademidia/core typecheck` limpo.
  - Completion criteria: pacote importável por `apps/web` e `apps/worker`.

- [x] 0.2 Criar `apps/worker` (workspace) — esqueleto do processo
  - Evidência: `pnpm start` (worker) logou "[worker] up — pg-boss iniciado, jobs registrados" contra o Postgres do compose; encerra com SIGTERM (exit 143). typecheck limpo.
  - Objective: app Node que sobe, conecta ao Postgres e inicializa pg-boss (sem jobs ainda).
  - Likely files: `apps/worker/package.json`, `tsconfig.json`, `src/index.ts` (boot pg-boss),
    dependência `pg-boss`.
  - Depends on: 0.1
  - Validation: manual — `pnpm --filter @blademidia/worker dev` sobe, pg-boss cria schema no
    Postgres do `docker-compose.yml`, log "worker up".
  - Completion criteria: processo estável; encerra limpo (SIGTERM).

- [x] 0.3 Criar `packages/ai` (esqueleto) — cliente Claude + slot de tools
  - Evidência: `resolveAiConfig` + slot de tools; `pnpm --filter @blademidia/ai test` → 3/3 verdes; typecheck limpo. Sem SDK Anthropic e sem chamada em runtime (documentado).
  - Objective: `@blademidia/ai` com wrapper do cliente (lê `ANTHROPIC_API_KEY`/`AI_MODEL`, sem
    chamar a API) e o ponto onde as tools da agenda serão registradas (vazio, tipado).
  - Likely files: `packages/ai/package.json`, `src/client.ts`, `src/tools/index.ts`.
  - Depends on: 0.1
  - Validation: unit — teste do wrapper (constrói cliente, não faz request).
  - Completion criteria: typecheck limpo; documentado "sem chamada em runtime nesta fase".

- [x] 0.4 Docker Compose + env do worker
  - Evidência: `.env.example` +`TZ`/`NO_SHOW_SWEEP_INTERVAL_MIN`/`ANTHROPIC_API_KEY`/`AI_MODEL`; scripts `worker`/`db:migrate-automation-agenda` na raiz. Nota: worker roda no HOST em dev (como o web); `infra/stack` é da agência e não foi tocada (decisão registrada no header do `docker-compose.yml` e no `apps/worker/README.md`).
  - Objective: serviço `worker` no `docker-compose.yml` (local) e em `infra/stack`; `.env.example`
    ganha `TZ=America/Sao_Paulo`, `ANTHROPIC_API_KEY=`, `AI_MODEL=claude-haiku-4-5`,
    `NO_SHOW_SWEEP_INTERVAL_MIN=5`.
  - Likely files: `docker-compose.yml`, `infra/stack/docker-compose.yml`, `.env.example`.
  - Depends on: 0.2
  - Validation: manual — `docker compose up` sobe Postgres + worker; worker conecta.
  - Completion criteria: stack local completa de pé.

- [x] 0.5 ADR-0008 e ADR-0009
  - Evidência: `ADR-0008-camada-dominio-e-contrato-de-tools.md` e `ADR-0009-worker-pgboss.md` criados (Status Proposto, formato de conventions.md), referenciados no `design.md`.
  - Objective: registrar as decisões transversais — camada de domínio `packages/core` +
    contrato de tools (ADR-0008); worker + pg-boss (ADR-0009). Status `Proposto`.
  - Likely files: `docs/architecture/decisions/ADR-0008-*.md`, `ADR-0009-*.md`.
  - Depends on: —
  - Validation: manual — seguem o formato de ADR (conventions.md).
  - Completion criteria: dois ADRs criados e referenciados no `design.md`.

## 1. Schema de dados e repositórios

- [x] 1.1 Tabelas da agenda (schema Drizzle)
  - Evidência: 7 tabelas + FKs em `visits` (`service_id`/`staff_id`) + `barbershops.timezone`; `pnpm db:generate` → `0001_magenta_skaar.sql` (13 tabelas no snapshot); typecheck limpo.
  - Objective: `services`, `barbers`, `barber_services`, `work_schedules`,
    `schedule_exceptions`, `appointments`, `agenda_settings`; +FKs em `visits`
    (`service_id`, `barber_id`); +`barbershops.timezone`. Enums `appointment_status`,
    `appointment_source`, `exception_kind`.
  - Likely files: `packages/db/src/schema/*.ts`, `schema/index.ts`.
  - Depends on: 0.1
  - Validation: manual — `pnpm db:generate` gera migração coerente.
  - Completion criteria: schema compila; snapshot gerado.

- [x] 1.2 Migração + `btree_gist` + restrição de exclusão
  - Evidência: `pnpm db:migrate` aplicou tudo; teste SQL real provou que 2 agendamentos ativos sobrepostos do mesmo barbeiro → `ERROR 23P01 appointments_no_overlap`, e adjacente (fim=início) passa (range `[)`).
  - Objective: aplicar as tabelas e anexar SQL bruto: `CREATE EXTENSION IF NOT EXISTS btree_gist`
    e a restrição de exclusão anti-sobreposição em `appointments` (Decision 5 do design).
  - Likely files: `packages/db/migrations/000X_*.sql`.
  - Depends on: 1.1
  - Validation: integration — `pnpm db:migrate` aplica sem erro; INSERT de dois agendamentos
    ativos sobrepostos do mesmo barbeiro é rejeitado pelo banco (erro 23P01).
  - Completion criteria: migração idempotente aplicada em Postgres real.

- [x] 1.3 Repositórios tenant-scoped (serviços, barbeiros, associações)
  - Evidência: `services.ts`, `barbers.ts` (+`barber_services`, `listBarbersForService`); `barbershopId` sempre 1º arg; typecheck limpo.
  - Objective: `services.ts`, `barbers.ts`, `barber-services.ts` — CRUD com `barbershopId`
    obrigatório como 1º argumento (ADR-0007).
  - Likely files: `packages/db/src/repositories/*.ts`, `index.ts`.
  - Depends on: 1.2
  - Validation: integration — CRUD real contra Postgres.
  - Completion criteria: typecheck limpo; funções exportadas por `@blademidia/db`.

- [x] 1.4 Repositórios de grade e exceções
  - Evidência: `work-schedules.ts` (grade recorrente com janelas por dia) e `schedule-exceptions.ts` (folga/bloqueio/extra; barberId NULL = barbearia); typecheck limpo.
  - Objective: `work-schedules.ts`, `schedule-exceptions.ts` (listar/definir por barbeiro).
  - Likely files: `packages/db/src/repositories/*.ts`.
  - Depends on: 1.2
  - Validation: integration — leitura/escrita real.
  - Completion criteria: idem 1.3.

- [x] 1.5 Repositório de agendamentos
  - Evidência: `appointments.ts` — criar (traduz 23P01→`conflict`), listar por período, ativos para disponibilidade, transições, remarcar, conclusão transacional idempotente (`completeAppointmentWithVisit`), próximos do cliente, cancelamento LGPD, candidatos a no-show, contagem por status; typecheck limpo.
  - Objective: `appointments.ts` — criar, listar por período/barbeiro, obter, atualizar status,
    remarcar, vincular `visit_id`; traduzir violação 23P01 em erro `conflict`.
  - Likely files: `packages/db/src/repositories/appointments.ts`.
  - Depends on: 1.2
  - Validation: integration — criação, listagem por dia, conflito → `conflict`.
  - Completion criteria: erros de domínio (`conflict`/`not_found`) padronizados.

- [x] 1.6 Repositório de regras da agenda + ajuste em `visits`/`dashboard`
  - Evidência: `agenda-settings.ts` (get com defaults / upsert); `registerVisit` aceita `serviceId`/`staffId`; agregação da agenda no dashboard entra no Grupo 3.4/6.3 (rota). typecheck limpo.
  - Objective: `agenda-settings.ts` (get/patch com defaults); `visits.registerVisit` aceita
    `serviceId`/`barberId`; `dashboard` inclui agenda de hoje e faltas recentes.
  - Likely files: `packages/db/src/repositories/agenda-settings.ts`, `visits.ts`, `dashboard.ts`.
  - Depends on: 1.2
  - Validation: integration — defaults corretos; dashboard novo campo calculado.
  - Completion criteria: compatível com dados da Fase 1 (FKs nulas).

- [x] 1.7 Testes de isolamento de tenant (todas as tabelas novas)
  - Evidência: `agenda.isolation.test.ts` — 5 testes contra Postgres real (serviço, barbeiro, grade, agendamento, listBarbersForService) provando que B não vê/acessa dado de A. Suíte db: 16/16 verdes.
  - Objective: provar que barbearia A não lê/altera serviços, barbeiros, grades, exceções e
    agendamentos de B (molde `clients.isolation.test.ts`).
  - Likely files: `packages/db/src/repositories/*.isolation.test.ts`.
  - Depends on: 1.3–1.6
  - Validation: integration — testes verdes contra Postgres.
  - Completion criteria: DoD do ADR-0007 cumprido para a agenda.

## 2. Domínio — `AgendaService` (packages/core)

- [x] 2.1 Motor de disponibilidade (`getAvailability`)
  - Evidência: `availability.ts` (puro) + `availability.test.ts` **10/10 verdes** — grade, almoço, folga, bloqueio, extra, sobreposição, antecedência, passo 15, encaixe exato, união "qualquer barbeiro". Fuso via `timezone.ts` (Intl, sem lib). Corrigido erro aritmético no cenário da spec no caminho.
  - Objective: computar horários livres (grade − exceções − agendamentos ativos), por barbeiro
    e "qualquer barbeiro", respeitando duração, passo e fuso (America/Sao_Paulo).
  - Likely files: `packages/core/src/agenda/availability.ts`, `types.ts`.
  - Depends on: 1.3–1.6
  - Validation: unit — casos: grade simples, almoço, folga/bloqueio/extra, borda de expediente,
    passo 15/30, união "qualquer barbeiro", fuso. (cenários da spec de `agendamento`.)
  - Completion criteria: todos os cenários de disponibilidade da spec cobertos e verdes.

- [x] 2.2 Operações de escrita (`bookAppointment`, `reschedule`, `cancel`, `confirm`)
  - Evidência: `agenda-service.test.ts` (integração, Postgres real) — feliz, conflito, **concorrência (2 writes→1 grava, 1 conflito)**, passado, fora da grade, cross-tenant (`not_found`), transição inválida. 12 testes verdes.
  - Objective: validar grade/passado/escopo/conflito; aplicar transições; registrar `source`.
  - Likely files: `packages/core/src/agenda/agenda-service.ts`.
  - Depends on: 2.1, 1.5
  - Validation: unit + integration — feliz, conflito, concorrência (dois writes → 1 grava),
    transição inválida, referência cruzada de tenant.
  - Completion criteria: cenários de "Criação" e "Ciclo de vida" da spec verdes.

- [x] 2.3 Conclusão transacional idempotente (`completeAppointment`)
  - Evidência: teste — concluir cria 1 visita com `serviceId`/`staffId` + pagamento; concluir 2× → `alreadyCompleted`, segue 1 visita; concluir sem valor cria visita sem pagamento.
  - Objective: em transação, criar `visit` (+`payments_log` se houver valor), gravar `visit_id`,
    status → "concluído"; no-op se já concluído.
  - Likely files: `packages/core/src/agenda/agenda-service.ts`, usa `visits` repo.
  - Depends on: 2.2, 1.6
  - Validation: integration — conclui cria visita+pagamento; concluir 2× não duplica; sem valor
    não quebra ticket médio.
  - Completion criteria: cenários de "Conclusão gera atendimento" verdes.

- [x] 2.4 No-show (`markNoShow`) + seleção da varredura
  - Evidência: teste — falta manual → `faltou`; idempotente (2×→faltou); concluído → `invalid_transition`. `listNoShowCandidates` pronto. (helper `markNoShowIfActive` p/ o sweep será criado no Grupo 7.)
  - Objective: marcar falta manual e expor a query "agendamentos ativos vencidos além do limite"
    para o worker; nunca afeta concluído/cancelado; idempotente.
  - Likely files: `packages/core/src/agenda/no-show.ts`.
  - Depends on: 2.2
  - Validation: unit + integration — seleção correta; idempotência.
  - Completion criteria: cenários de "Registro de falta" verdes.

- [x] 2.5 Contrato de tools do bot (especificação)
  - Evidência: `agenda/tools.ts` — 4 tools (`consultar_disponibilidade`, `criar_agendamento`, `remarcar_agendamento`, `cancelar_agendamento`) com Zod `inputSchema` + handler que chama o `AgendaService` (escritas com `source='bot'`). `tools.test.ts` 2/2 verdes. Exportado por `@blademidia/core`.
  - Objective: definir as tools (`consultar_disponibilidade`, `criar_agendamento`,
    `remarcar_agendamento`, `cancelar_agendamento`) — nome, descrição PT-BR, `input_schema`
    (Zod) e handler que chama o `AgendaService` com `source='bot'`. Exportar para `packages/ai`.
  - Likely files: `packages/core/src/agenda/tools.ts`.
  - Depends on: 2.2
  - Validation: unit — cada handler invoca o método certo; schema valida entrada.
  - Completion criteria: cenário "Fronteira de domínio consumível por automações" coberto.

## 3. API interna (apps/web)

- [ ] 3.1 Rotas de serviços e barbeiros (+ associação)
  - Objective: `GET/POST /api/services`, `/:id`; `GET/POST /api/barbers`, `/:id`;
    `PUT /api/barbers/:id/services`. Zod na entrada; sessão → tenant.
  - Likely files: `apps/web/app/api/services/**`, `api/barbers/**`.
  - Depends on: 1.3
  - Validation: contract — 201/200/400/404; escopo por sessão.
  - Completion criteria: CRUD acessível só ao tenant da sessão.

- [ ] 3.2 Rotas de grade e exceções
  - Objective: `GET/PUT /api/barbers/:id/schedule`; `GET/POST/DELETE /api/barbers/:id/exceptions`.
  - Likely files: `apps/web/app/api/barbers/[id]/schedule/**`, `exceptions/**`.
  - Depends on: 1.4
  - Validation: contract — validação de janelas (start<end), 400 em inválido.
  - Completion criteria: grade e exceções editáveis via API.

- [ ] 3.3 Disponibilidade e agendamentos
  - Objective: `GET /api/availability`; `GET/POST /api/appointments`; `GET/PATCH/DELETE
    /api/appointments/:id`; `POST /api/appointments/:id/complete`; `.../no-show`.
  - Likely files: `apps/web/app/api/availability/route.ts`, `api/appointments/**`.
  - Depends on: 2.1–2.4
  - Validation: contract — 201/409 (conflito)/409 (transição)/404 (cross-tenant)/400.
  - Completion criteria: fluxos de criação/conclusão/no-show acessíveis; erros corretos.

- [ ] 3.4 Regras da agenda + dashboard ajustado
  - Objective: `GET/PATCH /api/agenda-settings`; `GET /api/dashboard` inclui agenda de hoje/faltas.
  - Likely files: `apps/web/app/api/agenda-settings/route.ts`, `api/dashboard/route.ts`.
  - Depends on: 1.6
  - Validation: contract — defaults; dashboard novo payload.
  - Completion criteria: settings persistem por tenant; dashboard retrocompatível.

## 4. Telas de configuração (apps/web) — identidade Blade

- [ ] 4.1 NavBar + hub de Configurações
  - Objective: adicionar item "Agenda" à `nav-bar`; `/configuracoes` vira hub com seções
    (Inatividade — existente; Serviços; Barbeiros & Horários; Agenda — regras).
  - Likely files: `apps/web/components/nav-bar.tsx`, `app/configuracoes/**`.
  - Depends on: 3.x
  - Validation: manual — navegação; tokens Blade; sem "CRM"/"booking"/"slot".
  - Completion criteria: screenshot conferido.

- [ ] 4.2 Tela de Serviços (CRUD)
  - Objective: listar/criar/editar/desativar serviço (nome, duração, preço de tabela).
  - Likely files: `app/configuracoes/servicos/page.tsx`, `components/ServiceForm.tsx`,
    `ServicesList.tsx`.
  - Depends on: 3.1, 4.1
  - Validation: e2e — cria serviço → aparece ao agendar.
  - Completion criteria: screenshot; erro de duração inválida exibido.

- [ ] 4.3 Tela de Barbeiros & Horários
  - Objective: CRUD de barbeiro + editor de grade semanal (`WeeklyScheduleEditor`) + folgas/
    bloqueios (`ScheduleExceptionsEditor`) + serviços do barbeiro.
  - Likely files: `app/configuracoes/barbeiros/**`, `components/BarberForm.tsx`,
    `WeeklyScheduleEditor.tsx`, `ScheduleExceptionsEditor.tsx`.
  - Depends on: 3.1, 3.2, 4.1
  - Validation: e2e — grade com almoço reflete na disponibilidade; folga zera o dia.
  - Completion criteria: screenshots; comportamento conferido.

- [ ] 4.4 Tela de regras da Agenda
  - Objective: editar passo, antecedência mínima, no-show, confirmação (com ajuda/defaults).
  - Likely files: `app/configuracoes/agenda/page.tsx`, `components/AgendaSettingsForm.tsx`.
  - Depends on: 3.4, 4.1
  - Validation: manual — muda passo 30→15 e a disponibilidade passa a ofertar a cada 15 min.
  - Completion criteria: screenshot; persistência por tenant.

## 5. Telas da Agenda (apps/web)

- [ ] 5.1 Visão da agenda (dia/semana por barbeiro)
  - Objective: `/agenda` com dia (colunas por barbeiro) e semana; blocos coloridos por estado
    (agendado=steel, confirmado=green, concluído=gold, faltou=red, cancelado=wire riscado);
    navegação de data; estado vazio; responsivo (celular = lista por barbeiro).
  - Likely files: `app/agenda/page.tsx`, `components/AgendaCalendar.tsx`, `AgendaDayColumn.tsx`,
    `AppointmentBlock.tsx`, `AppointmentStatusBadge.tsx`.
  - Depends on: 3.3
  - Validation: e2e + manual — dia com agendamentos e dia vazio; screenshots Blade.
  - Completion criteria: agenda legível no desktop e no celular.

- [ ] 5.2 Criar/editar agendamento (com seletor de horários livres)
  - Objective: `AppointmentForm` — `ClientPicker` (busca/cadastro inline reusando `/api/clients`),
    serviço, barbeiro (ou "qualquer"), data → `AvailabilitySlotPicker` (só horários livres) →
    confirmar.
  - Likely files: `components/AppointmentForm.tsx`, `AvailabilitySlotPicker.tsx`, `ClientPicker.tsx`.
  - Depends on: 3.3, 5.1
  - Validation: e2e — cria em horário livre; tentar horário ocupado não é oferecido; conflito
    de corrida → mensagem e recarrega.
  - Completion criteria: fluxo de criação completo conferido.

- [ ] 5.3 Detalhe e ações do agendamento
  - Objective: `AppointmentDetailPanel` — Confirmar, Concluir (valor+forma → registra
    atendimento; oferece rebooking), Remarcar, Cancelar, Marcar falta; transições inválidas
    desabilitadas/explicadas.
  - Likely files: `components/AppointmentDetailPanel.tsx`.
  - Depends on: 3.3, 5.1
  - Validation: e2e — concluir gera atendimento no perfil e move o ticket médio; concluir 2×
    não duplica; cancelar libera o horário.
  - Completion criteria: cada ação conferida; estados corretos.

## 6. Integração com o CRM (apps/web)

- [ ] 6.1 Próximo agendamento + agendar no perfil do cliente
  - Objective: `/clientes/[id]` ganha card "Próximo agendamento" (`NextAppointmentCard`) e botão
    "Agendar"; histórico mostra serviço/barbeiro do catálogo quando houver.
  - Likely files: `app/clientes/[id]/page.tsx`, `components/NextAppointmentCard.tsx`.
  - Depends on: 3.3, 5.2
  - Validation: e2e — perfil com e sem agendamento futuro (estado vazio + ação).
  - Completion criteria: cenários "Próximo agendamento no perfil" verdes.

- [ ] 6.2 Exclusão LGPD abrange agendamentos futuros
  - Objective: `deleteClient` cancela/anonimiza agendamentos futuros do cliente; agenda e
    agregados não quebram.
  - Likely files: `packages/db/src/repositories/clients.ts` (ou via `packages/core`),
    `app/api/clients/[id]/route.ts`.
  - Depends on: 2.2, 1.5
  - Validation: integration — excluir cliente com agendamento futuro → agendamento cancelado,
    horário liberado, identidade removida.
  - Completion criteria: cenário "Exclusão de cliente com agendamento futuro" verde.

- [ ] 6.3 Dashboard com agenda de hoje
  - Objective: `/` mostra resumo dos agendamentos de hoje e faltas recentes; estado vazio quando
    não há agenda configurada.
  - Likely files: `app/page.tsx`, `components/*`.
  - Depends on: 3.4
  - Validation: e2e — dashboard com e sem agenda.
  - Completion criteria: cenários do delta de `crm-clientes` (dashboard) verdes.

## 7. Worker — jobs

- [ ] 7.1 Job real `agenda.no-show-sweep`
  - Objective: pg-boss agenda a varredura a cada `NO_SHOW_SWEEP_INTERVAL_MIN`; marca falta nos
    agendamentos ativos vencidos além de `no_show_after_min` (por tenant); idempotente; loga
    quantidade sem PII.
  - Likely files: `apps/worker/src/jobs/no-show-sweep.ts`, `src/index.ts`.
  - Depends on: 2.4, 0.2
  - Validation: integration — cria agendamento vencido → varredura marca "faltou"; concluído/
    cancelado inalterados; rodar 2× não muda nada.
  - Completion criteria: cenários "Varredura automática de falta" verdes.

- [ ] 7.2 Esqueletos honestos de confirmação e reativação
  - Objective: `agenda.send-confirmation` (seleciona agendamentos a `confirmation_lead_hours`)
    e `crm.reactivation-sweep` (seleciona inativos, regra da Fase 1) — executam a **seleção** e
    **registram (log) o que enviariam**, sem canal de envio (Fase 5).
  - Likely files: `apps/worker/src/jobs/send-confirmation.ts`, `reactivation-sweep.ts`.
  - Depends on: 7.1
  - Validation: unit/integration — seleção correta; log "would send" sem telefone completo.
  - Completion criteria: jobs registrados no pg-boss; nenhum envio real.

## 8. IA — contrato pronto (packages/ai, sem canal)

- [ ] 8.1 Registrar as tools da agenda no `packages/ai`
  - Objective: importar o contrato de tools de `packages/core` (2.5) e expor no formato de
    tool-use do cliente Claude (ADR-0005); documentar que não há loop de conversa nesta fase.
  - Likely files: `packages/ai/src/tools/index.ts`, `README.md`.
  - Depends on: 2.5, 0.3
  - Validation: unit — schemas expostos corretamente; sem chamada de rede.
  - Completion criteria: "estrutura pronta para o bot" verificável; Fase 5 só conecta o loop.

## 9. Migração opcional do preset da automação

- [ ] 9.1 Import idempotente de serviços/barbeiros/horário
  - Objective: script irmão do `migrate-automation-data.ts` que lê `servicos`/`barbeiros`/
    `horario_funcionamento` do preset da barbearia e cria serviços, barbeiros e grade; dry-run
    + relatório de divergências; idempotente.
  - Likely files: `packages/db/src/scripts/migrate-automation-agenda.ts`, `package.json` (script).
  - Depends on: 1.3, 1.4
  - Validation: integration — dry-run reporta; `--apply` cria; re-`--apply` não duplica.
  - Completion criteria: onboarding do módulo acelerado; sem duplicação.

## 10. Documentação e fechamento (DoD)

- [ ] 10.1 Runbook de onboarding do módulo de agenda
  - Objective: passo a passo (serviços → barbeiros → grade → regras → import opcional).
  - Likely files: `docs/operations/onboarding-produto.md` (seção nova), `apps/web/README.md`.
  - Depends on: 4.x, 9.1
  - Validation: manual — seguir o runbook do zero num Postgres limpo funciona.
  - Completion criteria: documentação reproduzível.

- [ ] 10.2 CHANGELOG + suíte completa verde
  - Objective: entrada no `CHANGELOG.md`; `pnpm lint`, `pnpm typecheck`, `pnpm test`,
    `pnpm build` limpos; E2E principal passando.
  - Likely files: `CHANGELOG.md`.
  - Depends on: todas as anteriores
  - Validation: manual — saídas de comando anexadas como evidência.
  - Completion criteria: DoD do workflow satisfeito.

- [ ] 10.3 Aplicar deltas nas specs permanentes e índices
  - Objective: criar `openspec/specs/agendamento/spec.md` a partir do delta; aplicar o delta de
    `crm-clientes`; atualizar `openspec/specs/README.md` (agendamento deixa de ser candidata) e
    `openspec/changes/README.md`; arquivar a change em `changes/archive/add-agendamento/`.
  - Likely files: `openspec/specs/**`, `openspec/changes/README.md`.
  - Depends on: 10.2
  - Validation: manual — specs coerentes; índices atualizados.
  - Completion criteria: change concluída e arquivada (etapa 11 do workflow).

<!--
Lembretes de rigor:
- Migração de dados (1.2, 9.1): schema, backfill opcional, compatibilidade, validação, rollback.
- API (3.x): contrato, implementação, testes de contrato, documentação.
- Observabilidade (7.x): logs com tenant_id, sem PII; contadores por log.
- Domínio antes de UI: 2.x fecha e passa nos testes antes de 5.x começar.
-->
