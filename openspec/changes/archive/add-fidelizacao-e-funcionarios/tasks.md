# Tasks: Fidelização de Clientes + Papel de Funcionário (Produto — Fase 4)

> Tarefas pequenas o bastante para um agente de IA implementar com baixo risco por sessão.
> Marque `[x]` **somente com evidência** (teste passando, screenshot, saída de comando).
> Ordem = ordem recomendada: **schema/sessão → fidelização (baixo risco) → gestão de
> funcionário → retrofit de autorização dono-only → retrofit de escopo de agenda → fechamento**.
> Branch: `feature/add-fidelizacao-e-funcionarios`.

## 0. Fundação — schema e sessão

- [x] 0.1 Schema `crm_users` (role, barberId, active) + migração
  - Evidência: `role app_user_role DEFAULT 'dono'`, `barber_id uuid NULL` + índice único parcial `crm_users_barber_id_idx ... WHERE barber_id is not null`, `active boolean DEFAULT true`. `pnpm db:generate` → `0003_strong_spacker_dave.sql`; `pnpm db:migrate` aplicado. Verificado via SQL direto: 4 usuários existentes migraram para `role='dono'`.
  - Objective: `role`/`barberId`/`active` em `crm_users`; restrição de exclusão parcial.
  - Likely files: `packages/db/src/schema/crm-users.ts`, `barbers.ts` (comentário atualizado).
  - Depends on: —
  - Validation: integration — testado em `users.test.ts` ("recusa criar um segundo login para o mesmo barbeiro").
  - Completion criteria: schema compila; restrição provada contra Postgres real.

- [x] 0.2 Schema `loyalty_settings`, `loyalty_redemptions`, `clients.loyaltyBaselineAt`
  - Evidência: mesma migração `0003_strong_spacker_dave.sql`. Verificado via SQL direto: 184 clientes existentes receberam `loyalty_baseline_at` preenchido (momento da migração).
  - Objective: tabelas/coluna conforme Data Model do design.md.
  - Likely files: `packages/db/src/schema/loyalty-settings.ts`, `loyalty-redemptions.ts`, `clients.ts`.
  - Depends on: —
  - Validation: integration — coberto em `loyalty.test.ts` ("conta só visitas após a ativação").
  - Completion criteria: cenário "Contagem desde a ativação" da spec tem a base de dados correta.

- [x] 0.3 `SessionData` +role/barberId; parse tolerante a sessão antiga
  - Evidência: `SessionData` com `role`/`barberId`; `parseSessionCookieValue` faz `raw.role ?? "dono"`. Verificado via HTTP real: cookie de sessão criado ANTES desta change (sem os campos no payload) continuou autenticando com sucesso numa rota dono-only (`/api/relatorios` → 200).
  - Objective: campos + parse tolerante.
  - Likely files: `apps/web/lib/session.ts`, `app/api/auth/login/route.ts` (passa role/barberId).
  - Depends on: —
  - Validation: manual — sessão antiga lida como dono, sem forçar logout.
  - Completion criteria: cenário "Sessão antiga após o deploy" da spec coberto (verificado com evidência real, não só unitário).

- [x] 0.4 `requireOwnerSessionApi` / `requireOwnerSessionPage`
  - Evidência: helpers em `lib/auth.ts`; usados em todas as rotas/páginas do grupo 3, verificados via HTTP real (403/redirect).
  - Objective: 403 (API) / redirect (página) quando `role !== "dono"`.
  - Likely files: `apps/web/lib/auth.ts`.
  - Depends on: 0.3
  - Validation: manual — chamada como funcionário retorna 403/redireciona; como dono, passa.
  - Completion criteria: helpers usados no grupo 3.

- [x] 0.5 `agenda-scope.ts` (scopeReadBarberId, assertWriteBarberId, isOwnAppointment)
  - Evidência: `apps/web/lib/agenda-scope.ts` + `agenda-scope.test.ts` — **7/7 testes unitários verdes** (primeiro test runner de `apps/web`, adicionado propositalmente dado o risco de segurança desta lógica; `vitest` + script `test` novos em `apps/web/package.json`).
  - Objective: três funções puras conforme Decision 4 do design.md.
  - Likely files: `apps/web/lib/agenda-scope.ts`, `agenda-scope.test.ts`, `package.json`.
  - Depends on: 0.3
  - Validation: unit — 7/7 verdes.
  - Completion criteria: funções usadas no grupo 4.

