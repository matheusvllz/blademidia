# Design: Agenda Integrada (Produto — Fase 2)

## Context

A Fase 1 entregou o monorepo pnpm com `apps/web` (Next.js 15, App Router) e `packages/db`
(Drizzle + Postgres 16), repositórios com `barbershopId` obrigatório (ADR-0007), auth por
cookie HMAC assinado via Web Crypto (Edge-compatible) e o design system Blade em tokens
Tailwind + classes CSS (`card-blade`, `btn-gold`, `input-blade`, `label-blade`,
`badge-ativo/inativo`). O comentário em `packages/db/src/schema/visits.ts` já reserva as FKs
de serviço/barbeiro para esta fase. Este design estende essa base; **não refunda nada**.

## Goals and Constraints

### Goals
- Motor de disponibilidade correto (grade por barbeiro, exceções, sem sobreposição, fuso da
  barbearia), isolado e testável antes de qualquer tela.
- Camada de domínio única (`AgendaService`) consumida por painel, worker e (futuro) bot —
  a "estrutura pronta para o bot".
- Ciclo de vida do agendamento unificado ao CRM (conclusão → visita+pagamento).
- Worker assíncrono + pg-boss no ar, com um job real (no-show) e esqueletos honestos.

### Constraints
- **D4** (infra ≤ R$150-200/mês): worker + pg-boss no mesmo Postgres/VPS; sem Redis; sem
  serviço pago novo; `packages/ai` sem chamada em runtime (custo externo zero nesta fase).
- **D5 / ADR-0007**: `barbershop_id` em toda tabela e consulta; escopo forçado no repositório.
- **D2 / ADR-0004**: nenhum código fora de `packages/whatsapp` fala com WhatsApp; nesta fase
  nenhum provedor é chamado.
- **LGPD**: agendamento vincula dado pessoal; exclusão de cliente abrange agendamento futuro;
  logs sem telefone completo/conteúdo.
- **Design system Blade** reaproveitado (mesmos tokens/fontes/classes da Fase 1).
- **Time de 1 dev + IA**: simplicidade operacional > sofisticação; domínio antes de UI.

## Proposed Architecture

Evolução da estrutura de repositório rumo ao alvo de `docs/architecture/overview.md`:

```text
blademidia/
  apps/
    web/            # Next.js: painel + API interna (existe; ganha telas e rotas)
    worker/         # NOVO: processo Node + pg-boss (jobs)
  packages/
    core/           # NOVO: domínio — AgendaService, regras, tipos, contrato de tools
    db/             # existe; +7 tabelas, +FKs em visits, +repositórios tenant-scoped
    ai/             # NOVO (esqueleto): cliente Claude + definições de tools (sem canal)
  docker-compose.yml  # +serviço worker
```

Fluxo de dependências (sem ciclos):

```text
apps/web  ─┐
apps/worker├─▶ packages/core ─▶ packages/db ─▶ Postgres (+ pg-boss schema)
packages/ai┘        ▲
                    └── contrato de tools (schemas) que o bot da Fase 5 conecta a Claude
```

- **`packages/core`** concentra a lógica de negócio da agenda. Não importa Next nem pg-boss;
  recebe `barbershopId` explícito. É o único caminho de escrita de agendamento — painel,
  worker e bot passam por aqui (ADR-0008).
- **`apps/web`** vira uma casca fina: rotas de API validam entrada (Zod), resolvem a sessão
  (tenant) e delegam ao `AgendaService`. Telas são Server Components + client components para
  interação, no padrão da Fase 1.
- **`apps/worker`** roda pg-boss no mesmo Postgres (ADR-0003/0009). Jobs chamam
  `packages/core`. Nenhuma lógica de negócio duplicada.
- **`packages/ai`** existe como esqueleto: expõe as definições de *tools* (schemas JSON) que
  mapeiam 1:1 para métodos do `AgendaService` e um wrapper do cliente Claude (ADR-0005). Nada
  é executado em runtime nesta fase — é o contrato, testável isoladamente.

## Technical Decisions

### Decision 1: Camada de domínio `packages/core` como fronteira única (→ ADR-0008)
- Decision: criar `packages/core` com `AgendaService` (métodos: `getAvailability`,
  `bookAppointment`, `rescheduleAppointment`, `cancelAppointment`, `confirmAppointment`,
  `completeAppointment`, `markNoShow`). Todo caminho de escrita/consulta de agenda passa por
  ele; `apps/web`, `apps/worker` e (futuro) `packages/ai` são adaptadores finos.
