# ADR-0003: PostgreSQL 16 + Drizzle ORM + pg-boss (filas sem Redis)

## Status
Proposto (2026-07-03)

## Contexto
O domínio é fortemente relacional (barbearias → clientes → agendamentos → mensagens) com necessidade de filas confiáveis e jobs agendados. Orçamento D4 pressiona contra serviços adicionais.

## Decisão
- **PostgreSQL 16** como único banco (container no VPS, backups diários off-site).
- **Drizzle ORM** para schema, migrações e queries tipadas.
- **pg-boss** para filas, retries e agendamentos (cron) — usando o próprio Postgres, **sem Redis**.

## Justificativa
- Relacional é o modelo natural do domínio; JSONB cobre payloads variáveis (mensagens, eventos de provedor).
- pg-boss elimina um serviço inteiro (Redis) da operação: menos custo, menos memória no VPS, menos coisa para monitorar e fazer backup. No volume da v1 (dezenas de barbearias, milhares de mensagens/dia), Postgres como fila é folgado.
- Drizzle: TS-first, migrações em SQL legível (auditável em PR), leve em runtime.

## Vantagens
Um único stateful service; transações entre dados de negócio e enfileiramento (outbox natural); agendamentos cron nativos no pg-boss; backup = backup de tudo.

## Desvantagens / Trade-offs
- Filas em Postgres têm teto de throughput menor que Redis/BullMQ (irrelevante na escala v1; ponto de revisão se passar de ~centenas de jobs/segundo).
- Drizzle é mais novo que Prisma — API menos estável historicamente (mitigado: uso disciplinado, migrações SQL puras).

## Custo
Zero além do VPS. Alternativa gerenciada (Neon/Supabase free tier) fica documentada como plano B se a operação do Postgres pesar.

## Escalabilidade
Postgres escala verticalmente muito além da necessidade prevista; réplicas de leitura e particionamento são caminhos conhecidos. pg-boss suporta múltiplos workers concorrentes.

## Alternativas consideradas
- **Prisma** — maduro, mas runtime mais pesado e migrações menos transparentes. Segunda opção válida.
- **BullMQ + Redis** — mais throughput, +1 serviço para operar/pagar. Rejeitada na v1.
- **MySQL** — equivalente no essencial; Postgres ganha em JSONB e ferramentas. Rejeitada.
- **MongoDB** — domínio é relacional; joins constantes. Rejeitada.
- **SQLite** — dois processos (web+worker) e backups/replicação complicam; migração futura certa. Rejeitada.

## Consequências
Toda tabela de negócio carrega `barbershop_id` (ADR-0007); jobs idempotentes por chave (`singletonKey` do pg-boss) para evitar duplicidade de confirmação/reativação.
