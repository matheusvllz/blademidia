# Design: Fidelização de Clientes + Papel de Funcionário (Produto — Fase 4)

## Context

O produto tem hoje um único papel implícito ("dono"), auth por cookie HMAC assinado
(`lib/session.ts`, `SessionData = {userId, barbershopId, exp}`), e ~25 rotas de API que
assumem esse único papel. `crm_users` já tem um comentário no schema antecipando esta mudança
("ganha coluna de papel — não é reescrita"). Este design faz duas coisas de natureza muito
diferente: (1) uma feature de produto de baixo risco (fidelização) e (2) a **primeira
introdução de autorização por papel** no sistema — o risco real desta change está inteiramente
em (2).

## Goals and Constraints

### Goals
- Fidelização: contagem correta, sinalização, resgate, configuração — reusando os padrões já
  estabelecidos (`crm_settings`/`agenda_settings` para config 1:1 por barbearia).
- Auth-tenancy: papel `dono`/`funcionario`, funcionário vinculado a um barbeiro, retrofit
  **sistemático e auditável** de toda rota sensível — nenhuma rota esquecida.
- Sessões existentes continuam válidas após o deploy (sem logout em massa).

### Constraints
- **D5 / ADR-0007**: `barbershop_id` continua escopando tudo; papel é uma camada ADICIONAL,
  nunca substitui o isolamento de tenant.
- **Sem infraestrutura de e-mail**: nenhum fluxo de convite/recuperação de senha por e-mail.
- **Time de 1 dev + IA**: a matriz de autorização precisa ser simples de auditar (uma tabela,
  não lógica espalhada) — é o que evita "esquecer uma rota".
- **D4** (orçamento): nenhuma dependência nova; tudo dentro do stack já usado.

## Proposed Architecture

```text
apps/web/
  lib/
    session.ts        # SessionData +role +barberId; parse compatível com sessão antiga
    auth.ts            # +requireOwnerSessionApi, +requireOwnerSessionPage
    agenda-scope.ts    # NOVO — helpers de escopo de barberId para funcionário (padrão único)
  app/api/**           # retrofit: rotas dono-only usam requireOwnerSessionApi;
                        # rotas de agenda usam o padrão de agenda-scope.ts
packages/db/
  schema/crm-users.ts   # +role, +barberId, +active
  schema/loyalty-settings.ts   # NOVO (1:1 barbearia, como agenda_settings)
  schema/loyalty-redemptions.ts # NOVO (evento de resgate)
  schema/clients.ts     # +loyaltyBaselineAt
  repositories/users.ts # +createEmployeeLogin, +resetPassword, +deactivateLogin, +role check
  repositories/loyalty.ts # NOVO
```

Nenhum pacote novo no monorepo — este design vive inteiramente em `apps/web` (autorização é
uma preocupação de sessão/rota, não de domínio) e `packages/db` (dados). Diferente da Fase 2/3,
não há necessidade de `packages/core` aqui: fidelização é uma agregação simples (repositório) e
autorização é checagem de sessão (não é regra de negócio de agenda/relatório reusável por
worker/bot).

## Technical Decisions

### Decision 1: Papel e vínculo em `crm_users` (coluna, não tabela nova)
- Decision: `crm_users` ganha `role pgEnum('dono','funcionario') NOT NULL DEFAULT 'dono'`,
  `barber_id uuid NULL REFERENCES barbers(id)` (obrigatório na aplicação quando
  `role='funcionario'`, nunca no banco — mesma filosofia de `services`/`barbers` que validam
  campo obrigatório no repositório, não via CHECK), e `active boolean NOT NULL DEFAULT true`
  (login pode ser desativado sem apagar o registro/histórico).
- Rationale: exatamente o que o comentário do schema já previa. Um login = um barbeiro, no
  máximo (restrição de exclusão parcial `UNIQUE(barber_id) WHERE barber_id IS NOT NULL`)
  evita ambiguidade "qual login representa este barbeiro".