- Rationale: "estrutura pronta para o bot" (Q2) só é real se painel e bot compartilharem a
  MESMA lógica — senão a IA reimplementa regras e diverge. Também evita duplicação entre web e
  worker.
- Trade-offs: um pacote a mais no monorepo; disciplina de não colocar regra em `apps/*`.
- Consequences: promovido a ADR-0008 (transversal). A partir daqui, novas capabilities do
  produto colocam domínio em `packages/core`.

### Decision 2: Worker + pg-boss ativados nesta fase (→ ADR-0009)
- Decision: criar `apps/worker` rodando pg-boss no mesmo Postgres. Job real de Fase 2:
  `agenda.no-show-sweep` (agendado a cada N min). Esqueletos registrados mas **sem envio**:
  `agenda.send-confirmation` e `crm.reactivation-sweep` — executam a lógica de seleção e
  **registram (log) o que enviariam**, deixando o ponto de envio para `whatsapp-canal`
  (Fase 5).
- Rationale: Q4. Deixa a plumbing assíncrona pronta e provada de ponta a ponta com um job
  útil de verdade, sem depender do provedor WhatsApp ainda indefinido (D2).
- Trade-offs: mais um processo para operar; risco de "código morto" nos esqueletos — mitigado
  mantendo-os mínimos e cobertos por teste da parte de seleção.
- Consequences: ADR-0009; `docker-compose.yml` (local) e `infra/stack` ganham o serviço
  `worker`; `.env` ganha `TZ`, `NO_SHOW_SWEEP_INTERVAL_MIN`.

### Decision 3: Preço de tabela ≠ valor pago
- Decision: `services.price_cents` é preço de catálogo (referência ao agendar/exibir); o valor
  efetivamente pago continua em `payments_log.amount_cents` por visita (Fase 1).
- Rationale: desconto, gorjeta e "cortesia" fazem os dois divergirem; misturá-los corromperia
  o ticket médio e o futuro relatório. Financeiro segue sendo registro, nunca gateway.
- Trade-offs: dois campos de dinheiro com significados distintos — documentado na UI.

### Decision 4: Fuso horário fixo America/Sao_Paulo, `timestamptz` no banco
- Decision: armazenar todos os instantes como `timestamptz` (UTC no disco); calcular
  disponibilidade e exibir no fuso `America/Sao_Paulo`. Grade/expediente são horários locais
  (`time`), convertidos para instantes no fuso da barbearia ao gerar slots.
- Rationale: o motor da automação já opera em hora local (`getHours`); o produto precisa ser
  consistente. Fase 1 do negócio é Brasília/DF (BRT), sem horário de verão vigente, mas a
  conversão via timezone nomeado protege de mudanças.
- Trade-offs: cuidado em toda borda de cálculo/exibição; coberto por testes de fuso. Fuso por
  barbearia é evolução futura (coluna já pode nascer em `barbershops` como `timezone` default
  `America/Sao_Paulo`).

### Decision 5: Ausência de double booking garantida no banco
- Decision: além da checagem no repositório, uma **restrição de exclusão** no Postgres impede
  dois agendamentos ativos sobrepostos do mesmo barbeiro:
  `EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('agendado','confirmado'))`,
  exigindo a extensão `btree_gist`. Criada via SQL bruto na migração (Drizzle gera o resto).
