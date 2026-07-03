# ADR-0006: Deploy em VPS com Docker Compose + Caddy

## Status
Proposto (2026-07-03)

## Contexto
Orçamento D4 (≤ R$150-200/mês) e necessidade de: processos de longa duração (worker, filas), webhooks públicos com TLS, Postgres, e possivelmente hospedar a Evolution API (se ADR-0004 escolher a rota não-oficial — o que praticamente exige VPS próprio).

## Decisão
- **VPS único** (Hetzner CX22/CPX11 ~€4-8/mês ≈ R$25-50, ou equivalente nacional/Contabo) rodando **Docker Compose**: `web` (Next.js), `worker`, `postgres`, `caddy` (+ `evolution` se aplicável).
- **Caddy** como reverse proxy com TLS automático (Let's Encrypt).
- **Backups**: dump diário do Postgres enviado a storage externo (Cloudflare R2/B2, free tier); restore testado periodicamente.
- **CI/CD**: GitHub Actions — build das imagens e deploy por SSH na `main`.

## Justificativa
- Custo fixo e previsível — serverless com LLM + webhooks tem custo variável e limites de duração que atrapalham conversas de IA.
- Um VPS comporta tudo, inclusive um eventual container Evolution API, que PaaS gerenciados dificultam.
- Docker Compose = ambiente reproduzível (dev ≈ prod) e recuperação de desastre simples (novo VPS + compose up + restore).

## Vantagens
Controle total; custo mínimo; sem lock-in; logs e dados no mesmo lugar.

## Desvantagens / Trade-offs
- Operação manual é responsabilidade nossa: updates de segurança, monitoramento, disco (mitigado: Uptime Kuma + Sentry + unattended-upgrades; superfície pequena).
- Ponto único de falha (aceito na v1 — downtime curto não é catastrófico para o caso de uso; backups protegem os dados).

## Custo
~R$30-60/mês total de infra base — o item mais barato de todas as alternativas.

## Escalabilidade
Vertical (upgrade do plano) cobre a v1 com folga; caminho futuro: separar Postgres gerenciado e replicar worker. Nada no desenho impede migração para PaaS/K8s depois.

## Alternativas consideradas
- **Vercel + Neon** — ótimo DX para o web, mas worker/filas/Evolution não cabem; custo variável. Rejeitada como plataforma única (pode servir para preview deployments do painel no futuro).
- **Railway/Render/Fly.io** — DX boa, ~US$15-30/mês e crescendo com serviços; menos controle para Evolution. Rejeitada por custo/flexibilidade.
- **AWS/GCP direto** — complexidade e custo desproporcionais à v1. Rejeitada.

## Consequências
Provisionamento do VPS documentado como código (compose + script de setup) numa change própria; segredos via `.env` no servidor (fora do git); runbook mínimo de operação em `docs/operations/` quando o deploy existir.
