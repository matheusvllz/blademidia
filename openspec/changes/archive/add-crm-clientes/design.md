# Design: CRM de Clientes — Núcleo (Fase 1)

## Context
Ver [exploration.md](exploration.md) e [proposal.md](proposal.md). Este design cobre a
Fase 1 (núcleo) e a "Fase 0 técnica" que a viabiliza — hoje **nada disso existe**: sem
`apps/web`, sem `packages/db`, sem banco. Este é o primeiro código de produto do
repositório. `automation/` e `site/` não são tocados por esta change.

## Goals and Constraints
### Goals
- Barbeiro gerencia clientes, histórico e financeiro num painel funcional, com a
  identidade visual da Blade Mídia.
- Base de dados pronta para as automações futuras (confirmação, reativação, IA, WhatsApp)
  sem construí-las agora.

### Constraints
- Orçamento D4 (≤R$150-200/mês) — esta change não adiciona serviço pago novo.
- Multi-tenancy (D5/ADR-0007) — `barbershop_id` obrigatório em toda tabela nova.
- LGPD — dado pessoal de cliente final.
- Nenhum código existente (`automation/`, `site/`) é alterado ou depende desta change.
- Vocabulário do produto: nunca "CRM", "lead", "funil", "conversão", "churn" na UI.

## Proposed Architecture
```text
Barbeiro-dono ──▶ Caddy (TLS, produção) ──▶ apps/web (Next.js, App Router)
                                              │  ├─ /clientes            (lista + cadastro)
                                              │  ├─ /clientes/[id]       (perfil + histórico)
                                              │  ├─ /                    (dashboard)
                                              │  ├─ /configuracoes       (regra de inatividade)
                                              │  └─ auth mínima (login dono, cookie de sessão)
                                              ▼
                                       packages/db (Drizzle)
                                              ▼
                                       PostgreSQL 16 (mesmo Postgres já orçado na
                                       arquitetura geral — nenhum serviço novo)

Migração (script único, roda no onboarding):
  automation/data/db.json ──▶ script de import ──▶ packages/db (clients/visits/payments_log)
  (leitura; automation/ não é modificado nem passa a depender do produto)
```

Este é o subconjunto de `init-project-skeleton` necessário para o CRM existir — não o
skeleton inteiro. `packages/whatsapp`, `packages/ai` e `apps/worker` **não fazem parte**
desta change (ver "Dependências entre módulos").

## Technical Decisions

### Decision 1: Escopo mínimo de skeleton, não o skeleton completo
- Decision: implementar apenas o subconjunto de `init-project-skeleton` que o CRM precisa:
  workspace pnpm + lint (tasks 1.1/1.2), `packages/db` com Drizzle (tasks 2.1/2.2),
  `apps/web` básico (task 4.1), Docker Compose local só com Postgres (recorte da 6.1).
- Rationale: o pedido prioriza o CRM; a maior parte do skeleton completo
  (`packages/whatsapp`, `packages/ai`, `apps/worker`, CI, observabilidade) não tem
  consumidor até `whatsapp-canal`/`atendimento-ia` existirem — construir agora seria
  trabalho sem uso imediato.
- Trade-offs: quando `whatsapp-canal`/`atendimento-ia` chegarem, completam o restante do
  skeleton original — não há retrabalho, só complemento.
- Consequences: `openspec/changes/init-project-skeleton/tasks.md` fica parcialmente
  coberto por esta change; ao concluir, marcar as tasks 1.1, 1.2, 2.1, 2.2 e 4.1 lá como
  `[x]` referenciando esta change, e deixar 3.x/5.x/6.x/7.x para quando entrarem em uso.

### Decision 2: Auth mínima própria, não `auth-tenancy` completa
- Decision: login único por barbearia (usuário = o dono, senha ou magic link), cookie de
  sessão, sem sistema de papéis/permissões granular.
- Rationale: `auth-tenancy` como capability completa (múltiplos papéis, convite de
  funcionário) não tem consumidor nesta fase (papel único confirmado no proposal).
  Especificá-la inteira agora seria antecipar requisito não confirmado.
