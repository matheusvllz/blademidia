# Exploração Crítica: Esqueleto Base do Monorepo (init-project-skeleton)

> Etapas 1-3 do fluxo (Ideia → Refinamento → Discussão).
> Não gere `proposal.md` [feito abaixo] enquanto existirem perguntas bloqueantes sem resposta.

## Ideia original

Criar a estrutura de código base do monorepo (apps + packages) já prevista em
`docs/architecture/overview.md` (linha 74-75) como "primeira change de implementação",
para permitir começar as capabilities de negócio (CRM, agendamento) com agilidade.

## Entendimento atual

É uma change puramente estrutural: materializa as decisões já registradas em
ADR-0001, 0002, 0003, 0005, 0006 e 0007 em um esqueleto de repositório que builda e roda
(health check), sem nenhuma regra de negócio ainda. Não introduz comportamento observável
de nenhuma capability — por isso não tem `spec.md` de capability associada.

## Problema real

O repositório hoje só tem documentação (`openspec/`, `docs/`). Não há como iniciar nenhuma
capability de negócio (`auth-tenancy`, `crm-clientes`, `agendamento`) sem monorepo, tooling
e ambiente de dev/deploy mínimos existindo primeiro.

## Objetivos

- Monorepo pnpm com `apps/web`, `apps/worker`, `packages/core`, `packages/db`,
  `packages/whatsapp`, `packages/ai` criados e buildando.
- TypeScript `strict: true` em todos os pacotes.
- Postgres 16 + Drizzle ORM conectando (schema vazio, migração inicial vazia).
- pg-boss configurado (fila mínima, sem job de negócio ainda).
- Docker Compose local (Postgres + Caddy + web + worker).
- CI (GitHub Actions): lint + typecheck + test em todo PR.
- Health check (`GET /health`) em `apps/web` e `apps/worker`.
- `.env.example` documentado (sem segredo real).
- README com "como rodar localmente" validado do zero.

## Fora de escopo inicial

- Qualquer entidade de domínio (cliente, agendamento, barbearia, usuário) — isso é
  `auth-tenancy` / `crm-clientes` / `agendamento`, changes futuras.
- Autenticação real (Better Auth completo) — nasce só como dependência instalada e
  configuração mínima; fluxo de login é `auth-tenancy`.
- Qualquer integração real de WhatsApp/IA — `packages/whatsapp` e `packages/ai` nascem com
  a interface (`WhatsAppProvider`) e stub, sem adapter real (ADR-0004 ainda não decidido).
- Deploy em VPS de produção (entra no checklist de "ir ao ar", não é código desta change).

## Atores e stakeholders

- Vítor Machado — implementa/roda esta change.
- Agentes de IA que implementarão as próximas changes — dependem desta fundação existir.

## Capabilities afetadas ou candidatas

- Nenhuma capability de negócio (ver `specs/README.md`) — infraestrutura de repositório
  usada por todas as futuras.

## Casos de uso principais

- Dev clona o repo, roda `pnpm install && docker compose up`, e tem Postgres + web + worker
  rodando localmente com health check respondendo.
- PR aberto dispara CI (lint, typecheck, test) automaticamente.

## Edge cases e falhas relevantes

- N/A nesta change (sem lógica de negócio, sem dado sensível ainda).

## Regras de negócio

### Confirmadas
- N/A — esta change não introduz comportamento observável de negócio.

### Em aberto
- N/A.

## Restrições técnicas conhecidas

- Segue exatamente ADR-0001 (TypeScript/monolito modular), ADR-0002 (Next.js + worker),
  ADR-0003 (Postgres + Drizzle + pg-boss), ADR-0005 (Claude API — só client stub),
  ADR-0006 (VPS + Docker Compose), ADR-0007 (multi-tenant single DB — schema já nasce
  pensando em `barbershop_id`, mesmo vazio).
- **Todas essas ADRs estão com `Status: Proposto`, nenhuma aceita formalmente** — ver
  pergunta bloqueante abaixo.

## Requisitos não funcionais relevantes

- Nenhum dado sensível nesta etapa; `.env.example` nunca contém segredo real.

## Riscos

| Risco | Tipo | Impacto | Probabilidade | Mitigação | Decisão necessária |
|---|---|---|---|---|---|
| Prosseguir sem as ADRs de arquitetura formalmente aceitas pelos sócios | Processo | Médio | Certa (é o estado atual) | Confirmação explícita de Vítor (e ciência do Matheus, autor das ADRs) antes de Approved | Sim |
| Nenhum risco técnico relevante — escopo é mecânico/reversível | — | Baixo | — | — | Não |

## Premissas

- ADR-0001, 0002, 0003, 0005, 0006 e 0007 são aceitas como estão, sem mudança de conteúdo,
  para servir de base a esta e às próximas changes. ADR-0004 permanece "Proposto — decisão
  parcial" (a spike de provedor não é bloqueante para esta change, que só usa a interface).

## Perguntas críticas

### Bloqueantes
1. Vítor confirma aceite das ADR-0001, 0002, 0003, 0005, 0006 e 0007 sem mudanças, para
   que passem de `Proposto` para `Aceito` e esta change possa ser `Approved`?

### Importantes, não bloqueantes
1. Nenhuma.

## Decisões da discussão

| Pergunta | Decisão | Quem | Data |
|---|---|---|---|
| Aceite das ADRs de fundação técnica | Pendente confirmação | — | — |