- Rationale: a checagem em aplicação tem janela de corrida (Scenario "conflito por
  concorrência"); a restrição fecha isso no nível certo. O repositório traduz a violação
  (código 23P01) em erro de conflito de domínio.
- Trade-offs: dependência de extensão Postgres (disponível na imagem oficial); índice de
  exclusão parcial só cobre estados ativos (cancelado/faltou/concluído não bloqueiam reuso do
  horário — desejado).

### Decision 6: Conclusão idempotente via vínculo `appointment.visit_id`
- Decision: `completeAppointment` roda numa transação: cria a `visit` (+`payments_log` se
  houver valor), grava `visit_id` no agendamento e muda status para "concluído". Se já houver
  `visit_id`, é no-op (idempotente).
- Rationale: Scenario "conclusão idempotente"; evita visita duplicada por duplo clique/retry.
- Trade-offs: transação obrigatória (o driver `pg` + Drizzle suportam).

## Alternatives Considered

### Alternative 1: Lógica de agenda dentro de `apps/web/lib` (sem `packages/core`)
- Description: manter tudo no app web, como a Fase 1 fez com auth.
- Why not chosen: o worker (Q4) precisa da MESMA lógica sem importar o app Next; e o bot
  (Q2) idem. Sem pacote compartilhado, haveria duplicação e divergência de regra.

### Alternative 2: Disponibilidade materializada (tabela de slots pré-gerados)
- Description: gerar e persistir os slots livres.
- Why not chosen: volume pequeno por barbearia torna o cálculo sob demanda barato; slots
  materializados adicionam invalidação/consistência sem ganho na Fase 2. Reavaliar se houver
  auto-agendamento público (Fase 5) com alta concorrência de leitura.

### Alternative 3: Cron do sistema operacional em vez de pg-boss
- Description: usar cron do VPS para a varredura de no-show.
- Why not chosen: ADR-0003 já escolheu pg-boss (agendamento no Postgres, sem Redis);
  centraliza jobs, dá retry/observabilidade e é o mesmo mecanismo que a Fase 5 usará para
  confirmação/reativação. Cron seria um segundo mecanismo a manter.

## Affected Components

| Component | Change | Reason |
|---|---|---|
| `packages/core` (novo) | Cria `AgendaService`, tipos de domínio, motor de disponibilidade, contrato de tools | Fronteira única (Decision 1) |
| `packages/db/schema/*` | +`barbers`, `services`, `barber_services`, `work_schedules`, `schedule_exceptions`, `appointments`, `agenda_settings`; +FKs em `visits`; +`barbershops.timezone` | Modelo de dados da agenda |
| `packages/db/repositories/*` | +repositórios tenant-scoped para cada tabela nova; ajuste em `visits`/`dashboard` | ADR-0007 |
| `packages/db/migrations` | Migração das tabelas + SQL bruto (`btree_gist`, restrição de exclusão) | Decision 5 |
| `apps/worker` (novo) | Processo pg-boss; job `no-show-sweep`; esqueletos de confirmação/reativação | Decision 2 |
| `packages/ai` (novo, esqueleto) | Wrapper Claude + definições de tools mapeando `AgendaService` | Contrato do bot (Q2) |
| `apps/web/app/api/*` | +rotas: barbers, services, schedules, exceptions, availability, appointments, agenda-settings; ajuste em dashboard | API interna |
| `apps/web/app/*` (telas) | +`/agenda`, telas de configuração (serviços, barbeiros, regras); ajustes em `/`, `/clientes/[id]` | Painel |
| `apps/web/components/*` | +componentes da agenda e de configuração | UI |
| `apps/web/components/nav-bar.tsx` | +item "Agenda" | Navegação |
| `docker-compose.yml`, `infra/stack/*` | +serviço `worker` | Operação |
| `.env.example` | +`TZ`, `ANTHROPIC_API_KEY` (não usada em runtime), `AI_MODEL`, `NO_SHOW_SWEEP_INTERVAL_MIN` | Config |
| `docs/architecture/decisions/` | +ADR-0008, +ADR-0009 | Decisões transversais |

## Main Flows

### Flow 1: Configurar a agenda (onboarding do módulo)
1. Barbeiro-dono cadastra serviços (nome, duração, preço de tabela).
2. Cadastra barbeiros e, para cada um, a grade semanal (uma ou mais janelas por dia) e, se
   quiser, quais serviços faz.
3. Ajusta as regras da agenda (passo, antecedência, no-show, confirmação) ou aceita padrões.
4. (Opcional) No onboarding, importa serviços/barbeiros/horário do preset da automação da
   barbearia — idempotente, no padrão do import de clientes da Fase 1.

### Flow 2: Criar agendamento pelo painel
1. Barbeiro escolhe cliente (busca ou cadastra inline, reusando `/api/clients`), serviço e
   barbeiro (ou "qualquer barbeiro") e a data.
2. `GET /api/availability` → `AgendaService.getAvailability` devolve os horários livres.
3. Barbeiro escolhe um horário e confirma → `POST /api/appointments` →
   `AgendaService.bookAppointment` (source `painel`).
4. Agendamento aparece na agenda do dia e como próximo agendamento no perfil do cliente.

### Flow 3: Cliente comparece → conclusão vira atendimento
1. Barbeiro abre o agendamento e clica "Concluir".
2. Informa (opcional) o valor pago e a forma.
3. `POST /api/appointments/:id/complete` → `AgendaService.completeAppointment` (transação):
   cria `visit` (+`payments_log`), grava `visit_id`, status → "concluído".
4. O atendimento entra no histórico do cliente e conta para ticket médio (regras da Fase 1).
5. UI oferece "rebooking": agendar o próximo horário do mesmo cliente (prática de mercado).

### Flow 4: Remarcar / cancelar
1. Barbeiro abre o agendamento e escolhe remarcar (novo horário validado como criação) ou
   cancelar (libera o horário; status → "cancelado").

### Flow 5: Preparação do bot (não executado na Fase 2)
1. `packages/ai` expõe as tools `consultar_disponibilidade`, `criar_agendamento`,
   `remarcar_agendamento`, `cancelar_agendamento` — schemas + handlers que chamam
   `AgendaService` com `source='bot'`.
2. Na Fase 5, o loop de conversa (Claude tool-use, sobre `whatsapp-canal`) conecta essas
   tools; nada aqui muda no domínio.

## Error Flows

### Error Flow 1: Conflito de horário
1. `bookAppointment` valida grade/passado/escopo; tenta inserir.
2. Se a restrição de exclusão dispara (23P01), o repositório devolve `conflict`; a API responde
   409; a UI mostra "esse horário acabou de ser ocupado" e recarrega a disponibilidade.

### Error Flow 2: Referência cruzada de tenant
1. Cliente/serviço/barbeiro de outra barbearia → repositório retorna vazio no escopo do tenant
   → domínio devolve `not_found` → API 404, sem vazar existência.

### Error Flow 3: Transição de estado inválida
1. Concluir/cancelar um agendamento já concluído → domínio devolve `invalid_transition` →
   API 409 → UI explica o estado atual.

### Error Flow 4: Worker indisponível / job repetido
1. Se o worker cair, a varredura de no-show apenas atrasa (não perde dado). Ao voltar, o job é
   idempotente (só afeta estados ativos vencidos).

## API / Contract Design

Todas as rotas em `apps/web/app/api`, session-guarded (`requireSessionApi`), entrada validada
com Zod, delegando ao `packages/core`/repositórios com `barbershopId` da sessão.

| Método & rota | Ação |
|---|---|
| `GET/POST /api/services` · `GET/PATCH/DELETE /api/services/:id` | CRUD de serviços |
| `GET/POST /api/barbers` · `GET/PATCH/DELETE /api/barbers/:id` | CRUD de barbeiros |
| `PUT /api/barbers/:id/services` | Define serviços do barbeiro |
| `GET/PUT /api/barbers/:id/schedule` | Grade semanal do barbeiro |
| `GET/POST /api/barbers/:id/exceptions` · `DELETE /api/barbers/:id/exceptions/:exId` | Folgas/bloqueios |
| `GET /api/availability?date=&serviceId=&barberId=` | Horários livres (barberId opcional) |
| `GET /api/appointments?from=&to=&barberId=` | Agenda por período |
| `POST /api/appointments` | Cria agendamento |
| `GET/PATCH/DELETE /api/appointments/:id` | Detalhe / remarcar+confirmar / cancelar |
| `POST /api/appointments/:id/complete` | Conclui → visita+pagamento |
| `POST /api/appointments/:id/no-show` | Marca falta manual |
| `GET/PATCH /api/agenda-settings` | Regras da agenda |
| `GET /api/dashboard` (ajuste) | +agenda de hoje / faltas recentes |

Respostas de erro padronizadas: 400 (validação), 401 (sem sessão), 404 (fora do tenant /
inexistente), 409 (conflito de horário / transição inválida).

**Contrato de tools do bot** (em `packages/core`, exportado a `packages/ai` — especificação,
não execução): cada tool tem nome, descrição em PT-BR, `input_schema` (Zod → JSON Schema) e um
handler que chama o método correspondente do `AgendaService`. Mapeamento:
`consultar_disponibilidade`→`getAvailability`, `criar_agendamento`→`bookAppointment`,
`remarcar_agendamento`→`rescheduleAppointment`, `cancelar_agendamento`→`cancelAppointment`.

## Data Model and Persistence

Todas as tabelas têm `barbershop_id uuid NOT NULL REFERENCES barbershops(id)` e são acessadas
só por repositório tenant-scoped (ADR-0007). Convenção de weekday: inteiro 0–6, 0=domingo
(igual a `Date.getDay()` e às chaves do preset da automação).

- **`services`**: `id`, `barbershop_id`, `name`, `duration_min int NOT NULL` (>0),
  `price_cents int NULL`, `active bool NOT NULL DEFAULT true`, `created_at`, `deleted_at NULL`.
- **`barbers`**: `id`, `barbershop_id`, `name`, `active bool DEFAULT true`, `color text NULL`
  (identificação visual na grade), `created_at`, `deleted_at NULL`.
- **`barber_services`** (N:N): `barbershop_id`, `barber_id`, `service_id`, PK
  `(barber_id, service_id)`. Ausência de linhas para um barbeiro = faz todos os serviços
  ativos (Scenario da spec).
- **`work_schedules`** (grade semanal recorrente): `id`, `barbershop_id`, `barber_id`,
  `weekday int (0–6)`, `start_time time NOT NULL`, `end_time time NOT NULL`. Várias linhas por
  barbeiro/dia modelam intervalos (ex.: 09–12 e 13–19). Índice `(barbershop_id, barber_id, weekday)`.
- **`schedule_exceptions`**: `id`, `barbershop_id`, `barber_id uuid NULL` (NULL = toda a
  barbearia, ex. feriado), `date date NOT NULL`, `kind enum('folga','bloqueio','extra')`,
  `start_time time NULL`, `end_time time NULL` (obrigatórios em bloqueio/extra), `reason text NULL`.
- **`appointments`**: `id`, `barbershop_id`, `client_id → clients`, `barber_id → barbers`,
  `service_id → services`, `starts_at timestamptz NOT NULL`, `ends_at timestamptz NOT NULL`,
  `status enum('agendado','confirmado','concluido','cancelado','faltou') DEFAULT 'agendado'`,
  `source enum('painel','bot','importacao') DEFAULT 'painel'`, `notes text NULL`,
  `visit_id uuid NULL → visits`, `created_at`, `canceled_at timestamptz NULL`,
  `cancel_reason text NULL`.
  - Índices: `(barbershop_id, barber_id, starts_at)`, `(barbershop_id, client_id)`,
    `(barbershop_id, status, starts_at)`.
  - Restrição de exclusão (Decision 5) para impedir sobreposição de ativos por barbeiro.
- **`agenda_settings`** (1:1 com barbearia, como `crm_settings`): `barbershop_id PK`,
  `slot_step_min int DEFAULT 30`, `min_advance_min int DEFAULT 0`,
  `no_show_after_min int DEFAULT 30`, `confirmation_lead_hours int DEFAULT 24`.
- **`visits` (modificada)**: +`service_id uuid NULL → services`, +`barber_id uuid NULL → barbers`.
  Mantém `service_label`/`staff_label` para compatibilidade com atendimentos antigos.
- **`barbershops` (modificada)**: +`timezone text NOT NULL DEFAULT 'America/Sao_Paulo'`.

Migrações: geradas por `drizzle-kit` para as tabelas/colunas; a extensão `btree_gist` e a
restrição de exclusão entram por SQL bruto anexado à migração (documentado). `pg-boss` cria seu
próprio schema no primeiro boot do worker (não versionado pelo Drizzle).

## Authentication and Authorization

- Reusa a auth da Fase 1: cookie HMAC (`lib/session.ts`), `requireSessionApi`/
  `requireSessionPage`. Papel único "dono"; barbeiro é recurso, não usuário (Q1).
- Toda rota nova resolve `barbershopId` da sessão e o repassa ao domínio; nenhum ID de tenant
  vem do corpo da requisição.
- O worker roda com um contexto de sistema, mas **toda** operação de domínio ainda exige
  `barbershopId` explícito (varre por tenant); não há caminho "sem tenant".

## Security and Privacy

- **LGPD**: `appointments` referencia `clients` (dado pessoal). `deleteClient` (Fase 1) passa a
  cancelar/anonimizar agendamentos futuros do cliente (delta de `crm-clientes`). Agregados
  preservados.
- **Logs** (worker e API): estruturados, com `tenant_id` e correlação; **nunca** telefone
  completo, conteúdo de mensagem ou segredo. Reusa a regra de mascaramento do repo.
- **Segredos** só por env; `ANTHROPIC_API_KEY` entra no `.env.example` mas não é usada em
  runtime nesta fase (documentado).

## Observability

### Logs
- API: linha por operação de agenda com `tenant_id`, ação, resultado (ok/erro), sem PII.
- Worker: início/fim de cada job, nº de agendamentos afetados na varredura, duração.

### Metrics
- Contadores simples via log (agendamentos criados, concluídos, faltas marcadas). Métrica
  formal (Prometheus) fica para a fase de operação; não é requisito aqui.

### Alerts
- Fora de escopo formal; o worker loga erro de job. Uptime do worker via o mesmo Uptime Kuma
  previsto no overview (operacional, não código desta change).

## Testing Strategy

- **Unit (o coração)**: `AgendaService.getAvailability` — grade simples, intervalos/almoço,
  folga/bloqueio/extra, borda de fim de expediente, passo 15/30, "qualquer barbeiro" (união),
  fuso America/Sao_Paulo. Transições de estado (válidas e inválidas). Conclusão idempotente.
- **Integração (contra Postgres real, padrão da Fase 1)**: repositórios; restrição de exclusão
  bloqueando sobreposição; conclusão em transação criando visita+pagamento; varredura de
  no-show idempotente.
- **Isolamento de tenant**: um teste por tabela nova provando que barbearia A não lê/altera
  dado de B (DoD do ADR-0007), no molde de `clients.isolation.test.ts`.
- **Contrato**: rotas de API (status codes 400/401/404/409, formato de erro).
- **E2E (Playwright, padrão da Fase 1)**: configurar serviço+barbeiro+grade → criar
  agendamento em horário livre → tentar sobrepor (recusa) → concluir → ver atendimento no
  perfil e ticket médio atualizado.
- **Worker**: teste do job de no-show marcando só os vencidos ativos; esqueletos de
  confirmação/reativação testados na parte de seleção (quem entraria), sem envio.
- **Manual/visual**: screenshots das telas novas conferindo tokens Blade e ausência de
  "CRM"/"booking"/"slot".

## Migration Strategy

- **Schema**: `pnpm db:generate` + `pnpm db:migrate` aplicam as tabelas/colunas; o SQL bruto de
  `btree_gist`/exclusão acompanha a migração. `visits` ganha colunas nullable — sem reescrever
  histórico (retrofit não forçado).
- **Backfill**: nenhum obrigatório. Import **opcional** e **idempotente** de
  serviços/barbeiros/horário do preset da automação da barbearia no onboarding (script irmão
  do `migrate-automation-data.ts`), com dry-run e relatório de divergências.
- **Compatibilidade**: atendimentos da Fase 1 continuam válidos (FKs nulas). Dashboard e perfil
  tratam ausência de agenda (estado vazio).

## Rollback Plan

- Reversível: como não há backfill destrutivo, reverter = remover o serviço `worker` do compose
  e (se necessário) `DROP` das tabelas novas + colunas adicionadas (migração de baixada). Dados
  da Fase 1 intactos. pg-boss schema pode ser dropado sem afetar o CRM.

## Compatibility

- Nenhuma quebra de contrato da Fase 1: rotas e telas existentes seguem funcionando; as
  mudanças em dashboard/perfil são aditivas (novas seções com estado vazio).
- `.npmrc` `node-linker=hoisted` (aprendizado da Fase 1) permanece — necessário ao Next e agora
  também ao worker importar `packages/core`.

## Remaining Risks

| Risk | Impact | Mitigation | Owner/Decision |
|---|---|---|---|
| Bug no motor de disponibilidade (fuso/intervalo) | Alto | Testes de unidade exaustivos antes da UI; domínio isolado | Dev |
| Restrição de exclusão exige `btree_gist` na imagem Postgres | Médio | Imagem oficial `postgres:16` inclui; migração cria a extensão; validar no `docker compose up` | Dev |
| Esqueletos de job viram código morto | Baixo | Mínimos, cobertos por teste de seleção; removíveis se a Fase 5 mudar de rumo | Dev |
| Antecedência mínima / política de cancelamento imprecisas | Baixo | Configuráveis com padrão; refinar com uso real | Vítor (pós-uso) |

## Open Questions

- Confirmar padrões numéricos das regras da agenda (passo 30, no-show 30 min, confirmação 24h)
  antes do primeiro cliente — não bloqueia implementação (valores default).
- Definir se `barbershops.timezone` será exposto na UI nesta fase ou só na fase multi-praça
  (assumido: não exposto agora, default BRT).