## 1. Fidelização — domínio, API e UI (baixo risco)

- [x] 1.1 Repositório `loyalty.ts` — contagem, listagem, resgate, settings
  - Evidência: `getLoyaltyStatus`, `listClientsReadyForRedemption` (CTE com `.having()`), `redeemLoyalty`, `getLoyaltySettings`/`updateLoyaltySettings`. `loyalty.test.ts` — **6/6 testes verdes** contra Postgres real (default 6, alteração de limite isolada por barbearia, baseline respeitada, meta atingida, resgate reinicia, listagem só retorna quem atingiu).
  - Objective: funções de agregação de fidelização.
  - Likely files: `packages/db/src/repositories/loyalty.ts`.
  - Depends on: 0.2
  - Validation: integration — 6/6 verdes.
  - Completion criteria: todos os cenários operacionais da spec cobertos.

- [x] 1.2 Teste de isolamento de tenant (fidelização)
  - Evidência: `loyalty.isolation.test.ts` — **2/2 testes verdes** (configuração de A não vaza pra B; cliente pronto para resgate em A nunca aparece na lista de B, mesmo após resgate/nova visita).
  - Objective: barbearia A não lê/altera fidelização de B.
  - Likely files: `packages/db/src/repositories/loyalty.isolation.test.ts`.
  - Depends on: 1.1
  - Validation: integration — 2/2 verdes.
  - Completion criteria: cenário "Isolamento de dados entre barbearias (fidelização)" coberto.

- [x] 1.3 Rotas `GET/PATCH /api/loyalty-settings`, `POST /api/clients/:id/loyalty/redeem`
  - Evidência: testado via HTTP real — settings default 6 (`GET`), alterado pra 2 (`PATCH`), redeem 201, contagem resetada confirmada no perfil do cliente.
  - Objective: settings dono-only; redeem para os dois papéis.
  - Likely files: `apps/web/app/api/loyalty-settings/route.ts`, `api/clients/[id]/loyalty/redeem/route.ts`.
  - Depends on: 1.1, 0.4
  - Validation: contract — verificado via HTTP real.
  - Completion criteria: rotas testadas via HTTP real.

- [x] 1.4 Sinalização no perfil do cliente + dashboard
  - Evidência: `components/loyalty-card.tsx` (perfil, com botão "Marcar resgate") + seção "Clientes prontos para resgate" no dashboard (`app/page.tsx`). Testado via HTTP real ponta a ponta: 2 visitas → perfil mostra "meta atingida" + dashboard lista o cliente → resgate via botão → perfil volta a mostrar "faltam N visita(s)".
  - Objective: UI de progresso/sinalização/resgate.
  - Likely files: `apps/web/app/clientes/[id]/page.tsx`, `components/loyalty-card.tsx`, `apps/web/app/page.tsx`.
  - Depends on: 1.3
  - Validation: e2e — fluxo completo conferido via HTTP real.
  - Completion criteria: cenários "Cliente atinge o limite", "Cliente abaixo do limite" conferidos.

## 2. Gestão de login de funcionário (dono)

- [x] 2.1 Repositório `users.ts` — createEmployeeLogin, resetPassword, deactivateLogin
  - Evidência: `users.test.ts` — **6/6 testes verdes** (cria e loga; recusa barbeiro de outra barbearia com `barber_not_found`; recusa segundo login pro mesmo barbeiro com `already_has_login`; `getEmployeeLoginForBarber`; redefinir senha invalida a antiga; desativar impede login sem apagar o registro).
  - Objective: CRUD de login de funcionário.
  - Likely files: `packages/db/src/repositories/users.ts`.
  - Depends on: 0.1
  - Validation: integration — 6/6 verdes.
  - Completion criteria: todos os cenários de gestão de login da spec cobertos.

