# Design: Esqueleto Base do Monorepo

## Context
Primeira change de implementação. Materializa ADR-0001, 0002, 0003, 0005, 0006 e 0007 em
código executável, sem lógica de domínio.

## Goals and Constraints
### Goals
- Ambiente local reproduzível em um comando; CI verde desde o primeiro PR.

### Constraints
- Orçamento de infra ≤ R$150-200/mês (D4) — nada nesta change deve consumir custo além de
  free tiers (GitHub Actions, Sentry free, Uptime Kuma self-hosted).
- Multi-tenancy desde o schema (D5/ADR-0007) — mesmo vazio, o schema já reserva o padrão
  `barbershop_id` como convenção para toda tabela de negócio futura.
- Provedor WhatsApp abstraído (D2/ADR-0004) — `packages/whatsapp` só expõe a interface.

## Proposed Architecture
```text
blademidia/
  apps/
    web/        # Next.js (App Router) — painel + API + webhooks (rotas vazias, health check)
    worker/      # Node — consumidor pg-boss (sem job de negócio ainda, health check)
  packages/
    core/        # domínio — vazio, barrel export só
    db/           # Drizzle: client, schema vazio, migrations, script de seed vazio
    whatsapp/    # interface WhatsAppProvider (tipos), sem adapter
    ai/          # client Claude (Anthropic SDK) wrapper stub
  docker-compose.yml   # postgres, caddy, web, worker
  .github/workflows/ci.yml
  .env.example
```

## Technical Decisions
### Decision 1: Monorepo com pnpm workspaces
- Decision: `pnpm-workspace.yaml` listando `apps/*` e `packages/*`.
- Rationale: já decidido em ADR-0001 (monolito modular, TypeScript).
- Trade-offs: nenhum novo — herdado do ADR.
- Consequences: todo pacote novo (futuras capabilities) nasce dentro desta estrutura.

### Decision 2: Schema Drizzle nasce vazio, não especulativo
- Decision: nenhuma tabela de negócio (nem `clients`, nem `barbershops`) nesta change —
  só a infraestrutura de migração (client de conexão, config do Drizzle Kit).
- Rationale: tabela de negócio pertence à spec da capability que a introduz
  (`auth-tenancy`, `crm-clientes`) — criar aqui seria inventar requisito fora do fluxo SDD.
- Trade-offs: a primeira migração real de negócio só vem na próxima change.
- Consequences: `packages/db` desta change só prova que a conexão/migração funciona.

### Decision 3: `packages/whatsapp` e `packages/ai` nascem como interface, não implementação
- Decision: `WhatsAppProvider` (tipos: enviar texto/mídia, receber webhook normalizado,
  status de entrega, saúde da conexão) sem nenhum adapter concreto; client Claude como
  wrapper fino sem prompt/tool de domínio.
- Rationale: ADR-0004 (provedor em aberto) e ADR-0005 (modelo aceito, mas sem uso de
  domínio ainda) — evita acoplar código a decisões de negócio não tomadas.
- Trade-offs: nenhum ganho imediato de funcionalidade — é propositalmente vazio.
- Consequences: `whatsapp-canal` (change futura) implementa o(s) adapter(s) real(is).

## Alternatives Considered
### Alternative 1: Já criar schema de domínio junto com o skeleton
- Description: adiantar tabelas de `crm-clientes`/`agendamento` nesta mesma change.
- Why not chosen: violaria "spec não contém implementação prematura" — schema de negócio
  precisa de spec própria (`auth-tenancy`/`crm-clientes`), com requisitos verificáveis.

## Affected Components
| Component | Change | Reason |
|---|---|---|
| `apps/web` | Criado | Painel + API + webhooks (esqueleto) |
| `apps/worker` | Criado | Processamento assíncrono (esqueleto) |
| `packages/core` | Criado | Domínio (vazio) |
| `packages/db` | Criado | Conexão + migrations Drizzle |
| `packages/whatsapp` | Criado | Interface `WhatsAppProvider` |
| `packages/ai` | Criado | Client Claude stub |

## Main Flows
### Flow 1: Setup local
1. Dev clona o repo.
2. `pnpm install`.
3. `docker compose up` — sobe Postgres + Caddy + web + worker.
4. `pnpm --filter db migrate` — aplica migração inicial (vazia).
5. `GET /health` em `apps/web` e `apps/worker` retorna 200.

### Flow 2: CI em PR
1. PR aberto contra `main`.
2. GitHub Actions roda `pnpm lint`, `pnpm typecheck`, `pnpm test` em todos os pacotes.
3. PR só pode ser mergeado com CI verde.

## Error Flows
### Error Flow 1: Postgres indisponível no boot
1. `apps/web`/`apps/worker` falha o health check com erro claro de conexão (não trava
   silenciosamente).

## API / Contract Design
- `GET /health` → `200 { status: "ok" }` em `apps/web` e `apps/worker`.

## Data Model and Persistence
- Nenhuma tabela de negócio. `packages/db` expõe client Drizzle configurado e o diretório
  de migrations vazio, pronto para a próxima change.

## Authentication and Authorization
- Better Auth instalado e configurado com variáveis de ambiente mínimas; sem fluxo de
  login funcional (entra em `auth-tenancy`).

## Security and Privacy
- Nenhum dado sensível. `.env.example` documenta todas as variáveis exigidas, sem valor
  real (`ANTHROPIC_API_KEY=`, `DATABASE_URL=`, `WHATSAPP_PROVIDER=`, etc.).

## Observability
### Logs
- pino configurado em `apps/web` e `apps/worker`, formato JSON estruturado.
### Metrics
- Nenhuma métrica de negócio ainda.
### Alerts
- Sentry inicializado (free tier) capturando exceptions não tratadas; Uptime Kuma referenciado
  no README como ferramenta de operação (configuração real é tarefa de infra, não desta change).

## Testing Strategy
- Unit: Vitest configurado em todos os pacotes com um teste trivial de exemplo.
- Integration: teste de conexão com Postgres via Docker Compose no CI.
- Contract: N/A (sem API de negócio ainda).
- E2E: Playwright instalado, um teste de smoke (`/health` responde 200).
- Manual: seguir o README do zero em uma máquina limpa.

## Migration Strategy
- Migração inicial vazia — sem dado a migrar.

## Rollback Plan
- Reverter o merge; nenhuma migração de dado em produção envolvida.

## Compatibility
- N/A — não há sistema anterior a manter compatível.

## Remaining Risks
| Risk | Impact | Mitigation | Owner/Decision |
|---|---|---|---|
| ADRs ainda `Proposto` | Médio | Confirmação explícita antes de Approved | Vítor (+ ciência do Matheus) |

## Open Questions
- Nenhuma pendente para esta change, condicionado à confirmação das ADRs.
