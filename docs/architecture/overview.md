# Arquitetura Proposta — Blade Mídia SaaS

> **Status: Proposta** — aguardando validação dos sócios. Cada tecnologia tem um ADR com
> justificativa completa em [decisions/](decisions/). Nada aqui é implementação; é a
> recomendação arquitetural da fundação (etapa "Arquitetura" só se aplica por change).

## Princípios

0. **A arquitetura serve à dor central** — o sistema existe para que o WhatsApp da barbearia
   nunca fique sem operador ([Guia da Dor](../business/dor-central.md)). Daí decorrem duas
   consequências arquiteturais duras: o caminho crítico é **receber e responder mensagem**
   (tudo o mais é apoio), e **nada essencial pode exigir ação do barbeiro** no painel — a
   promessa vendida é "sem você operar nada".
1. **Simplicidade operacional primeiro** — time técnico de 1 pessoa; cada serviço adicional é custo de operação permanente.
2. **Monolito modular** — módulos com fronteiras claras por capability dentro de um único deploy; extraível no futuro se necessário, sem pagar o preço de microservices agora.
3. **Multi-tenant desde o dia 1, sem infraestrutura distribuída** (decisão D5).
4. **Provedores externos atrás de interfaces** — WhatsApp (D2) e LLM são substituíveis sem tocar o domínio.
5. **Custo total ≤ R$150-200/mês** (D4).

## Visão geral

```text
                         ┌────────────────────── VPS (Docker Compose) ──────────────────────┐
                         │                                                                  │
 Barbeiro/Operador ──────┼─▶ Caddy (TLS) ─▶ apps/web (Next.js)                              │
                         │                   │  · painel (React + shadcn/ui + tokens Blade) │
                         │                   │  · API interna + webhooks WhatsApp (enfileira│
                         │                   │    e responde 200 imediatamente)             │
                         │                   ▼                                              │
                         │                PostgreSQL 16 ◀── pg-boss (filas + agendamentos)  │
                         │                   ▲                                              │
                         │                apps/worker (Node)                               │
                         │                   · processa mensagens recebidas                 │
                         │                   · conversa IA (Claude API)                     │
                         │                   · jobs: confirmação 24h, reativação 21d,       │
                         │                     relatório mensal                             │
                         └──────────────────┬───────────────────────────────────────────────┘
                                            │ interface WhatsAppProvider
                              ┌─────────────┴─────────────┐
                              ▼ (adapter A)               ▼ (adapter B)
                        Meta Cloud API              Evolution API
                        (oficial, pago)             (não-oficial, grátis, risco de ban)
                              └────────── spike técnica decide (ADR-0004) ──────────┘
```

## Stack resumida

| Camada | Escolha | ADR |
|---|---|---|
| Linguagem/runtime | TypeScript, Node.js 22 LTS, monorepo pnpm | [ADR-0001](decisions/ADR-0001-typescript-monolito-modular.md) |
| Painel + API | Next.js (App Router) + worker Node separado | [ADR-0002](decisions/ADR-0002-nextjs-e-worker.md) |
| Banco + filas | PostgreSQL 16 + Drizzle ORM + pg-boss (sem Redis) | [ADR-0003](decisions/ADR-0003-postgres-drizzle-pgboss.md) |
| WhatsApp | Interface `WhatsAppProvider` com 2 adapters candidatos — **decisão em aberto** | [ADR-0004](decisions/ADR-0004-whatsapp-provider-abstraido.md) |
| IA conversacional | Anthropic Claude API (modelo configurável; recomendação inicial Haiku 4.5) | [ADR-0005](decisions/ADR-0005-ia-claude-api.md) |
| Deploy | VPS (Hetzner ou similar) + Docker Compose + Caddy | [ADR-0006](decisions/ADR-0006-deploy-vps-docker.md) |
| Multi-tenancy | Banco único, `barbershop_id` em toda tabela, escopo forçado no repositório | [ADR-0007](decisions/ADR-0007-multi-tenant-single-db.md) |

Complementos (decisões leves, sem ADR próprio — revisar no primeiro design):
**Auth** Better Auth (self-hosted, gratuito) · **Validação** Zod · **UI** shadcn/ui com tokens do Design System · **Logs** pino (JSON estruturado) · **Erros** Sentry free tier · **Uptime** Uptime Kuma no VPS · **Testes** Vitest + Playwright · **CI** GitHub Actions (free).

## Estrutura de repositório prevista

```text
blademidia/
  openspec/            # specs, changes, templates, convenções (já criado)
  docs/                # sdd/, business/, architecture/ (já criado)
  apps/
    web/               # Next.js: painel + API + webhooks
    worker/            # jobs, filas, conversas IA
  packages/
    core/              # domínio: entidades, serviços, regras de negócio
    db/                # schema Drizzle, migrações, repositórios (escopo de tenant)
    whatsapp/          # interface WhatsAppProvider + adapters
    ai/                # cliente Claude, prompts, tools do agente de atendimento
  docker-compose.yml
  CHANGELOG.md
```

> A criação desta estrutura de código é a primeira change de implementação
> (`init-project-skeleton`) — passa pelo fluxo SDD como qualquer outra.

## Estimativa de custo mensal (5-10 clientes)

| Item | Custo estimado |
|---|---|
| VPS 2 vCPU / 4 GB (Hetzner CX22 ou similar) | ~R$30-60 |
| Domínio + DNS (Cloudflare free) | ~R$5 |
| Anthropic API (Haiku 4.5, ~500 msgs/cliente/mês, com prompt caching) | ~R$20-60 |
| WhatsApp Meta Cloud API (se escolhida; conversas de serviço) | ~R$0-80 |
| Sentry / Uptime / CI | R$0 (free tiers) |
| **Total** | **~R$55-205** — dentro do teto de D4; sem a API oficial, ~R$55-125 |

## Riscos arquiteturais principais

| Risco | Impacto | Mitigação |
|---|---|---|
| Banimento de número WhatsApp (provedor não-oficial) | Crítico — o número é o ativo do barbeiro | Spike ADR-0004; se Evolution, políticas anti-ban (rate, opt-out, warm-up) e plano de migração para oficial |
| IA responde errado a cliente final | Alto — dano de confiança | Fluxos determinísticos para ações (agendar/confirmar); IA restrita por prompt + tools; escalação para humano; log de conversas |
| VPS único = ponto único de falha | Médio | Backups diários automatizados do Postgres (off-site), Docker Compose reproduzível, restore testado; aceitável na v1 |
| LGPD (dados de clientes finais) | Alto — legal | Consentimento na 1ª mensagem, retenção definida, exclusão sob demanda, criptografia em trânsito/repouso |
| Vazamento de dados entre tenants | Crítico | ADR-0007: escopo obrigatório na camada de repositório + testes de isolamento |

## O que esta arquitetura NÃO é

- Não é microservices — seria complexidade sem demanda.
- Não é serverless — webhooks persistentes, jobs longos de IA e filas ficam melhores (e mais previsíveis em custo) num processo contínuo.
- Não é definitiva — cada change valida as decisões contra o problema real; ADRs podem ser substituídos.