- [x] 2.2 Rotas `POST/PATCH/DELETE /api/barbers/:id/login`
  - Evidência: `apps/web/app/api/barbers/[id]/login/route.ts`. **Achado de segurança pego e corrigido no caminho**: a primeira versão devolvia o `UserRecord` completo (incluindo `authSecretHash`) no JSON; corrigido com `toSafeLogin()` retornando só `{id, emailOrPhone, active}` em GET/POST/PATCH/DELETE, antes de qualquer teste externo. Testado via HTTP real: criar (201, sem hash na resposta), duplicar barbeiro (409).
  - Objective: dono-only; delega ao grupo 2.1.
  - Likely files: `apps/web/app/api/barbers/[id]/login/route.ts`.
  - Depends on: 2.1, 0.4
  - Validation: contract — verificado via HTTP real.
  - Completion criteria: rota testada via HTTP real (criar, redefinir, desativar).

- [x] 2.3 Tela de gestão em Configurações → Barbeiros & Horários
  - Evidência: `components/employee-login-panel.tsx`, integrado em `configuracoes/barbeiros/[id]/page.tsx` (dono-only). **Mesmo achado de segurança**: a página server-side inicialmente passava o `UserRecord` completo como prop pro client component (vazando o hash no payload RSC); corrigido para mapear só os campos seguros antes de passar. Testado via HTTP real: funcionário criado consegue logar (`{"ok":true}`).
  - Objective: fluxo de criação/gestão de login na tela existente.
  - Likely files: `apps/web/app/configuracoes/barbeiros/[id]/page.tsx`, `components/employee-login-panel.tsx`.
  - Depends on: 2.2
  - Validation: manual — fluxo completo: criar login → funcionário loga com sucesso.
  - Completion criteria: Flow 1/Flow 4 do design.md conferidos de ponta a ponta.

## 3. Retrofit de autorização — rotas e páginas dono-only

> Evidência obrigatória: teste HTTP real logado como funcionário esperando 403 (ou redirect).

- [x] 3.1 Mutações de `services` e `barbers` (+ schedule, exceptions, services-assignment)
  - Evidência: todas as rotas de mutação trocadas para `requireOwnerSessionApi`; GET mantido em `requireSessionApi`. Testado via HTTP real como funcionário: `POST /api/services` → 403, `POST /api/barbers` → 403, `PUT /api/barbers/:id/schedule` → 403; `GET /api/services` → 200 (leitura preservada).
  - Objective: mutações dono-only, leituras compartilhadas.
  - Likely files: `apps/web/app/api/services/**`, `api/barbers/**` (7 arquivos de rota).
  - Depends on: 0.4
  - Validation: contract — verificado via HTTP real.
  - Completion criteria: cenários "Funcionário tenta editar um serviço", "Funcionário pode consultar o catálogo para agendar" cobertos.

- [x] 3.2 `agenda-settings`, `settings` (inatividade), `relatorios`(`/pdf`), `loyalty-settings`
  - Evidência: todas viram `requireOwnerSessionApi` (GET e PATCH). Testado via HTTP real como funcionário: `GET /api/relatorios` → 403, `GET /api/relatorios/pdf` → 403, `GET /api/agenda-settings` → 403, `GET /api/settings` → 403, `GET /api/loyalty-settings` → 403. Como dono: todas 200 (regressão verificada).
  - Objective: configurações inteiramente dono-only.
  - Likely files: `apps/web/app/api/agenda-settings/route.ts`, `api/settings/route.ts`, `api/relatorios/route.ts`, `api/relatorios/pdf/route.tsx`, `api/loyalty-settings/route.ts`.
  - Depends on: 0.4
  - Validation: contract — verificado via HTTP real.
  - Completion criteria: cenário "Funcionário tenta acessar relatórios" coberto (e estendido às demais configs).

- [x] 3.3 `DELETE /api/clients/:id` (LGPD)
  - Evidência: `requireOwnerSessionApi`. Testado via HTTP real como funcionário: `DELETE` com id inexistente já barrado em 403 (antes de qualquer consulta ao banco).
  - Objective: exclusão de cliente dono-only.
  - Likely files: `apps/web/app/api/clients/[id]/route.ts`.
  - Depends on: 0.4
  - Validation: contract — verificado via HTTP real.
  - Completion criteria: cenário "Funcionário tenta excluir um cliente" coberto.

