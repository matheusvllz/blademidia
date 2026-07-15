# Progresso da implementação — `add-agendamento` (Fase 2)

> Documento de handoff para retomar a implementação sem perder contexto.
> Atualizado em 2026-07-14. Branch: `feature/add-agendamento` (a partir de `main`).
> Proposal está `Approved`. Fluxo e evidências detalhadas em `tasks.md`.

## Estado geral

| Grupo | Descrição | Status |
|---|---|---|
| 0 | Fundação (core, worker, ai, infra, ADRs) | ✅ **completo e commitado** |
| 1 | Schema + repositórios + isolamento | ✅ **completo e commitado** |
| 2 | Domínio `AgendaService` | ✅ **completo e commitado** (24/24 testes) |
| 3 | API interna (rotas) | ✅ **completo e commitado** (validado via HTTP real ponta a ponta) |
| 4 | Telas de configuração | ✅ **completo e commitado** (validado via HTTP real) |
| 5 | Telas da Agenda | ⬜ pendente |
| 6 | Integração CRM | ⬜ pendente |
| 7 | Worker jobs | ⬜ pendente |
| 8 | IA — tools em packages/ai | ⬜ pendente |
| 9 | Migração do preset da automação | ⬜ pendente |
| 10 | Fechamento (docs, specs, índices) | ⬜ pendente |

**Commits na branch (ordem):**
1. `feat(agendamento): fundação da Fase 2 …` (Grupo 0 + SDD Approved)
2. `feat(agendamento): schema, migração anti-double-booking e repositórios …` (Grupo 1)
3. `feat(agendamento): AgendaService — motor de disponibilidade + operações (WIP Grupo 2) …`
4. `feat(agendamento): completa domínio — testes de integração + contrato de tools …` (fecha Grupo 2)
5. (pendente) commit do Grupo 3 — ver "Como retomar".

## Pré-requisitos do ambiente (para rodar)

- **Docker Desktop precisa estar rodando** (no Windows do Vítor). Subir Postgres:
  `docker compose up -d` (raiz do monorepo). Container: `blademidia-postgres-1`.
- `.env` na raiz já existe (tem `DATABASE_URL`, `SESSION_SECRET`; agora também deve ter
  `TZ`, `NO_SHOW_SWEEP_INTERVAL_MIN`, `ANTHROPIC_API_KEY`, `AI_MODEL` — ver `.env.example`).
- Migração já aplicada no banco local (0000 da Fase 1 + **0001 desta change**). Se o banco
  for recriado: `pnpm db:migrate`.
- Instalar deps: `pnpm install` (já feito; pg-boss e zod adicionados).
- Rodar testes: `pnpm --filter @blademidia/<pkg> test`. Testes de integração/isolamento
  pulam sozinhos sem `DATABASE_URL`.

## Grupo 0 — Fundação (✅)

Criado e validado:
- **`packages/core`** (`@blademidia/core`): camada de domínio (ADR-0008). Depende de
  `@blademidia/db` e `zod`.
- **`apps/worker`** (`@blademidia/worker`): processo pg-boss (ADR-0009). Boot validado
  (`[worker] up`). `src/index.ts` sobe pg-boss e chama `registerJobs` (stub em
  `src/jobs/index.ts` — preencher no Grupo 7). Roda no HOST em dev: `pnpm worker`.
- **`packages/ai`** (`@blademidia/ai`): esqueleto. `src/client.ts` = `resolveAiConfig`
  (lê `ANTHROPIC_API_KEY`/`AI_MODEL`, **sem** chamar a API). `src/tools/index.ts` = stub
  (preencher no Grupo 8). Teste `client.test.ts` (3/3 verdes). **Sem SDK Anthropic** de
  propósito (custo zero na Fase 2).
- **Infra/env**: `.env.example` estendido; `docker-compose.yml` (comentário: worker no host);
  scripts na raiz (`worker`, `db:migrate-automation-agenda`). `infra/stack` NÃO foi tocada
  (é da agência).
- **ADRs**: `ADR-0008-camada-dominio-e-contrato-de-tools.md`,
  `ADR-0009-worker-pgboss.md` (Status Proposto).

## Grupo 1 — Schema + repositórios (✅)

**Schema** (`packages/db/src/schema/`), tudo com `barbershop_id`:
- `barbers` (recurso, sem login; `active`/`deletedAt` p/ soft-delete).
- `services` (catálogo; `duration_min`, `price_cents` = preço de TABELA, ≠ valor pago).
- `barber-services` (N:N; PK composta; vazio = faz todos).
- `work-schedules` (grade semanal; `weekday` 0=domingo; várias linhas/dia = intervalos).
- `schedule-exceptions` (`folga`/`bloqueio`/`extra`; `barber_id` NULL = barbearia toda).
- `appointments` (status: agendado/confirmado/concluido/cancelado/faltou; source:
  painel/bot/importacao; `visit_id` p/ conclusão idempotente).
