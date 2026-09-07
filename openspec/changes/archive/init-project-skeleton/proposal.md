# Proposal: Esqueleto Base do Monorepo

## Change ID
`init-project-skeleton`

## Status
**Superseded** (2026-09-07) <!-- nunca chegou a Approved -->

> Esta change nasceu quando o repositório só tinha fundação SDD (specs, ADRs, docs) e nenhum
> código. Ela nunca foi formalmente aprovada nem implementada como tal — mas o monorepo que
> ela propunha (`apps/web`, `apps/worker`, `packages/core`, `packages/db`, `packages/whatsapp`,
> `packages/ai`, Postgres+Drizzle, pg-boss, Docker Compose local) **nasceu organicamente dentro
> da change `add-crm-clientes`** (Fase 1, concluída 2026-07-07) e foi ganhando o restante do
> escopo aqui previsto nas Fases seguintes. Os fatos: os pacotes existem, buildam, têm CI,
> health checks implícitos via rotas reais, e um README de setup validado — os objetivos desta
> proposal foram todos atingidos, só que por outro caminho e sem que esta change fosse marcada
> como tal. Arquivada como `Superseded` em vez de `Done` porque o vínculo formal
> proposal→implementação nunca existiu; não há tasks aqui marcadas `[x]` com evidência.
> `packages/whatsapp` é a única peça ainda pendente — nasce de verdade na Fase 5
> (`add-whatsapp-canal`), ver `docs/sdd/06-plano-execucao-fase-5.md`.

## Context
Ver [exploration.md](exploration.md). O repositório contém apenas fundação SDD (specs,
ADRs, docs) — nenhum código existe. `docs/architecture/overview.md` já antecipa esta como
a primeira change de implementação.

## Problem
Não há monorepo, tooling nem ambiente de dev/deploy para iniciar qualquer capability de
negócio.

## Goals
- Monorepo pnpm com `apps/web`, `apps/worker`, `packages/core`, `packages/db`,
  `packages/whatsapp`, `packages/ai` criados e buildando com TypeScript `strict`.
- Postgres 16 + Drizzle ORM conectado, migração inicial vazia.
- pg-boss configurado (sem job de negócio).
- Docker Compose local (Postgres + Caddy + web + worker).
- CI (GitHub Actions) com lint + typecheck + test.
- Health check em `apps/web` e `apps/worker`.
- README com instruções de setup local validadas do zero.

## Non-Goals
- Qualquer entidade de domínio ou regra de negócio.
- Autenticação funcional (Better Auth é instalado, não implementado).
- Adapter real de WhatsApp ou IA (apenas interfaces/stubs).
- Deploy em produção.

## Users / Actors Impacted
- Vítor (dev) e agentes de IA que implementarão as próximas changes.

## Scope
### In scope
- Estrutura de pastas, tooling (lint/format/test/build), schema de banco vazio, CI, Docker
  Compose local, health checks, documentação de setup.

### Out of scope
- Tudo que é capability de negócio (`auth-tenancy`, `crm-clientes`, `agendamento`,
  `whatsapp-canal`, etc.) — changes futuras e independentes.

## Business Rules
- N/A — esta change não introduz comportamento observável de negócio.

## Affected Capabilities
- Nenhuma (infraestrutura de repositório).

## Expected Impact
### Code
- Cria `apps/web`, `apps/worker`, `packages/core`, `packages/db`, `packages/whatsapp`,
  `packages/ai` com esqueleto mínimo cada.

### Data
- Cria conexão Drizzle + primeira migração (schema vazio).

### APIs / Contracts
- `GET /health` em `apps/web` e em `apps/worker` (ou endpoint equivalente).

### Integrations
- Nenhuma integração real — `packages/whatsapp` expõe a interface `WhatsAppProvider` sem
  adapter; `packages/ai` expõe um client Claude stub.

### Operations
- `docker-compose.yml` local; CI no GitHub Actions.

### Security / Privacy (LGPD)
- Nenhum dado sensível nesta etapa. `.env.example` documentado sem segredo real.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| ADRs de fundação técnica ainda `Proposto`, não `Aceito` | Médio (processo) | Confirmação explícita de Vítor antes de marcar esta proposal `Approved` |

## Success Criteria
- `pnpm install && pnpm build` conclui sem erro em todos os pacotes.
- `docker compose up` sobe Postgres + `apps/web` + `apps/worker` localmente.
- `GET /health` responde 200 em `apps/web` e `apps/worker`.
- CI roda lint + typecheck + test em um PR de teste e fecha verde.
- Um dev seguindo só o README consegue rodar o projeto localmente do zero.

## Assumptions
- ADR-0001, 0002, 0003, 0005, 0006 e 0007 aceitas sem mudança de conteúdo.

## Open Questions
- Nenhuma, condicionado à confirmação da pergunta bloqueante em `exploration.md`.
