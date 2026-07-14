# @blademidia/worker

Processo assíncrono do produto (Fase 2, ADR-0009). Roda [pg-boss](https://github.com/timgit/pg-boss)
no **mesmo** Postgres do produto (sem Redis — D4/ADR-0003); pg-boss cria e mantém seu próprio
schema. Toda regra de negócio vive em `@blademidia/core` — o worker só orquestra jobs.

## Rodar em dev (no host, junto do web)

```bash
docker compose up -d          # Postgres (na raiz do monorepo)
pnpm --filter @blademidia/web dev      # painel  (ou: pnpm dev)
pnpm --filter @blademidia/worker dev   # worker  (ou: pnpm worker)
```

Usa o `.env` da raiz (mesmo do web/scripts). Variáveis: `DATABASE_URL`, `TZ`,
`NO_SHOW_SWEEP_INTERVAL_MIN`.

## Jobs

| Job | Tipo | O que faz |
|---|---|---|
| `agenda.no-show-sweep` | Real (Fase 2) | Marca falta nos agendamentos ativos vencidos além do limite (`no_show_after_min`), por barbearia. Idempotente. |
| `agenda.send-confirmation` | Esqueleto | Seleciona agendamentos a confirmar e **registra (log) o que enviaria** — o envio real é da Fase 5 (`whatsapp-canal`). |
| `crm.reactivation-sweep` | Esqueleto | Seleciona clientes inativos e **registra o que enviaria** — envio real na Fase 5. |

Os esqueletos existem para provar a plumbing assíncrona de ponta a ponta sem depender do
provedor WhatsApp (ainda em aberto por D2). Nunca logam telefone completo nem conteúdo.