- `agenda-settings` (1:1 barbearia; slotStepMin=30, minAdvanceMin=0, noShowAfterMin=30,
  confirmationLeadHours=24 defaults).
- **`visits` modificada**: +`service_id`/`staff_id` (nullable, FK catálogo).
- **`barbershops` modificada**: +`timezone` (default `America/Sao_Paulo`).

**Migração** `migrations/0001_magenta_skaar.sql`: gerada pelo Drizzle + **SQL manual anexado**
no fim → `CREATE EXTENSION btree_gist` + **restrição de exclusão** `appointments_no_overlap`
(`EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE
status IN ('agendado','confirmado')`). **Provado no banco**: sobreposição do mesmo barbeiro →
`ERROR 23P01`; adjacente (fim=início) passa. ⚠️ Se regenerar migração com `db:generate`, o SQL
manual do fim do 0001 **não** é recriado — preservar.

**Repositórios** (`packages/db/src/repositories/`), `barbershopId` sempre 1º arg:
- `services.ts`, `barbers.ts` (+`listBarbersForService`, +`setBarberServices`),
  `work-schedules.ts`, `schedule-exceptions.ts`, `agenda-settings.ts`.
- `appointments.ts`: `createAppointment` (traduz 23P01→`conflict`), `getAppointment`,
  `listAppointments`, `listActiveAppointmentsForBarbers` (base da disponibilidade),
  `setAppointmentStatus`, `rescheduleAppointment` (row-level), **`completeAppointmentWithVisit`**
  (transação: visita+pagamento+vínculo, idempotente por `visit_id`), `listUpcomingForClient`,
  `cancelFutureAppointmentsForClient` (LGPD), `listNoShowCandidates(now)` (varredura cross-tenant
  com limite por barbearia), `countAppointmentsByStatus`.
- `barbershops.ts`: +`getBarbershop(id)`.
- Exports adicionados em `packages/db/src/index.ts`.

**Testes**: `agenda.isolation.test.ts` (5 testes, Postgres real). Suíte db = **16/16 verdes**.

## Grupo 2 — Domínio (🟡 EM ANDAMENTO)

**Já escrito e com typecheck limpo** (`packages/core/src/agenda/`):
- `timezone.ts`: `getTimezoneOffsetMs`, `zonedWallTimeToInstant`, `weekdayOf`,
  `parseTimeToMinutes`, `instantToZonedDateISO`, `zonedDayBounds`. (Fuso via `Intl`, sem lib;
  exato p/ America/Sao_Paulo que não tem DST.)
- `availability.ts`: motor PURO — `mergeIntervals`, `subtractIntervals`, `resolveOpenWindows`,
  `generateSlots`, `resolveOpenWindowsAsInstants`, `computeBarberDaySlots`,
  `computeAvailability` (união "qualquer barbeiro"), `isWithinOpenWindows`.
- `availability.test.ts`: **10/10 verdes** (grade, almoço, folga, bloqueio, extra,
  sobreposição, antecedência, passo 15, encaixe exato, união).
- `agenda-service.ts`: `getAvailability`, `bookAppointment` (+`assertBookable`),
  `confirmAppointment`, `cancelAppointment`, `rescheduleAppointment`, `completeAppointment`,
  `markNoShow`. Result type: `AgendaResult<T> = {ok:true,value} | {ok:false,reason}` com
  reasons `not_found|not_available|in_past|conflict|invalid_transition`.
- `index.ts` do agenda e `packages/core/src/index.ts` exportam o módulo.

**Correção importante de spec no caminho**: o cenário "Horários livres de um serviço num dia"
na `specs/agendamento/spec.md` tinha erro aritmético (dizia que serviço de 30 min não oferece
11:30, mas 11:30–12:00 encaixa). Corrigido para serviço de 60 min + cláusula de "encaixe exato".

**Grupo 2 concluído** (motor + service + tools, 24/24 testes). **Grupo 3 concluído** — todas
as rotas de API criadas em `apps/web/app/api/` e **validadas via HTTP real** (servidor
`pnpm start` + `curl`, não só typecheck): services, barbers (+services/schedule/exceptions),
availability, appointments (CRUD + complete + no-show), agenda-settings, dashboard ajustado
(+`agenda.today`/`recentNoShows`, usa `getBarbershop`+`zonedDayBounds` de `@blademidia/core`
para o "hoje" no fuso certo). `pnpm --filter @blademidia/web build` limpo (26 rotas).

⚠️ **Gotcha operacional descoberto**: em dev/smoke-test no Windows, `pkill -f "next start"`
via Git Bash **não mata o processo** de forma confiável (fica em `LISTENING` na porta 3000).
Usar `netstat -ano | grep :3000` para achar o PID e `taskkill //F //PID <pid>` para matar de
verdade antes de subir de novo — senão o `curl` conversa com o servidor ANTIGO (já aconteceu:
testei o dashboard e o processo velho, sem o campo `agenda`, respondeu primeiro).

