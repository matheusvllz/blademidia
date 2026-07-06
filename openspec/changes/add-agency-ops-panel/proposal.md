# Proposal: Painel de Operação da Agência — Fase 0 (automação local + presets)

## Change ID
`add-agency-ops-panel`

## Status
Approved <!-- Aprovação: ordem direta de Vítor Machado em 2026-07-06 (sessão de trabalho), com escopo Fase 0 abaixo. Ratificação de Matheus pendente para os pontos comerciais (pricing, contrato) — ver exploration.md. -->

## Context
Ver [exploration.md](exploration.md) e [design.md](design.md). A exploração completa
(painel web, billing, vault) permanece válida como visão; esta proposal registra o
**recorte SLC aprovado para execução imediata (Fase 0)**: a automação operacional
local com presets, sem o painel web ainda.

## Problem
A agência precisa atender clientes no WhatsApp automaticamente e provisionar um
cliente novo em minutos — antes mesmo de o produto SaaS existir.

## Goals (Fase 0)
- Motor de auto-resposta determinístico testável localmente, sem Docker/VPS (dry-run).
- Preset por cliente versionado no repo (respostas, regras, warm-up anti-ban).
- Provisionamento de tenant por script (< 10 min por cliente com Evolution no ar).
- Infra Docker Compose pronta para local e produção (Evolution API).

## Non-Goals (ficam para as próximas fases desta change)
- Painel web da agência (CRUD visual de tenants) — depende do init-project-skeleton.
- Billing integrado e vault com criptografia em banco.
- IA conversacional (é a change `atendimento-ia` do produto).

## Scope entregue
- `automation/` (motor + presets + provision/status/simulate) — ver automation/README.md.
- `infra/evolution/docker-compose.yml` (produção/VPS) e `docker-compose.local.yml`.

## Success Criteria (verificados em 2026-07-06)
- `node --check` passa em todos os scripts. ✓
- Simulação ponta a ponta: intenções detectadas (saudação/agendamento/preços),
  escalação para humano após 2 mensagens sem match, silêncio pós-escalação. ✓ (5/5)
- Logs sem conteúdo de mensagem e sem telefone completo. ✓
