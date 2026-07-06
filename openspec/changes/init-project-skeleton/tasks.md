# Tasks: Esqueleto Base do Monorepo

> Tarefas pequenas o bastante para um agente de IA implementar com baixo risco em uma
> sessão. Cada tarefa tem critério de conclusão e validação. Marque `[x]` somente com
> evidência (teste passando, screenshot, log).

## 1. Monorepo e tooling

- [ ] 1.1 Inicializar pnpm workspace
  - Objective: `pnpm-workspace.yaml` listando `apps/*` e `packages/*`; `package.json` raiz
    com scripts `build`/`lint`/`typecheck`/`test`.
  - Likely files/components: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`
  - Depends on: —
  - Validation: manual (`pnpm install` sem erro)
  - Completion criteria: `pnpm install` roda na raiz sem erro, workspaces reconhecidos

- [ ] 1.2 Configurar lint/format (ESLint + Prettier) compartilhados
  - Objective: config única na raiz, herdada por todos os pacotes
  - Likely files/components: `.eslintrc.*`, `.prettierrc`
  - Depends on: 1.1
  - Validation: manual
  - Completion criteria: `pnpm lint` roda em todos os pacotes sem erro de configuração

## 2. packages/db

- [ ] 2.1 Configurar Drizzle ORM + client de conexão
  - Objective: client Postgres configurado via `DATABASE_URL`, schema vazio
  - Likely files/components: `packages/db/src/client.ts`, `packages/db/src/schema.ts`
  - Depends on: 1.1
  - Validation: integration
  - Completion criteria: conexão bem-sucedida contra Postgres local (Docker Compose)

- [ ] 2.2 Migração inicial vazia + tooling de migração
  - Objective: `drizzle-kit` configurado, primeira migração gerada (vazia)
  - Likely files/components: `packages/db/drizzle.config.ts`, `packages/db/migrations/`
  - Depends on: 2.1
  - Validation: integration
  - Completion criteria: `pnpm --filter db migrate` aplica sem erro contra Postgres local

## 3. packages/whatsapp e packages/ai (stubs)

- [ ] 3.1 Definir interface `WhatsAppProvider`
  - Objective: tipos TypeScript (enviar texto/mídia, webhook normalizado, status de
    entrega, saúde da conexão) — sem implementação/adapter
  - Likely files/components: `packages/whatsapp/src/provider.ts`
  - Depends on: 1.1
  - Validation: unit (typecheck)
  - Completion criteria: tipos compilam, nenhum adapter importado

- [ ] 3.2 Client Claude stub
  - Objective: wrapper fino do Anthropic SDK, sem prompt/tool de domínio
  - Likely files/components: `packages/ai/src/client.ts`
  - Depends on: 1.1
  - Validation: unit
  - Completion criteria: client instancia com `ANTHROPIC_API_KEY` de `.env`, sem chamada real

## 4. apps/web

- [ ] 4.1 Esqueleto Next.js (App Router)
  - Objective: app inicializa, rota raiz responde
  - Likely files/components: `apps/web/app/`, `apps/web/next.config.ts`
  - Depends on: 1.1
  - Validation: manual
  - Completion criteria: `pnpm --filter web dev` sobe sem erro

- [ ] 4.2 Endpoint `GET /health`
  - Objective: retorna `200 { status: "ok" }`, checando conexão com Postgres
  - Likely files/components: `apps/web/app/health/route.ts`
  - Depends on: 2.1, 4.1
  - Validation: e2e (Playwright smoke test)
  - Completion criteria: teste automatizado confirma 200 em ambiente local

## 5. apps/worker

- [ ] 5.1 Esqueleto do worker + pg-boss
  - Objective: processo Node inicializa, conecta ao pg-boss, sem job de negócio registrado
  - Likely files/components: `apps/worker/src/index.ts`
  - Depends on: 2.1
  - Validation: integration
  - Completion criteria: worker conecta ao Postgres/pg-boss sem erro no boot

- [ ] 5.2 Health check do worker
  - Objective: endpoint ou rotina simples que reporta status "ok"
  - Likely files/components: `apps/worker/src/health.ts`
  - Depends on: 5.1
  - Validation: manual
  - Completion criteria: comando/endpoint reporta "ok" com worker rodando

## 6. Infra local e CI

- [ ] 6.1 Docker Compose local
  - Objective: `docker-compose.yml` sobe Postgres + Caddy + web + worker
  - Likely files/components: `docker-compose.yml`, `Caddyfile`
  - Depends on: 4.1, 5.1
  - Validation: manual
  - Completion criteria: `docker compose up` sobe todos os serviços; `/health` acessível via Caddy

- [ ] 6.2 CI no GitHub Actions
  - Objective: workflow roda lint + typecheck + test em todo PR
  - Likely files/components: `.github/workflows/ci.yml`
  - Depends on: 1.2, 2.2, 4.2, 5.2
  - Validation: observability (execução real do workflow em um PR de teste)
  - Completion criteria: PR de teste mostra CI verde

- [ ] 6.3 Observabilidade baseline (logs + Sentry)
  - Objective: pino configurado (JSON estruturado) em web e worker; Sentry free tier
    inicializado capturando exceptions não tratadas
  - Likely files/components: `apps/web/lib/logger.ts`, `apps/worker/src/logger.ts`,
    `apps/web/sentry.*.config.ts`
  - Depends on: 4.1, 5.1
  - Validation: manual (erro forçado aparece no Sentry local/dashboard)
  - Completion criteria: log estruturado visível no console; exceção de teste capturada no Sentry

## 7. Documentação

- [ ] 7.1 `.env.example`
  - Objective: todas as variáveis exigidas documentadas, sem valor real
  - Likely files/components: `.env.example`
  - Depends on: 2.1, 3.2
  - Validation: manual
  - Completion criteria: copiar para `.env` e preencher é suficiente para rodar tudo

- [ ] 7.2 README "como rodar localmente"
  - Objective: passo a passo validado do zero (clone → install → compose up → health check)
  - Likely files/components: `README.md`
  - Depends on: 6.1, 7.1
  - Validation: manual — seguir o README numa máquina limpa
  - Completion criteria: dev sem contexto prévio consegue rodar seguindo só o README
