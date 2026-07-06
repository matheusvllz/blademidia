# Tasks: Painel de Operação da Agência

> Pré-requisito (grupos 3-6): `init-project-skeleton` concluído. O grupo 0 (Fase 0)
> não depende dele e foi entregue primeiro. Escopo assume hospedagem híbrida: painel
> serverless (Netlify/Vercel) + gateway Evolution API em VPS/Docker (conforme `design.md`).

## 0. Fase 0 — automação local + presets (entregue 2026-07-06)

- [x] 0.1 Motor de auto-resposta com presets (`automation/lib/engine.mjs` + `presets/barbearia-default.json`)
  - Evidência: teste de intenções 5/5 PASS (preços > agendamento > saudação; escalação
    após 2 sem-match; silêncio pós-escalação; fora-de-horário avisa 1x por contato).
- [x] 0.2 Webhook server local + simulador (`webhook-server.mjs`, `simulate.mjs`)
  - Evidência: fluxo ponta a ponta rodado em dry-run — 6 mensagens simuladas, respostas
    corretas, logs sem conteúdo de mensagem e com telefone mascarado.
- [x] 0.3 Provisionamento e status por script (`provision.mjs`, `status.mjs`)
  - Evidência: `node --check` OK; dry-run funcional. Validação contra Evolution real
    pendente de Docker/VPS (bloqueio registrado abaixo).
- [x] 0.4 Compose local do Evolution (`infra/evolution/docker-compose.local.yml`)
  - Evidência: arquivo criado; execução bloqueada — Docker Desktop não instalado nesta
    máquina (2026-07-06). Próximo passo: instalar Docker Desktop OU validar direto no VPS.
- [x] 0.5 Migração do Netlify para este repo
  - Evidência: `updateSite` via API — repo_path=matheusvllz/blademidia, dir=site;
    deploy `6a4c2eed...` state=ready publicado do commit f653286.

## 1. Infra externa (fora do código — Vítor faz em paralelo)

- [ ] 1.1 Criar conta Netlify/Vercel e conectar ao repositório (painel)
  - Validation: manual
  - Completion criteria: deploy de preview gerado a partir de um PR

- [ ] 1.2 Criar Postgres gerenciado (Neon ou Supabase) para o painel — obter `DATABASE_URL`
  - Validation: manual
  - Completion criteria: conexão bem-sucedida a partir do app local