- [x] 3.4 Páginas `/configuracoes/**` e `/relatorios`
  - Evidência: **achado durante a implementação** — `configuracoes/agenda`, `configuracoes/inatividade` e `relatorios` eram 100% client-side, SEM nenhuma guarda de sessão server-side (só a API retornaria erro, deixando a página presa em "Carregando..." indefinidamente para um funcionário). Corrigido extraindo cada uma para um componente client (`agenda-config-form.tsx`, `inactivity-config-form.tsx`, `relatorios-view.tsx`) envolvido por um `page.tsx` server-side com `requireOwnerSessionPage()`. `configuracoes/page.tsx` (hub) e `configuracoes/barbeiros(/[id])/page.tsx`, `configuracoes/servicos/page.tsx` (já server components) trocados de `requireSessionPage` para `requireOwnerSessionPage`. Testado via HTTP real como funcionário: as 5 páginas retornam **307** (redirect); como dono, todas **200** (regressão verificada).
  - Objective: nenhuma tela restrita acessível por URL direta como funcionário.
  - Likely files: `apps/web/app/configuracoes/**/page.tsx`, `apps/web/app/relatorios/page.tsx`, `components/agenda-config-form.tsx`, `components/inactivity-config-form.tsx`, `components/relatorios-view.tsx`.
  - Depends on: 0.4
  - Validation: manual — 307 como funcionário, 200 como dono, verificado via HTTP real (não só revisão de código).
  - Completion criteria: nenhuma tela restrita acessível por URL direta como funcionário.

## 4. Retrofit de escopo de agenda — funcionário só vê o próprio barbeiro

- [x] 4.1 `GET /api/availability`, `GET /api/agenda/occupancy`, `GET /api/appointments`
  - Evidência: `scopeReadBarberId` aplicado nas três rotas. Testado via HTTP real com dois barbeiros reais na mesma barbearia (Rafael, com login; "Colega Sem Login", sem login): `GET /api/appointments` como Rafael tentando forçar `barberId` do colega na query → resposta contém **só o agendamento do Rafael**, parâmetro ignorado. `GET /api/agenda/occupancy` idem (1/90 do Rafael, mesmo pedindo o colega). `GET /api/availability?barberId=<colega>` devolveu slots com `barberId` do Rafael.
  - Objective: leitura de agenda sempre escopada ao próprio barbeiro para funcionário.
  - Likely files: `apps/web/app/api/availability/route.ts`, `api/agenda/occupancy/route.ts`, `api/appointments/route.ts`.
  - Depends on: 0.5
  - Validation: contract — verificado via HTTP real com dado cross-barbeiro real.
  - Completion criteria: cenário "Funcionário lista a própria agenda" coberto.

- [x] 4.2 `POST /api/appointments` (criação)
  - Evidência: `assertWriteBarberId` aplicado. Testado via HTTP real: Rafael tentando criar agendamento com `barberId` do colega → **403**.
  - Objective: criação recusada para barbeiro diferente do funcionário.
  - Likely files: `apps/web/app/api/appointments/route.ts`.
  - Depends on: 0.5
  - Validation: contract — verificado via HTTP real.
  - Completion criteria: cenário "Funcionário tenta criar agendamento para outro barbeiro" coberto.

- [x] 4.3 `/api/appointments/:id`, `/complete`, `/no-show`
  - Evidência: `isOwnAppointment` aplicado nas 4 rotas (GET/PATCH/DELETE + complete + no-show), tratando divergência como 404. Testado via HTTP real: Rafael tentando GET/confirmar/concluir/marcar-falta no agendamento do colega → **404 nas 4 ações**; confirmar o PRÓPRIO agendamento → **200** (caso positivo também verificado).
  - Objective: ações de agendamento escopadas ao próprio barbeiro.
  - Likely files: `apps/web/app/api/appointments/[id]/route.ts`, `api/appointments/[id]/complete/route.ts`, `api/appointments/[id]/no-show/route.ts`.
  - Depends on: 0.5
  - Validation: contract — verificado via HTTP real (caminho proibido E caminho permitido).
  - Completion criteria: cenário "Funcionário opera o próprio agendamento" coberto.

