# ADR-0007: Multi-tenancy em banco único com escopo obrigatório por tenant

## Status
Proposto (2026-07-03)

## Contexto
Decisão D5: o SaaS atende N barbearias numa única instância, sem infraestrutura distribuída. Vazamento de dados entre barbearias seria falha crítica (confiança + LGPD).

## Decisão
- **Banco único, schema único**: toda tabela de dados de negócio tem coluna `barbershop_id NOT NULL` (o tenant) com FK e índice composto.
- **Escopo forçado na camada de repositório** (`packages/db`): nenhuma query de dados de negócio é executável sem `barbershopId` — a API do repositório simplesmente não expõe caminho sem tenant. Acesso cru ao client do Drizzle fora de `packages/db` é proibido por convenção e lint.
- **Testes de isolamento** fazem parte do DoD de qualquer change que crie tabelas: dado A do tenant 1, o tenant 2 não o vê.
- Usuários pertencem a um tenant; operadores Blade têm papel global explícito (auditado).
- **RLS do Postgres** fica como reforço futuro (defesa em profundidade), não como mecanismo primário na v1 — custo de complexidade adiado.

## Justificativa
Banco-por-tenant ou schema-por-tenant multiplicam migração, backup e conexão — operação incompatível com time de 1. Coluna de tenant + escopo em código é o padrão da indústria para SaaS deste porte e atende D5.

## Vantagens
Migrações e backups únicos; consultas agregadas (visão da Blade sobre todos os clientes) triviais; onboarding de tenant = inserts, não provisionamento.

## Desvantagens / Trade-offs
- A proteção depende de disciplina de código (mitigado: repositório como único caminho, lint, testes de isolamento, checklist).
- "Noisy neighbor" teórico entre tenants (irrelevante na escala v1).

## Custo
Zero adicional.

## Escalabilidade
Suporta centenas/milhares de barbearias no mesmo Postgres. Se um dia houver tenant gigante ou requisito de residência de dados, a extração é possível (o `barbershop_id` já particiona tudo logicamente).

## Alternativas consideradas
- **Schema por tenant** — N migrações, N conexões, ferramentas fracas. Rejeitada.
- **Banco por tenant** — isolamento máximo, operação inviável para 1 pessoa. Rejeitada.
- **RLS como mecanismo primário desde já** — segurança forte, mas complexidade de sessão/roles no início; adotável depois sem retrabalho de dados. Adiada.

## Consequências
O esqueleto do projeto já nasce com o helper de repositório com escopo; toda spec de capability com dados inclui cenário de "tenant sem acesso ao dado de outro tenant".