- Trade-offs: se um dia um barbeiro precisar de dois logins (não previsto, fora do ICP), a
  restrição impede — aceitável, reversível (é só remover o índice).

### Decision 2: Sessão carrega `role`/`barberId`; leitura de sessão antiga é compatível
- Decision: `SessionData` ganha `role: "dono" | "funcionario"` e `barberId: string | null`.
  `parseSessionCookieValue` faz o parse tolerante: se o payload decodificado não tiver `role`
  (sessão emitida antes desta capability), assume `"dono"`/`null` na leitura — sem reescrever o
  cookie, sem forçar logout.
- Rationale: Business Rule do proposal ("sessão sem role é lida como dono"). Forçar logout em
  massa no deploy seria um incidente evitável.
- Trade-offs: um funcionário criado e uma sessão de dono antiga coexistem sem conflito, porque
  o `barberId` resolvido pela sessão de dono é sempre `null` (dono não é obrigatoriamente um
  barbeiro).

### Decision 3: Matriz de autorização centralizada, aplicada por dois padrões
- Decision: toda rota nova/existente segue **um de dois padrões**, nunca lógica ad-hoc:
  1. **Dono-only**: troca `requireSessionApi()` por `requireOwnerSessionApi()` (novo helper em
     `lib/auth.ts`) — 403 se `role !== "dono"`. Usado em mutações de configuração e em
     `relatorios` inteiro.
  2. **Escopado por barbeiro (funcionário)**: rotas de agenda continuam com
     `requireSessionApi()` (ambos os papéis acessam), mas passam pelo padrão único de
     `lib/agenda-scope.ts` (Decision 4) antes de ler/escrever.
  A tabela completa está em "API / Contract Design" abaixo — é o documento de auditoria que o
  `tasks.md` percorre rota por rota.
- Rationale: a causa mais comum de bug de autorização é lógica duplicada e inconsistente por
  rota. Dois padrões, aplicados mecanicamente, tornam a revisão factível (comparar cada rota
  contra a tabela, não reler cada implementação do zero).
- Trade-offs: nenhum — é estritamente mais simples que alternativas.

### Decision 4: Escopo de agenda do funcionário — três formas, um helper por forma
- Decision: `lib/agenda-scope.ts` exporta três funções puras (sem I/O):
  - `scopeReadBarberId(session, requestedBarberId?)` → se `funcionario`, retorna
    `session.barberId` (ignora o que veio da query); se `dono`, retorna o que veio (ou
    `undefined` = todos).
  - `assertWriteBarberId(session, barberId)` → se `funcionario` e `barberId !==
    session.barberId`, retorna erro `forbidden`; senão ok.
  - `isOwnAppointment(session, appointment)` → se `funcionario`, `appointment.barberId ===
    session.barberId`; se `dono`, sempre `true`.
  Rotas de detalhe/ação de agendamento (`/api/appointments/:id/*`) usam
  `isOwnAppointment` e, se falso, respondem **404** (mesmo tratamento de "não encontrado" que
  já existe para cross-tenant — um agendamento de colega, para o funcionário, "não existe" do
  ponto de vista dele, mesma fronteira lógica que tenant).
- Rationale: três formas de uso cobrem TODAS as rotas de agenda existentes (listar, criar,
  agir-sobre-um-item) sem inventar uma quarta. Reusar o código de erro "não encontrado" (em vez
  de inventar 403 para este caso específico) mantém consistência com o padrão já testado de
  isolamento de tenant.
- Trade-offs: nenhum.