## Próximos grupos (resumo do que falta — detalhe completo em `tasks.md`)

- **Grupo 4 — Telas config** (`apps/web/app/configuracoes/`): NavBar +item "Agenda"; hub de
  Configurações com seções Serviços, Barbeiros&Horários (grade+folgas+serviços do barbeiro),
  regras da Agenda. Usar classes Blade existentes (`card-blade`, `btn-gold`, `input-blade`,
  `label-blade`, `badge-*`). Zero "CRM"/"booking"/"slot".
- **Grupo 5 — Telas Agenda** (`apps/web/app/agenda/`): visão dia/semana por barbeiro
  (`AgendaCalendar`, `AppointmentBlock`, cores por status), form de agendamento
  (`AppointmentForm` + `AvailabilitySlotPicker` + `ClientPicker` reusando `/api/clients`),
  detalhe/ações (`AppointmentDetailPanel`: confirmar/concluir/remarcar/cancelar/falta + rebooking).
- **Grupo 6 — Integração CRM**: `/clientes/[id]` +card "Próximo agendamento" + botão Agendar;
  `deleteClient` passa a cancelar agendamentos futuros (usar `cancelFutureAppointmentsForClient`);
  dashboard com agenda de hoje/faltas.
- **Grupo 7 — Worker jobs** (`apps/worker/src/jobs/`): `no-show-sweep.ts` (real; usa
  `listNoShowCandidates` + marca falta guardado por status ativo; agenda pg-boss a cada
  `NO_SHOW_SWEEP_INTERVAL_MIN`). Esqueletos `send-confirmation.ts`/`reactivation-sweep.ts`
  (selecionam e **logam** o que enviariam, sem enviar). Preencher `registerJobs`.
  ⚠️ Falta um repo helper `markNoShowIfActive(barbershopId, id)` (update WHERE status ativo)
  — criar em `appointments.ts` para o sweep ser idempotente sob corrida.
- **Grupo 8 — IA**: `packages/ai/src/tools/index.ts` importa `agendaTools` de `@blademidia/core`
  e expõe no formato tool-use da Claude API. Sem canal/loop (Fase 5). Teste dos schemas.
- **Grupo 9 — Migração preset**: `packages/db/src/scripts/migrate-automation-agenda.ts`
  (irmão de `migrate-automation-data.ts`) — lê `servicos`/`barbeiros`/`horario_funcionamento`
  do preset da barbearia e cria services/barbers/work_schedules; dry-run + idempotente.
  Script `db:migrate-automation-agenda` já está no `package.json` da raiz (falta no
  `packages/db/package.json` mapear "migrate-automation-agenda").
- **Grupo 10 — Fechamento**: runbook em `docs/operations/onboarding-produto.md`; `CHANGELOG.md`;
  `pnpm -r lint/typecheck/test/build` verdes; **aplicar deltas** em
  `openspec/specs/agendamento/spec.md` (novo) + `openspec/specs/crm-clientes/spec.md`;
  atualizar `openspec/specs/README.md` e `openspec/changes/README.md`; arquivar a change em
  `openspec/changes/archive/add-agendamento/`.

## Como retomar (comando a comando)

```bash
# 1. garantir ambiente
docker compose up -d
git checkout feature/add-agendamento
pnpm install

# 2. sanity check do que já existe
pnpm --filter @blademidia/core test   # 24/24 (motor + service + tools)
pnpm --filter @blademidia/db test      # 16/16 (repos + isolamento)
pnpm --filter @blademidia/web build    # 26 rotas, build limpo

# 3. retomar no Grupo 4 (telas de configuração)
#    depois seguir Grupos 5→10 na ordem do tasks.md
```

## Gotchas / decisões que não podem se perder

- **Nada de regra de agenda fora de `packages/core`** (ADR-0008). Rotas e worker são cascas finas.
- **Fuso**: banco em `timestamptz` (UTC); cálculo/exibição em `America/Sao_Paulo`. A grade é
  hora local; conversão só na borda (`timezone.ts`).
- **Double booking**: a garantia final é a restrição de exclusão no banco (23P01 → `conflict`);
  a validação em app é só UX. Não remover a restrição ao regenerar migrações.
- **Financeiro**: `services.price_cents` (tabela) ≠ `payments_log.amount_cents` (pago). Registro,
  nunca gateway.
- **Barbeiro = recurso sem login** nesta fase (Q1). Login de funcionário é Fase 4.
- **Sem chamada externa na Fase 2**: `packages/ai` não chama a API; worker não envia WhatsApp
  (esqueletos logam). Custo externo zero (D4).
- **Weekday**: 0=domingo … 6=sábado (igual `Date.getDay()` e chaves do preset da automação).
- **`.npmrc` `node-linker=hoisted`** é obrigatório (Next + agora worker importando core).