- Trade-offs: quando `auth-tenancy` for especificada de verdade (papel de funcionário,
  acesso do operador Blade), esta auth mínima se estende, não se reescreve — mesma tabela
  de usuário, mais papéis.
- Consequences: a tabela `crm_users` desta change nasce simples (um usuário por
  barbearia) e ganha coluna de papel quando a capability completa chegar.

### Decision 3: Financeiro como registro, arquitetado para nunca virar processamento
- Decision: tabela `payments_log` guarda valor, forma de pagamento (texto livre ou enum
  simples: dinheiro/cartão/pix/outro) e data — sem `provider_customer_id`, sem token de
  cartão, sem qualquer campo que pressuponha gateway.
- Rationale: confirmado por Vítor — é registro do que já aconteceu fora do sistema, nunca
  processamento. Modelar sem campos de gateway evita a tentação de "só adicionar
  integração depois" sem decisão explícita (que mudaria um non-goal do `project.md`).
- Trade-offs: se um dia o produto decidir processar pagamento, será uma nova capability
  (`billing`, já listada como "futura, fora da v1" em `openspec/specs/README.md`) com seu
  próprio design — não uma extensão silenciosa desta tabela.
- Consequences: o dashboard e o relatório mensal (Fase 3) leem `payments_log` como fonte
  de "R$ recuperado"/ticket médio, mas o sistema nunca fica no caminho crítico de uma
  cobrança real.

### Decision 4: Migração de `automation/data/db.json` como script único, não sincronização
- Decision: script de import roda uma vez por tenant, no onboarding do produto; lê o JSON,
  valida cada registro, grava no Postgres via `packages/db`, produz relatório de
  divergências (registros pulados e por quê). Não há sincronização contínua entre os dois
  sistemas depois disso.
- Rationale: confirmado por Vítor (migração prevista desde já). Sincronização contínua
  criaria acoplamento permanente entre o tooling operacional (JSON, sem schema) e o
  produto (Postgres, com schema) — complexidade sem benefício, já que a barbearia migrada
  passa a operar 100% no produto.
- Trade-offs: se a agência continuar cadastrando clientes no `automation/panel` depois de
  um tenant já ter migrado para o produto, os dois dados divergem. Mitigação: o runbook de
  onboarding (Fase 1, tasks) documenta que a migração é o ponto de corte — depois dela, o
  produto é a fonte de verdade daquele tenant.
- Consequences: idempotência é obrigatória (rodar duas vezes não duplica) — coberta na
  spec (`crm-clientes`, requisito "Migração de dados da operação da agência").

## Alternatives Considered
### Alternative 1: Especificar `auth-tenancy` e `init-project-skeleton` completos antes do CRM
- Description: seguir a ordem exata já registrada no CLAUDE.md, sem recorte.
- Why not chosen: Vítor pediu para entender e priorizar o CRM; boa parte do skeleton
  completo (WhatsApp, IA, worker) não tem uso nesta fase — atrasaria o CRM sem ganho.

### Alternative 2: Sincronizar `automation/data/db.json` continuamente com o produto
- Description: manter os dois sistemas em sync permanente após o onboarding.
- Why not chosen: acoplamento permanente entre um JSON sem schema e um Postgres com
  schema, para um benefício que não existe depois que o tenant migra de vez — descartada.

## Affected Components
| Component | Change | Reason |
|---|---|---|
| `apps/web` | Novo | Painel do produto — dashboard, clientes, configurações |
| `packages/db` | Novo | Schema Drizzle: `clients`, `visits`, `payments_log`, `crm_settings`, `crm_users` |
| Script de migração (`packages/db` ou `scripts/`) | Novo | Import único de `automation/data/db.json` |
| `automation/`, `site/` | Nenhuma | Fora do escopo; não tocados |

## Main Flows
### Flow 1: Cadastro de cliente
1. Barbeiro autenticado abre `/clientes` → "Novo cliente".
2. Preenche nome e telefone (mínimo obrigatório); observações opcionais.
3. Sistema valida telefone único na barbearia; grava com `barbershop_id`.
4. Cliente aparece na lista, estado "sem atendimento ainda".