### Decision 5: Dashboard e Agenda do funcionário são recortes, não telas novas
- Decision: `/` (dashboard) e `/agenda` continuam sendo a MESMA página para os dois papéis; a
  página, ao montar os dados server-side, verifica `session.role` e:
  - Dashboard: funcionário vê só "agenda de hoje" e "faltas recentes", ambos filtrados ao
    próprio `barberId` — os cartões de clientes ativos/inativos/ticket médio (indicadores de
    negócio) SHALL NOT aparecer para funcionário.
  - Agenda: funcionário vê a mesma UI (dia/semana/grade), mas a lista de barbeiros passada aos
    componentes é `[o próprio barbeiro]` — o toggle "todos os barbeiros" da grade fica oculto
    (não há "outros" para alternar).
- Rationale: reusa 100% dos componentes já existentes (Fase 2/3) — a restrição é sobre QUAIS
  DADOS chegam ao componente, não uma tela nova a manter. Consistente com "não introduzir UI
  paralela" já praticado nas fases anteriores.
- Trade-offs: nenhum.

### Decision 6: Contagem de fidelização via "baseline" em vez de coluna contadora
- Decision: `clients` ganha `loyalty_baseline_at timestamptz NOT NULL DEFAULT now()`. A
  contagem = `COUNT(visits WHERE clientId = X AND occurredAt > COALESCE(último
  loyalty_redemptions.redeemedAt, clients.loyalty_baseline_at))`. Resgate = INSERT em
  `loyalty_redemptions` (não é um UPDATE de contador).
- Rationale: `visits` é criada em DOIS lugares (`registerVisit` do CRM e
  `completeAppointmentWithVisit` da agenda) — um contador incrementado manualmente em dois
  pontos de escrita arrisca divergência (esquecer de incrementar num deles). Calcular
  on-the-fly a partir de `visits` (fonte única, já existente) elimina essa classe de bug por
  construção — mesmo raciocínio do ADR-0010 (fonte única de cálculo). `DEFAULT now()` na coluna
  nova resolve "começa do zero" (Decisão 4 do exploration) SEM script de backfill: o Postgres
  aplica esse `now()` (avaliado uma vez, no momento do `ALTER TABLE`) a todas as linhas
  existentes, e cada cliente novo recebe seu próprio `now()` na criação.
- Trade-offs: a contagem é uma query (não uma leitura O(1) de coluna) — irrelevante no volume
  do ICP (poucas dezenas de visitas por cliente).

## Alternatives Considered

### Alternative 1: Tabela de permissões genérica (RBAC configurável)
- Description: tabela `roles`/`permissions` configurável em vez de um enum fixo `dono`/
  `funcionario`.
- Why not chosen: over-engineering para 2 papéis fixos e um ICP de 1-3 cadeiras. Non-Goal
  explícito do proposal ("papéis além de dono/funcionário"). Se um dia crescer, o enum vira
  tabela sem quebrar a interface pública dos helpers de `lib/auth.ts`.

### Alternative 2: Contador de fidelização como coluna em `clients`
- Description: `clients.loyaltyCount int`, incrementado a cada visita registrada.
- Why not chosen: Decision 6 — dois pontos de escrita de `visits` tornam um contador
  manualmente incrementado frágil (drift silencioso). A query on-the-fly é a fonte única.

### Alternative 3: Middleware global de autorização (em vez de helper por rota)
- Description: um `middleware.ts` central que inspeciona toda rota `/api/*` e aplica a matriz.
- Why not chosen: o `middleware.ts` já existe e cuida só de redirecionar página sem sessão
  (Edge Runtime, sem acesso a Postgres para resolver `barberId` de um agendamento específico).
  Um middleware genérico não consegue expressar "escopo por barbeiro de UM agendamento" sem
  duplicar a query que a rota já faz. Os dois padrões da Decision 3 (helper de sessão + helper
  de escopo) resolvem isso sem essa limitação, ao custo de precisar aplicar o padrão rota por
  rota — mitigado pela tabela de auditoria.

## Affected Components