- [x] 4.4 Dashboard recortado para funcionário
  - Evidência: `app/page.tsx` bifurca em `session.role === "funcionario"` — retorna só "Minha agenda hoje" (escopada via `countAppointmentsByStatus`/`listRecentNoShows` com novo parâmetro opcional `barberId`), sem os cartões financeiros/CRM-wide. Testado via HTTP real: HTML da dashboard do funcionário contém só "Minha agenda hoje" — nenhum dos textos "Clientes ativos"/"Ticket médio"/"Clientes prontos para resgate"/"Clientes para reativar" aparece (nem no server-render, confirmando que não é só CSS escondendo). Dashboard do dono continua com tudo (regressão verificada).
  - Objective: dashboard do funcionário sem indicadores de negócio.
  - Likely files: `apps/web/app/page.tsx`, `packages/db/src/repositories/appointments.ts` (+`barberId` opcional em `countAppointmentsByStatus`/`listRecentNoShows`).
  - Depends on: 0.5
  - Validation: manual — verificado via HTTP real, texto ausente no HTML.
  - Completion criteria: Decision 5 (dashboard) do design.md verificada na tela real.

- [x] 4.5 Agenda recortada para funcionário (dia/semana/grade)
  - Evidência: `app/agenda/page.tsx` filtra `barbers` para `[o próprio]` quando `role === "funcionario"`; `AgendaWeekGrid` oculta o toggle "todos/um barbeiro" quando `barbers.length <= 1`. Testado via HTTP real: `/agenda?view=grade` como funcionário não contém "Todos os barbeiros" nem o nome do colega ("Colega Sem Login") em lugar nenhum do HTML; como dono, ambos aparecem (regressão verificada).
  - Objective: agenda do funcionário sem visão/menção a colegas.
  - Likely files: `apps/web/app/agenda/page.tsx`, `components/agenda-week-grid.tsx`.
  - Depends on: 4.1, 4.2, 4.3
  - Validation: manual — verificado via HTTP real, nome do colega ausente do HTML.
  - Completion criteria: Decision 5 (agenda) do design.md verificada na tela real.

## 5. Documentação e fechamento (DoD)

- [x] 5.1 CHANGELOG + suíte completa verde
  - Evidência: `CHANGELOG.md` atualizado (entrada `add-fidelizacao-e-funcionarios`, achado de segurança documentado). `pnpm lint` (No ESLint warnings or errors), `pnpm typecheck` (5/5 pacotes limpos), `pnpm test` (**104/104 testes verdes**: db 41, core 44, web 7 — primeiro test runner do app —, ai 6, worker 6), `pnpm build` (Next.js compilou, 27 rotas geradas incluindo `/api/barbers/[id]/login`, `/api/clients/[id]/loyalty/redeem`, `/api/loyalty-settings`).
  - Objective: entrada no CHANGELOG; suíte limpa.
  - Likely files: `CHANGELOG.md`.
  - Depends on: todas as anteriores
  - Validation: manual — saídas de comando anexadas como evidência.
  - Completion criteria: DoD do workflow satisfeito.

- [x] 5.2 Aplicar deltas nas specs permanentes e índices
  - Evidência: `openspec/specs/fidelizacao-clientes/spec.md` e `openspec/specs/auth-tenancy/spec.md` criados a partir dos deltas; MODIFIED aplicado em `openspec/specs/agendamento/spec.md`; `openspec/specs/README.md` atualizado (as duas capabilities saem de "candidatas" para "especificadas"); change movida para `changes/archive/add-fidelizacao-e-funcionarios/`.
  - Objective: specs permanentes atualizadas; change arquivada.
  - Likely files: `openspec/specs/**`.
  - Depends on: 5.1
  - Validation: manual — specs coerentes; índices atualizados.
  - Completion criteria: change concluída e arquivada (etapa 11 do workflow).

<!--
Lembretes de rigor:
- Grupo 3/4 foram verificados com o caminho PROIBIDO (403/404) E o caminho PERMITIDO (200),
  contra dado real de dois barbeiros na mesma barbearia — não apenas revisão de código.
- Dois achados de segurança reais foram pegos e corrigidos DURANTE a implementação (vazamento
  de authSecretHash em rota de API e em prop de client component) — nenhum dos dois chegou a
  ser exposto externamente; ambos corrigidos antes de qualquer verificação HTTP.
- Toda vez que uma rota nova for criada FORA desta change no futuro, ela precisa ser
  classificada na matriz do design.md (dono/ambos/escopado).
-->