### Flow 2: Registrar atendimento + valor
1. Barbeiro abre o perfil do cliente → "Registrar atendimento".
2. Informa serviço (texto livre nesta fase, sem catálogo — catálogo vem com `agendamento`),
   data (padrão hoje) e valor pago (opcional).
3. Sistema grava em `visits`; se valor informado, grava também em `payments_log`.
4. Dashboard e "última visita" do cliente atualizam.

### Flow 3: Onboarding de tenant com migração
1. Vítor cria a barbearia no `painel-agencia` (sistema existente, não alterado).
2. Vítor (ou script assistido) roda a migração apontando para o `automation/data/db.json`
   e o `barbershop_id` recém-criado.
3. Script valida, importa, gera relatório de divergências.
4. Barbeiro-dono recebe acesso ao produto com os clientes já lá.

## Error Flows
### Error Flow 1: Telefone duplicado no cadastro
1. Sistema recusa a criação, retorna o cliente existente para o barbeiro decidir (editar o
   existente em vez de duplicar).

### Error Flow 2: Migração encontra registro malformado
1. Script pula o registro, adiciona ao relatório de divergências com o motivo.
2. Migração continua para os demais registros — não interrompe por um registro ruim.

### Error Flow 3: Exclusão de cliente com histórico financeiro
1. Barbeiro pede exclusão (LGPD).
2. Sistema remove nome/telefone identificáveis; mantém `visits`/`payments_log` com
   referência anonimizada (sem nome/telefone), preservando totais de relatório já fechados.

## API / Contract Design
Rotas internas do `apps/web` (Next.js Route Handlers), sem contrato externo nesta fase:
- `GET/POST /api/clients` — listar/criar cliente (escopado por sessão → `barbershop_id`).
- `GET/PATCH/DELETE /api/clients/:id` — ler/editar/excluir cliente.
- `POST /api/clients/:id/visits` — registrar atendimento (+ valor opcional).
- `GET /api/dashboard` — indicadores agregados.
- `GET/PATCH /api/settings` — ler/alterar `crm_settings` (limite de inatividade).

## Data Model and Persistence
Todas as tabelas com `barbershop_id NOT NULL` (ADR-0007):

- `clients(id, barbershop_id, name, phone, notes, created_at, deleted_at)` — `deleted_at`
  suporta a exclusão/anonimização (nome/phone nulos após exclusão, `id` preservado).
- `visits(id, barbershop_id, client_id, service_label, staff_label, occurred_at, created_at)`
  — `service_label`/`staff_label` são texto livre nesta fase (sem catálogo; `agendamento`
  introduz entidades próprias de serviço/barbeiro na Fase 2).
- `payments_log(id, barbershop_id, client_id, visit_id, amount_cents, method, paid_at)` —
  `method`: enum simples (`dinheiro`/`cartao`/`pix`/`outro`); nunca guarda dado de cartão.
- `crm_settings(barbershop_id, inactivity_days_threshold DEFAULT 21)`.
- `crm_users(id, barbershop_id, email_or_phone, auth_secret_hash)` — auth mínima (Decision 2).

Índice composto `(barbershop_id, id)` em todas; `(barbershop_id, phone)` único em `clients`
(considerando só registros com `deleted_at IS NULL`).

## Authentication and Authorization
- Sessão única por barbearia (papel implícito "dono"), cookie assinado.
- Toda rota de `/api/*` resolve `barbershop_id` a partir da sessão — nunca aceita
  `barbershop_id` vindo do cliente (corpo/query), fechando o vetor de acesso cruzado
  coberto na spec ("Isolamento de dados entre barbearias").

## Security and Privacy
- Telefone e nome nunca aparecem em log (mesma regra do `CLAUDE.md` já aplicada em
  `automation/`).
- `auth_secret_hash` com hash forte (bcrypt/argon2), nunca texto puro.
- Exclusão LGPD: anonimização, não hard delete, para preservar integridade de relatório
  (Decision 3 + Error Flow 3).