| Component | Change | Reason |
|---|---|---|
| `packages/db/schema/crm-users.ts` | +`role`, +`barberId`, +`active` | Decision 1 |
| `packages/db/schema/loyalty-settings.ts` (novo) | Tabela 1:1 barbearia, `thresholdVisits` | Fidelização |
| `packages/db/schema/loyalty-redemptions.ts` (novo) | Evento de resgate | Decision 6 |
| `packages/db/schema/clients.ts` | +`loyaltyBaselineAt` | Decision 6 |
| `packages/db/repositories/users.ts` | +`createEmployeeLogin`, +`resetPassword`, +`deactivateLogin`, `verifyLogin` checa `active` | Gestão de login |
| `packages/db/repositories/loyalty.ts` (novo) | Contagem, listagem "prontos para resgate", resgate, settings | Fidelização |
| `apps/web/lib/session.ts` | +`role`/`barberId`; parse tolerante a sessão antiga | Decision 2 |
| `apps/web/lib/auth.ts` | +`requireOwnerSessionApi`, +`requireOwnerSessionPage` | Decision 3 |
| `apps/web/lib/agenda-scope.ts` (novo) | `scopeReadBarberId`, `assertWriteBarberId`, `isOwnAppointment` | Decision 4 |
| `apps/web/app/api/services/**`, `barbers/**` (mutações), `agenda-settings`, `settings`, `relatorios/**` | Trocar para `requireOwnerSessionApi` | Matriz (dono-only) |
| `apps/web/app/api/appointments/**`, `availability`, `agenda/occupancy` | Aplicar `agenda-scope.ts` | Matriz (escopado) |
| `apps/web/app/api/clients/[id]` (DELETE) | `requireOwnerSessionApi` | Matriz (LGPD dono-only) |
| `apps/web/app/api/barbers/[id]/login` (novo) | CRUD de login de funcionário | Gestão |
| `apps/web/app/api/clients/[id]/loyalty/redeem` (novo), `loyalty-settings` (novo) | Ações de fidelização | Fidelização |
| `apps/web/app/page.tsx`, `app/agenda/page.tsx` | Recorte por papel (Decision 5) | Dashboard/Agenda |
| `apps/web/app/configuracoes/**` | Página inteira vira `requireOwnerSessionPage` | Matriz (dono-only) |
| `apps/web/app/relatorios/page.tsx` | `requireOwnerSessionPage` | Matriz (dono-only) — hoje já é client-side; ganha guarda server-side |
| `apps/web/components/client-profile-actions.tsx` (ou perfil do cliente) | +ação de resgate, +sinalização de meta | Fidelização |

## Main Flows

### Flow 1: Dono cria um funcionário
1. Dono abre Configurações → Barbeiros & Horários → barbeiro existente → "Definir login".
2. Informa email/telefone + senha.
3. `POST /api/barbers/:id/login` → `createEmployeeLogin` cria `crm_users` com
   `role='funcionario'`, `barberId=:id`.
4. Barbeiro agora consegue logar em `/login` com essas credenciais.

### Flow 2: Funcionário loga e opera a própria agenda
1. Funcionário loga → sessão com `role='funcionario'`, `barberId=X`.
2. Abre `/agenda` → página busca só o barbeiro X, reusando `AgendaBoard`/`AgendaWeekGrid` sem
   o toggle "todos os barbeiros".
3. Cria/confirma/conclui agendamento normalmente — `barberId` do corpo é sempre X (Decision 4).
4. Tenta abrir `/relatorios` diretamente pela URL → `requireOwnerSessionPage` redireciona para
   `/`.

### Flow 3: Cliente atinge a meta de fidelização
1. Cliente completa a Nª visita (registrada via CRM ou conclusão de agendamento).
2. Perfil do cliente e dashboard consultam `getLoyaltyStatus`/`listClientsReadyForRedemption`
   (query on-the-fly, Decision 6) → mostram sinalização.
3. Barbeiro (dono ou funcionário) marca resgate → `POST /api/clients/:id/loyalty/redeem` →
   INSERT em `loyalty_redemptions` → contagem reinicia a partir de agora.

