# ADR-0009: Ativação do worker assíncrono com pg-boss

## Status
Proposto (2026-07-14) — introduzido pela change `add-agendamento` (Fase 2).

## Contexto
A arquitetura ([overview.md](../overview.md)) prevê um `apps/worker` para jobs (confirmação
24h, reativação 21d, relatório mensal) e o ADR-0003 já escolheu **pg-boss** (agendamento no
Postgres, sem Redis) como mecanismo de filas/cron. Até a Fase 1 nada disso existia. A Fase 2
introduz a agenda, que gera um job **útil desde já**: marcar faltas (no-show) de agendamentos
vencidos. Também é o momento de deixar a plumbing assíncrona pronta para a mensageria da
Fase 5, sem depender do provedor WhatsApp (ainda em aberto por D2/ADR-0004).

## Decisão
1. Criar `apps/worker`: processo Node que sobe **pg-boss** conectado ao MESMO Postgres do
   produto (`DATABASE_URL`); pg-boss cria e mantém seu próprio schema no banco.
2. Job **real** da Fase 2: `agenda.no-show-sweep`, agendado a cada `NO_SHOW_SWEEP_INTERVAL_MIN`
   minutos, marcando como "faltou" os agendamentos ativos vencidos além de `no_show_after_min`
   (por barbearia). Idempotente; não toca concluído/cancelado.
3. Jobs **esqueleto** (honestos): `agenda.send-confirmation` e `crm.reactivation-sweep`
   executam a **seleção** (quem seria notificado) e **registram (log) o que enviariam** — o
   ponto de envio fica para `whatsapp-canal` (Fase 5). Sem envio real nesta fase.
4. O worker não contém regra de negócio: toda operação passa por `@blademidia/core`
   (ADR-0008), com `barbershopId` explícito por tenant (ADR-0007).
5. Em dev, o worker roda no host (`pnpm worker`), como o web; só o Postgres vive no Docker. A
   containerização de produção do produto é assunto de deploy, fora desta change.

## Justificativa
Reusar o Postgres já orçado (D4) evita um segundo serviço (Redis) e um segundo mecanismo de
agendamento (cron do SO). pg-boss dá retry, agendamento e observabilidade num só lugar — o
mesmo que a Fase 5 usará para confirmação/reativação. Dar ao worker um job real (no-show)
prova a plumbing de ponta a ponta sem depender de decisões ainda abertas (WhatsApp).

## Vantagens
- Sem Redis, sem cron do SO, sem serviço pago novo — dentro de D4.
- Retry/agendamento/observabilidade centralizados; mesmo mecanismo para a Fase 5.
- Valor imediato (no-show) + estrutura pronta para mensageria.

## Desvantagens / Trade-offs
- Mais um processo para operar (uptime/monitoração) — aceitável para 1 dev; Uptime Kuma
  previsto no overview.
- Risco de "código morto" nos esqueletos — mitigado mantendo-os mínimos e testando a seleção.

## Custo
Zero incremental de infra (mesmo Postgres/VPS). CPU/RAM do worker cabem no VPS orçado.

## Escalabilidade
pg-boss comporta o volume previsto (poucos jobs/min por tenant) com folga; particionável por
fila se crescer.

## Alternativas consideradas
- **Cron do sistema operacional**: um segundo mecanismo a manter, sem retry/observabilidade
  integrados — rejeitado (ADR-0003 já escolheu pg-boss).
- **Redis + BullMQ**: serviço a mais, custo e operação — rejeitado por D4/ADR-0003.
- **Rodar os jobs dentro do `apps/web`**: acopla ciclo de vida de web e jobs, atrapalha deploy
  e escala — rejeitado (ADR-0002 já separa web e worker).

## Consequências
- `.env` ganha `TZ` e `NO_SHOW_SWEEP_INTERVAL_MIN`.
- A Fase 5 conecta o envio real nos esqueletos, sem refazer a plumbing.
- Backup/observabilidade do Postgres agora cobrem também o schema do pg-boss.