## Observability
### Logs
- Eventos de criação/edição/exclusão de cliente e visita, com `barbershop_id`, sem nome
  nem telefone no log.
### Metrics
- Contagem de clientes ativos/inativos por tenant; volume de atendimentos/dia (baseline
  para o relatório mensal da Fase 3).
### Alerts
- Fora de escopo nesta fase (sem Sentry configurado — ver Decision 1).

## Testing Strategy
- Unit: cálculo de inatividade, cálculo de ticket médio, validação de telefone único.
- Integration: rotas de `/api/clients`, `/api/clients/:id/visits` contra Postgres local.
- Contract: N/A (sem integração externa nesta fase).
- E2E: fluxo cadastrar cliente → registrar atendimento → ver no dashboard (Playwright).
- Manual: migração rodada contra um dataset real de `automation/data/db.json`.
- **Isolamento de tenant** (DoD do ADR-0007): teste dedicado — dado da barbearia A nunca
  aparece em resposta de API autenticada como barbearia B.

## Migration Strategy
- Schema novo, sem dado legado no Postgres (banco não existe hoje).
- Import de `automation/data/db.json` conforme Decision 4 — script idempotente, dry-run
  disponível antes de gravar de verdade.

## Rollback Plan
- `apps/web`/`packages/db` são aditivos — reverter o deploy remove a feature sem afetar
  `automation/`/`site/`, que continuam operando independentemente.
- Migração: dry-run obrigatório antes de qualquer import real; script de reversão apaga só
  os registros marcados com a tag da migração (não todo o schema).

## Compatibility
- Nenhum código existente (`automation/`, `site/`, `infra/`) é modificado por esta change.
- `automation/data/db.json` é só **lido** pelo script de migração — nunca escrito pelo
  produto, para não quebrar o tooling operacional que continua em uso pela agência.

## Arquitetura preparada para IA
`atendimento-ia` (D3/ADR-0005, ainda não implementada) vai precisar de contexto do
cliente durante a conversa. Esta change não implementa IA, mas deixa o terreno pronto:
- `visits`/`payments_log` já são a fonte de "histórico do cliente" que um prompt de IA
  consultaria (via `packages/db`, camada de repositório com escopo de tenant — mesma regra
  do ADR-0007 vale para qualquer leitura futura vinda de `packages/ai`).
- Nenhuma tabela desta fase antecipa schema de conversa/mensagem — isso é
  responsabilidade de `atendimento-ia` quando especificada.

## Arquitetura preparada para WhatsApp
`whatsapp-canal` (D2/ADR-0004, decisão pragmática já registrada em
`add-agency-ops-panel/design.md`: Evolution API self-hosted) vai precisar identificar um
cliente pelo telefone ao receber mensagem. Esta change não integra WhatsApp, mas:
- `clients.phone` é o campo de match natural entre um evento de webhook do Evolution API e
  um registro do CRM — mesmo padrão já usado em `automation/lib/store.mjs` hoje.
- Nenhum envio de mensagem é implementado aqui; `crm_settings.inactivity_days_threshold` é
  o dado que uma futura rotina de reativação (Fase 5) vai consultar para decidir quem
  contatar — a regra já existe, só não dispara nada sozinha ainda.