### Flow 4: Dono redefine senha / desativa funcionário
1. Configurações → Barbeiros & Horários → barbeiro com login → "Redefinir senha" ou
   "Desativar login".
2. `PATCH`/`DELETE /api/barbers/:id/login` → `resetPassword`/`deactivateLogin`.
3. Login antigo para de funcionar (senha trocada) ou sessões futuras são recusadas
   (`active=false` checado em `verifyLogin`); agendamentos e histórico do barbeiro
   permanecem intactos.

## Error Flows

### Error Flow 1: Funcionário tenta rota dono-only
1. `requireOwnerSessionApi()` detecta `role !== "dono"` → 403 `{error: "acesso restrito ao
   dono da barbearia"}`. Página equivalente: `requireOwnerSessionPage()` redireciona para `/`.

### Error Flow 2: Funcionário tenta agir sobre agendamento de colega
1. Rota busca o agendamento normalmente (mesmo tenant); `isOwnAppointment` retorna `false` →
   resposta **404** "não encontrado" (mesmo formato do cross-tenant existente).

### Error Flow 3: Funcionário tenta criar agendamento para outro barbeiro
1. `assertWriteBarberId` recusa antes de chamar `bookAppointment` → 403, corpo identificando a
   restrição (distinto do 404 do Error Flow 2, porque aqui a ação nunca chegou a existir — não
   há "recurso" para tratar como inexistente).

### Error Flow 4: Sessão antiga sem `role` após o deploy
1. `parseSessionCookieValue` decodifica, não encontra `role` no payload, resolve como
   `{role: "dono", barberId: null}` — nenhum erro, nenhuma ação especial exigida do usuário.

## API / Contract Design — Matriz de Autorização

> **Documento de auditoria do `tasks.md`**: cada rota abaixo é uma tarefa própria. `Ambos` =
> `requireSessionApi()` (sem mudança de guarda). `Dono` = trocar para
> `requireOwnerSessionApi()`/`requireOwnerSessionPage()`. `Escopado` = aplicar
> `agenda-scope.ts` conforme a coluna "Padrão".

| Rota | Método(s) | Acesso | Padrão |
|---|---|---|---|
| `/api/services` | GET | Ambos | — |
| `/api/services`, `/:id` | POST/PATCH/DELETE | **Dono** | `requireOwnerSessionApi` |
| `/api/barbers` | GET | Ambos | — |
| `/api/barbers`, `/:id`, `/:id/services` | POST/PATCH/DELETE/PUT | **Dono** | `requireOwnerSessionApi` |
| `/api/barbers/:id/schedule` | GET | Ambos (funcionário lê a própria) | — |
| `/api/barbers/:id/schedule` | PUT | **Dono** | `requireOwnerSessionApi` |
| `/api/barbers/:id/exceptions`(`/:exId`) | GET/POST/DELETE | **Dono** | `requireOwnerSessionApi` |
| `/api/barbers/:id/login` (novo) | POST/PATCH/DELETE | **Dono** | `requireOwnerSessionApi` |
| `/api/agenda-settings` | GET/PATCH | **Dono** | `requireOwnerSessionApi` |
| `/api/settings` (inatividade) | GET/PATCH | **Dono** | `requireOwnerSessionApi` |
| `/api/loyalty-settings` (novo) | GET/PATCH | **Dono** | `requireOwnerSessionApi` |
| `/api/relatorios`, `/relatorios/pdf` | GET | **Dono** | `requireOwnerSessionApi` |
| `/api/availability` | GET | Ambos | `scopeReadBarberId` |
| `/api/agenda/occupancy` | GET | Ambos | `scopeReadBarberId` (funcionário nunca vê "todos") |
| `/api/appointments` | GET | Ambos | `scopeReadBarberId` |
| `/api/appointments` | POST | Ambos | `assertWriteBarberId` |
| `/api/appointments/:id` | GET/PATCH/DELETE | Ambos | `isOwnAppointment` → 404 se falso |
| `/api/appointments/:id/complete`, `/no-show` | POST | Ambos | `isOwnAppointment` → 404 se falso |
| `/api/dashboard` | GET | Ambos | payload reduzido p/ funcionário (Decision 5) |
| `/api/clients`, `/:id` | GET/POST/PATCH | Ambos | — (Premissa: CRM compartilhado) |
| `/api/clients/:id` | DELETE (LGPD) | **Dono** | `requireOwnerSessionApi` |
| `/api/clients/:id/visits` | GET/POST | Ambos | — |
| `/api/clients/:id/loyalty/redeem` (novo) | POST | Ambos | — |
| `/api/auth/login`, `/logout` | POST | Público/self | — |
| Página `/configuracoes/**` | — | **Dono** | `requireOwnerSessionPage` |
| Página `/relatorios` | — | **Dono** | `requireOwnerSessionPage` |
| Página `/`, `/agenda`, `/clientes/**` | — | Ambos | recorte por papel (Decision 5) |