- [ ] 1.3 Provisionar VPS para o gateway Evolution
  - Opção recomendada para dev/teste (custo zero): Oracle Cloud Free Tier, instância
    ARM Ampere (VM.Standard.A1.Flex, até 4 OCPU/24GB RAM), Ubuntu 22.04 — ver passo a
    passo abaixo. **Risco conhecido**: capacidade ARM grátis é disputada (erros "Out of
    Capacity" são comuns ao criar/escalar); Oracle pode suspender contas "Always Free"
    sem SLA — não usar para o cliente pagante real sem essa ciência.
  - Opção recomendada para produção com cliente real: VPS pago pequeno (Hetzner CX22 ou
    similar, ~R$30-60/mês, ADR-0006) — mesma stack Docker, só troca o host.
  - Passo a passo (Oracle): criar conta → Oracle Cloud Free Tier → criar instância →
    forma "Ampere" (arm) → 4 OCPU / 24GB RAM (ou menos, se a cota já estiver em uso por
    outra instância) → imagem Ubuntu 22.04 → baixar chave SSH pública/privada → criar →
    `ssh -i chave.key ubuntu@IP` → `sudo apt update && sudo apt upgrade -y`.
  - Validation: manual
  - Completion criteria: SSH funcionando, sistema atualizado

## 2. Gateway Evolution API (VPS)

- [ ] 2.0 Instalar Docker + Docker Compose na VPS
  - Likely files/components: nenhum (comandos diretos na VPS)
  - Depends on: 1.3
  - Validation: manual
  - Completion criteria: `curl -fsSL https://get.docker.com | sudo sh` concluído;
    `sudo usermod -aG docker $USER` (relogar); `docker compose version` responde.
    Funciona igual em ARM64 (Oracle) ou AMD64 (Hetzner) — as imagens usadas
    (postgres, redis, caddy, evolution-api) são multi-arquitetura.

- [ ] 2.1 Docker Compose: Evolution API + Postgres + Redis + Caddy
  - Likely files/components: `infra/evolution/docker-compose.yml` (já criado),
    `infra/evolution/Caddyfile` (já criado, trocar `SEU_DOMINIO`), `infra/evolution/.env`
    (copiar de `.env.example`, preencher `EVOLUTION_DB_PASSWORD` e
    `EVOLUTION_GLOBAL_API_KEY` com `openssl rand -hex 32`)
  - Depends on: 2.0
  - Validation: manual
  - Completion criteria: `docker compose up -d` sobe todos os serviços; API acessível via
    domínio próprio com TLS (Caddy emite certificado automaticamente — precisa do DNS do
    domínio/subdomínio já apontando pro IP da VPS antes de subir)

- [ ] 2.2 Criar primeira instance de teste + parear via QR
  - Likely files/components: chamada manual/script contra a API do Evolution
  - Depends on: 2.1
  - Validation: manual
  - Completion criteria: número real conectado; envio/recebimento de mensagem de teste
    funcionando

## 3. Schema e vault de credenciais

- [ ] 3.1 Tabelas `whatsapp_credentials`, `subscriptions`, `tenant_health`
  - Likely files/components: `packages/db/src/schema.ts`, migração nova
  - Depends on: init-project-skeleton (2.1, 2.2)
  - Validation: integration
  - Completion criteria: migração aplica em Postgres gerenciado; `barbershop_id` presente
    em todas

- [ ] 3.2 Criptografia da API key da instance em repouso
  - Likely files/components: `packages/db/src/crypto.ts` (ou `pgcrypto`)
  - Depends on: 3.1
  - Validation: unit
  - Completion criteria: chave nunca persiste em texto puro; teste confirma
    criptografar/decriptografar

## 4. `packages/whatsapp` — `EvolutionAdapter`

- [ ] 4.1 Implementar `EvolutionAdapter` (criar instance, enviar texto/mídia, consultar
      status de conexão)
  - Likely files/components: `packages/whatsapp/src/adapters/evolution.ts`
  - Depends on: 2.1, interface `WhatsAppProvider` (já definida em init-project-skeleton)
  - Validation: unit (mock de resposta da API) + integration contra a instance de teste
  - Completion criteria: envia mensagem de teste com sucesso via instance real

- [ ] 4.2 Handler de webhook (`/api/webhooks/evolution`)
  - Likely files/components: `apps/web/app/api/webhooks/evolution/route.ts`
  - Depends on: 4.1
  - Validation: integration (evento real do Evolution)
  - Completion criteria: identifica tenant por `instance_name`; processa
    mensagem/conexão; não loga corpo da mensagem

- [ ] 4.3 Rate limit / warm-up por instance
  - Likely files/components: `packages/whatsapp/src/rate-limit.ts`
  - Depends on: 4.1
  - Validation: unit
  - Completion criteria: instance nova respeita limite de volume/dia configurável,
    crescente ao longo dos primeiros dias

## 5. `/painel-agencia`

- [ ] 5.1 Autenticação restrita (papel `agency_admin`)
  - Likely files/components: `apps/web/app/painel-agencia/layout.tsx`, config Better Auth
  - Depends on: init-project-skeleton (auth instalado)
  - Validation: manual
  - Completion criteria: usuário sem papel `agency_admin` recebe 403

- [ ] 5.2 CRUD de tenant + fluxo de criação de instance (QR code exibido no painel)
  - Likely files/components: `apps/web/app/painel-agencia/tenants/`
  - Depends on: 3.1, 3.2, 4.1, 5.1
  - Validation: e2e (Playwright)
  - Completion criteria: criar tenant, gerar QR, confirmar conexão, listar tenants

- [ ] 5.3 Dashboard de saúde (`tenant_health`)
  - Likely files/components: `apps/web/app/painel-agencia/tenants/[id]/health/`
  - Depends on: 4.2, 5.2
  - Validation: manual
  - Completion criteria: status de conexão, volume recente e nº de reconexões visíveis
    por tenant

- [ ] 5.4 Estado de assinatura (billing) — valores como configuração
  - Likely files/components: `apps/web/app/painel-agencia/tenants/[id]/billing/`
  - Depends on: 3.1, 5.2
  - Validation: manual
  - Completion criteria: status trialing/active/past_due/suspended visível e editável;
    `monthly_fee_cents` configurável, não hardcoded

## 6. Deploy

- [ ] 6.1 Deploy do painel (Netlify/Vercel) + gateway (VPS) integrados
  - Depends on: 1.x, 2.x, 3.x, 4.x, 5.x
  - Validation: manual
  - Completion criteria: `/painel-agencia` acessível publicamente, CRUD funcional,
    mensagem real enviada/recebida via número de teste conectado

<!--
Pendente do Matheus (não bloqueia estas tarefas, bloqueia só ir a mercado com cliente
real): valor final de monthly_fee_cents, texto de contrato de cancelamento/
responsabilidade, regra de carência de inadimplência, ciência explícita do risco de ban
real (não ~zero) assumido com a rota Evolution.
-->