## Interface e Design System
Reaproveita integralmente o design system já em uso no `site/` e no `automation/panel/`
(diretriz de Vítor registrada em `add-agency-ops-panel/design.md`: "o site é a referência
visual canônica da marca") — nenhuma identidade nova é criada:

- **Paleta**: Ink `#0D0D0D` (fundo/destaque), Gold `#C9A84C` (acento primário), Chalk
  `#F5F2EC` (fundo claro/texto em fundo escuro), Steel `#2B2B2B` (cards/superfícies), Wire
  `#8C8C8C` (texto auxiliar/labels).
- **Tipografia**: Barlow Condensed (títulos, peso 900/700), Barlow (corpo, 400/500), Space
  Mono (labels/metadados, 400/700).
- **Implementação**: shadcn/ui com os tokens acima (per `docs/architecture/overview.md`),
  não um design system novo — os componentes shadcn (Card, Table, Dialog, Badge, Input)
  recebem os tokens Blade em vez do tema default.
- **Vocabulário obrigatório**: "Clientes" (nunca "CRM"), "horário"/"agenda"/"zap" — mesmo
  glossário do site e da automação.
- **Tom**: direto, confiante, específico, humano — mesma diretriz de copy do
  `docs/business/contexto-negocio.md` (proibido "nossa plataforma/solução"; usar "o
  sistema").

### Estrutura de telas
- **Dashboard** (`/`): indicadores (ativos, inativos, ticket médio), lista curta de
  "clientes para reativar".
- **Clientes** (`/clientes`): lista com busca, badge de status (ativo/inativo), botão
  "Novo cliente".
- **Perfil do cliente** (`/clientes/[id]`): dados cadastrais, histórico de atendimentos
  (linha do tempo), "evolução" (frequência/ticket ao longo do tempo — premissa da
  exploração), botão "Registrar atendimento", botão "Excluir cliente" (LGPD).
- **Configurações** (`/configuracoes`): limite de dias para inatividade.

### Fluxo de navegação
```text
Login (auth mínima) → Dashboard
  Dashboard → Clientes → Perfil do cliente → Registrar atendimento (volta ao perfil)
  Dashboard → Clientes para reativar (atalho) → Perfil do cliente
  Qualquer tela → Configurações (menu fixo)
```

### Componentes reutilizáveis
- Card de cliente (nome, telefone mascarado, badge de status) — mesmo padrão visual já
  usado no `automation/panel/` (cards de barbearia/cliente, Ink/Gold).
- Badge de status (ativo/inativo) — reaproveita o conceito de status de conexão já
  presente no `painel-agencia` (`tenant_health`), com paleta equivalente (verde/âmbar).
- Máscara de telefone (`***1234`) — mesma função já usada em `automation/lib/store.mjs`,
  portada para `packages/db` ou uma função utilitária compartilhada.
- Tabela de histórico (linha do tempo) — componente novo, mas usa os tokens shadcn+Blade
  já definidos para outras listas.

## Dependências entre módulos
```text
Fase 0 técnica (subconjunto init-project-skeleton: workspace, packages/db, apps/web, auth mínima)
  └── Fase 1 — crm-clientes (esta change)
        ├── depende de: Fase 0 técnica
        ├── consome (leitura única): automation/data/db.json
        └── habilita futuramente:
              ├── Fase 2 — agendamento (lê/escreve "próximo agendamento" do cliente)
              ├── Fase 3 — relatorios (lê visits/payments_log)
              ├── Fase 4 — fidelizacao-clientes (lê visits)
              └── Fase 5 — whatsapp-canal / atendimento-ia / reativacao-clientes /
                    confirmacao-agendamento (leem clients/crm_settings)
```
Nenhuma capability futura precisa alterar o schema desta fase para existir — todas
consomem via `packages/db` (camada de repositório), conforme ADR-0007.

## Remaining Risks
| Risk | Impact | Mitigation | Owner/Decision |
|---|---|---|---|
| Fase 0 técnica atrasa a Fase 1 (dependência dura) | Alto | Escopo da Fase 0 reduzido ao mínimo (Decision 1); tasks sequenciadas primeiro | Vítor |
| "Evolução do cliente" é premissa, não requisito confirmado literalmente | Médio | Marcado como premissa na exploration/proposal; validar layout específico antes de implementar essa tela | Vítor |
| Divergência entre `automation/panel` e produto após migração, se a agência continuar cadastrando no JSON | Médio | Runbook documenta a migração como ponto de corte definitivo por tenant | Vítor |
| ADRs da stack ainda não aceitas formalmente | Baixo | Design assume a stack como está; revisão pontual se a stack mudar | — |

## Open Questions
- Layout exato de "evolução do cliente" (gráfico de frequência? lista de tendência?) — a
  validar com Vítor antes da task de UI correspondente.
- Se/quando o operador Blade precisa de acesso ao CRM de um tenant específico (não
  bloqueia esta fase).