## Data Model and Persistence

- **`crm_users` (modificada)**: +`role appuser_role NOT NULL DEFAULT 'dono'` (enum
  `'dono'|'funcionario'`), +`barber_id uuid NULL REFERENCES barbers(id)`, +`active boolean NOT
  NULL DEFAULT true`. Índice de exclusão parcial: `UNIQUE(barber_id) WHERE barber_id IS NOT
  NULL`.
- **`loyalty_settings`** (1:1 barbearia, padrão de `agenda_settings`): `barbershop_id uuid
  PK REFERENCES barbershops(id)`, `threshold_visits int NOT NULL DEFAULT 6`.
- **`loyalty_redemptions`**: `id uuid PK`, `barbershop_id uuid NOT NULL REFERENCES
  barbershops(id)`, `client_id uuid NOT NULL REFERENCES clients(id)`, `redeemed_at timestamptz
  NOT NULL DEFAULT now()`, `visit_id uuid NULL REFERENCES visits(id)` (vínculo opcional com o
  atendimento onde ocorreu). Índice `(barbershop_id, client_id, redeemed_at)`.
- **`clients` (modificada)**: +`loyalty_baseline_at timestamptz NOT NULL DEFAULT now()`
  (Decision 6 — cobre "começa do zero" sem backfill manual).

Migrações: puramente aditivas (nenhuma coluna existente alterada/removida); `drizzle-kit
generate` cobre schema + índices; a restrição de exclusão parcial em `crm_users.barber_id`
entra como SQL bruto anexado à migração (mesmo padrão da restrição de exclusão de
`appointments` na Fase 2).

## Authentication and Authorization

Esta change **é** a mudança de autenticação/autorização — ver Decisions 1-4 e a Matriz acima.
Resumo: sessão HMAC (`lib/session.ts`) continua a fonte da verdade de identidade; `role` e
`barberId` viajam nela (assinados, não confiáveis se alterados pelo cliente — a assinatura HMAC
já garante isso, nenhuma mudança de mecanismo). Nenhuma rota confia em `barberId`/`role`
vindos do corpo/query da requisição — sempre da sessão.

## Security and Privacy

- **LGPD**: exclusão de cliente restrita a dono (Decision da matriz); resgates de fidelização
  seguem a mesma regra de anonimização já existente para `visits`/`payments_log` (desvincular
  identidade, preservar agregado).
- **Senhas**: reusa `hashPassword`/`verifyPassword` já existentes (Fase 1) — nenhum mecanismo
  novo de hashing.
- **Logs**: nenhuma mudança na regra de mascaramento; login de funcionário não loga senha em
  nenhum ponto (mesmo cuidado já praticado).
- **Superfície nova**: esta é a primeira vez que o produto tem um usuário com acesso PARCIAL —
  todo teste de autorização (grupo dedicado no `tasks.md`) tenta a ação como funcionário e
  espera a recusa, não só testa o caminho feliz do dono.

## Observability

### Logs
- Login de funcionário: log de criação/redefinição/desativação com `tenant_id` +
  `barber_id`, sem senha nem hash.
- Tentativa de acesso negado (403/404 por escopo): log com `tenant_id`, `user_id`, rota — útil
  para detectar tentativa de escalonamento de privilégio ou bug de UI expondo ação indevida.

### Metrics
- Nenhuma métrica formal nesta fase (consistente com fases anteriores).

## Testing Strategy

- **Unit**: `agenda-scope.ts` (as três funções, puras) — funcionário vs. dono, barberId
  correspondente vs. divergente. Cálculo de fidelização (baseline, resgate, threshold).
- **Integration (Postgres real)**: `loyalty.ts` — contagem correta com/sem resgate anterior,
  baseline respeitada; `users.ts` — criar/redefinir/desativar login; unicidade de barbeiro↔login.
- **Isolamento de tenant**: extensão dos testes já existentes cobrindo também `crm_users`/
  `loyalty_*` (barbearia B não vê/edita login ou fidelização de A).
- **Autorização por papel (NOVO grupo, o mais importante desta change)**: para cada linha
  "Dono" da matriz, um teste HTTP real logado como funcionário esperando 403; para cada linha
  "Escopado", um teste criando agendamento de outro barbeiro e confirmando 404/403 conforme o
  caso. Sessão antiga (sem `role`) testada explicitamente lida como dono.
- **Manual/visual**: dashboard e agenda do funcionário conferidos (sem cartões financeiros;
  sem toggle "todos os barbeiros"); tela de gestão de login em Configurações.

## Migration Strategy

- **Schema**: `pnpm db:generate` + `pnpm db:migrate` aplicam tudo; puramente aditivo.
- **Backfill**: nenhum manual — `loyalty_baseline_at DEFAULT now()` cobre clientes existentes
  automaticamente (Decision 6); `crm_users.role DEFAULT 'dono'` cobre usuários existentes.
- **Compatibilidade**: sessões antigas continuam válidas (Decision 2); nenhuma rota existente
  muda de contrato para o papel dono (o comportamento dele é idêntico a hoje).

## Rollback Plan

- Reversível: remover as rotas/telas novas, reverter os `requireSessionApi` trocados de volta
  (git revert do código é suficiente, sem dependência de dado); `DROP` das tabelas/colunas
  novas não afeta `visits`/`payments_log`/`appointments` (nenhuma FK obrigatória nova aponta
  para dentro dessas tabelas).

## Compatibility

- Nenhuma quebra de contrato para o papel dono — toda rota existente se comporta
  identicamente para quem já usa o sistema hoje. A única mudança de comportamento observável
  é a existência do papel funcionário (aditivo).

## Remaining Risks

| Risk | Impact | Mitigation | Owner/Decision |
|---|---|---|---|
| Rota esquecida no retrofit (não aparece na matriz por engano futuro, ex.: nova rota adicionada depois sem seguir o padrão) | Alto | Matriz documentada em spec permanente (`auth-tenancy`); checklist do avaliador (etapa 10) deve incluir "toda rota nova classifica seu acesso" a partir desta change | Dev (processo) |
| Funcionário conseguir inferir dados de colegas via mensagens de erro diferentes (404 vs 403 vazando informação) | Baixo | Padrão único documentado (Decision 4) evita diferenciação acidental de resposta | Dev |
| Volume de rotas a retrofitar (25+) tornar a implementação longa/arriscada | Médio | `tasks.md` quebra em grupos pequenos por rota, cada um com evidência HTTP real antes do próximo | Dev |

## Open Questions

- Quando `auth-tenancy` precisar de um terceiro papel (ex.: acesso de suporte da Blade), o
  enum vira tabela — não bloqueia esta fase, documentado como evolução esperada.
