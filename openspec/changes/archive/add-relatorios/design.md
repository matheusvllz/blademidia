# Design: Relatórios (Produto — Fase 3)

## Context

A Fase 2 deixou `packages/core` como fronteira única de domínio (`AgendaService`, motor de
disponibilidade em `agenda/availability.ts`), `apps/worker` rodando pg-boss com um job real
(`agenda.no-show-sweep`) e dois esqueletos honestos, e o schema com `visits`, `payments_log`,
`appointments`, `services`, `barbers`, `work_schedules`. Este design **não refunda nada**: lê
esses dados, reusa o motor de disponibilidade para capacidade, e usa o mesmo worker para o job
de fechamento mensal.

## Goals and Constraints

### Goals
- Agregação correta e tenant-scoped dos indicadores operacionais definidos na spec, para
  qualquer período (presets + intervalo livre).
- Definição única de **ocupação/capacidade**, reusável por `relatorios` e pela change
  `add-agenda-visao-semanal` (fronteira registrada nas duas explorações).
- PDF apresentável gerado sem dependência pesada (headless browser) — orçamento D4.
- Snapshot mensal idempotente no worker, com campos **reservados e não preenchidos** para as
  métricas causais da Fase 5.

### Constraints
- **D4** (infra ≤ R$150-200/mês): sem serviço externo pago; geração de PDF não pode exigir
  Chromium/Puppeteer (memória pesada numa VPS pequena).
- **D5 / ADR-0007**: `barbershop_id` em toda consulta; escopo forçado no repositório.
- **ADR-0008**: lógica de negócio em `packages/core`; `apps/web`/`apps/worker` são adaptadores
  finos.
- **ADR-0009**: jobs agendados via pg-boss no worker existente; nenhum processo novo.
- **LGPD**: relatórios expõem agregados; exclusão de cliente (já especificada em
  `crm-clientes`) não pode quebrar período fechado.
- Nenhuma chamada externa; nenhum envio automático (decisão de escopo do proposal).

## Proposed Architecture

```text
blademidia/
  apps/
    web/     # +rota(s) /relatorios (tela) e /api/relatorios (agregação sob demanda + PDF)
    worker/  # +job relatorios.monthly-snapshot (cron mensal)
  packages/
    core/
      agenda/
        capacity.ts   # NOVO — capacidade/ocupação, compartilhado com add-agenda-visao-semanal
      relatorios/      # NOVO
        aggregate.ts   # combina repositórios em ReportData (função pura de composição)
        types.ts
    db/
      schema/report-snapshots.ts   # NOVO
      repositories/reports.ts      # NOVO — queries de agregação tenant-scoped
```

Fluxo de dependências (sem ciclos, mesma direção da Fase 2):

```text
apps/web  ─┐
apps/worker├─▶ packages/core/relatorios ─▶ packages/db/repositories/reports ─▶ Postgres
           │        │
           │        └─▶ packages/core/agenda/capacity (reuso)
           ▼
   packages/core/relatorios/aggregate (mesma função para tela E snapshot)
```

- **Dois caminhos de leitura, uma função de agregação.** A tela consulta **sob demanda**
  (`aggregateReport(barbershopId, from, to)`) para qualquer período, incluindo o mês corrente
  ainda aberto. O job mensal do worker chama **a mesma função** para o mês fechado e persiste o
  resultado em `report_snapshots`. Não há duas implementações de cálculo — o snapshot é a
  mesma agregação, materializada.
- **`packages/core/agenda/capacity.ts`** fatora a enumeração de slots que já existe em
  `agenda/availability.ts` (grade − exceções, sem subtrair agendamentos) para calcular
  capacidade total no período. É consumido por `relatorios` e será consumido por
  `add-agenda-visao-semanal` — refatoração compartilhada, não duplicação.
- **PDF** gerado em `apps/web` com `@react-pdf/renderer` (JS puro, sem processo Chromium),
  server-side numa rota de API, a partir do mesmo `ReportData` da tela.

## Technical Decisions

### Decision 1: Uma função de agregação para tela e snapshot
- Decision: `aggregateReport(barbershopId, { from, to })` em `packages/core/relatorios` é o
  único lugar que calcula os indicadores. A tela chama para o período escolhido; o job do
  worker chama para `[primeiro dia do mês, último dia do mês]` do mês fechado e persiste o
  retorno.
- Rationale: evita divergência entre "o que a tela mostra" e "o que fica no snapshot" — o
  mesmo risco que a Fase 2 evitou centralizando em `AgendaService`.
- Trade-offs: a função precisa ser eficiente o bastante para uso interativo (sem cache) — 
  aceitável dado o volume por tenant (Assumption do proposal).

### Decision 2: Capacidade/ocupação como função pura reusável (`agenda/capacity.ts`)
- Decision: capacidade de um período = soma dos slots de `slot_step_min` minutos dentro da
  grade de trabalho, menos exceções (folga/bloqueio), **sem** subtrair agendamentos —
  reaproveita a mesma enumeração de `availability.ts` mudando só o que é subtraído. Ocupação =
  contagem de agendamentos com status `confirmado`/`concluido`/`faltou` no período ÷ capacidade.
- Rationale: fronteira explícita registrada em `add-relatorios` e `add-agenda-visao-semanal` —
  as duas changes precisam do mesmo número. `faltou` conta como ocupado porque o horário ficou
  indisponível para outro cliente (fidelidade ao que "ocupação" significa para o barbeiro).
  `cancelado` não conta (o horário foi liberado).
- Trade-offs: é uma **aproximação por contagem de slot**, não por minuto exato — um serviço de
  90min ocupa "1 agendamento" na contagem, não "3 slots de 30min". Documentado como limitação
  conhecida; suficiente para a leitura de "cheia/vazia" que o barbeiro quer. Se precisão por
  minuto for necessária depois, o cálculo evolui sem mudar a interface pública da função.
- Consequences: `add-agenda-visao-semanal` consome esta função quando implementada; ordem de
  entrega sugerida: `add-relatorios` primeiro (fatora a função), agenda-visão-semanal reusa.

### Decision 3: PDF via `@react-pdf/renderer`, sem headless browser
- Decision: gerar o PDF com componentes React declarativos (`@react-pdf/renderer`), executado
  na rota de API do Next (`apps/web`), a partir do mesmo `ReportData` da tela.
- Rationale: D4. Puppeteer/Playwright para PDF exigiria um Chromium residente — memória alta
  numa VPS de R$30-60/mês compartilhada com Postgres+Evolution+painel. `@react-pdf/renderer` é
  JS puro, sem processo externo, custo de memória previsível.
- Trade-offs: menos fidelidade de CSS que "imprimir a tela" (não reusa Tailwind diretamente) —
  layout do PDF é definido em componentes próprios (`@react-pdf/renderer` tem seu próprio
  sistema de estilo, flexbox-like); replica a paleta Blade manualmente (tokens hex, não classes
  Tailwind).
- Alternativa descartada: ver "Alternatives Considered".

### Decision 4: Snapshot com colunas reservadas e nulas para a Fase 5
- Decision: `report_snapshots` nasce com as colunas causais (`reactivated_count`,
  `no_show_prevented_count`, `bot_messages_count`, `recovered_revenue_cents`) como
  `int NULL`, nunca escritas por esta change. A UI/PDF desta fase **não lê** essas colunas.
- Rationale: Non-Goal explícito do proposal — "não exibir como zero enganoso". Colunas nulas
  deixam a Fase 5 preencher sem migração nova (só `UPDATE`); leitura da Fase 3 as ignora.
- Trade-offs: schema com campos "mortos" temporariamente — mitigado por serem nullable e
  documentados no schema com comentário apontando a Fase 5.

### Decision 5: Rankings como JSONB no snapshot, agregação live via SQL no caminho sob demanda
- Decision: no caminho **sob demanda** (tela), rankings de serviço/barbeiro são calculados por
  `GROUP BY` direto em `visits`/`payments_log` a cada consulta. No **snapshot**, o resultado
  (lista pequena, poucos serviços/barbeiros por barbearia) é persistido como `jsonb` nas colunas
  `top_services`/`top_barbers` — sem tabela filha.
- Rationale: cardinalidade baixa por tenant (poucos serviços/barbeiros — ICP é 1-3 cadeiras);
  uma tabela filha para isso seria complexidade sem ganho, na linha de "simplicidade
  operacional" já adotada (ex.: `agenda_settings` 1:1 em vez de tabela de chave-valor).
- Trade-offs: `jsonb` não é consultável com índice — aceitável porque o snapshot é lido inteiro
  (não filtrado por ranking).

## Alternatives Considered

### Alternative 1: PDF via Puppeteer/Playwright (renderizar a tela e imprimir)
- Description: reusar o HTML/Tailwind da tela, abrir num Chromium headless, exportar PDF.
- Why not chosen: Decision 3 — custo de memória de um Chromium residente ou por-request numa
  VPS pequena compartilhada com Postgres/Evolution/painel, fora do espírito de D4. Reavaliar se
  a VPS de produção crescer de porte.

### Alternative 2: Materializar tudo em snapshot, tela só lê snapshot
- Description: gerar snapshot para qualquer período pedido, cachear.
- Why not chosen: a spec exige intervalo livre (qualquer data) — cachear todo período possível
  é over-engineering para o volume do ICP. A tela consulta sob demanda (Decision 1); só o mês
  fechado é materializado, que é o caso de uso real de "histórico" e "base para a Fase 5".

### Alternative 3: Ocupação por minuto exato (não por contagem de slot)
- Description: capacidade e ocupação em minutos, não em unidades de `slot_step_min`.
- Why not chosen: mais preciso, mas a UI de referência (grade semanal, "21/45") já comunica em
  unidades discretas de horário — contagem de slot é o que o barbeiro vai ler. Documentado como
  aproximação conhecida (Decision 2); evolução futura não quebra a interface pública.

## Affected Components

| Component | Change | Reason |
|---|---|---|
| `packages/core/agenda/capacity.ts` (novo) | Fatora enumeração de slots de `availability.ts` para capacidade sem subtrair agendamentos | Decision 2 |
| `packages/core/relatorios/*` (novo) | `aggregateReport`, tipos `ReportData` | Decision 1 |
| `packages/db/schema/report-snapshots.ts` (novo) | Tabela `report_snapshots` | Persistência do snapshot |
| `packages/db/repositories/reports.ts` (novo) | Queries de agregação tenant-scoped (faturamento, atendimentos, ticket, novos, rankings) + CRUD do snapshot | Fonte de dado de `aggregateReport` |
| `apps/web/app/api/relatorios/*` (novo) | `GET /api/relatorios` (agregação por período), `GET /api/relatorios/pdf` | Contrato da tela |
| `apps/web/app/relatorios/*` (novo) | Tela de relatórios (seletor de período, indicadores, rankings, botão exportar PDF) | UI |
| `apps/web/lib/pdf/relatorio.tsx` (novo) | Documento `@react-pdf/renderer` do resumo | Decision 3 |
| `apps/web/components/nav-bar.tsx` | +item "Relatórios" | Navegação |
| `apps/worker/src/jobs/monthly-snapshot.ts` (novo) | Job cron `relatorios.monthly-snapshot` | Snapshot mensal |
| `apps/web/package.json` | +`@react-pdf/renderer` | Decision 3 |
| `docs/architecture/decisions/` | +ADR-0010 (capacidade/ocupação compartilhada) | Decisão transversal (reusada por outra change) |

## Main Flows

### Flow 1: Barbeiro consulta o relatório de um período
1. Barbeiro abre `/relatorios`, escolhe um preset ou intervalo livre.
2. `GET /api/relatorios?from=&to=` → `aggregateReport` consulta `packages/db/repositories/reports`
   (faturamento, atendimentos, ticket, novos/atendidos) + `capacity.ts` (ocupação) + rankings.
3. Mesma chamada busca o período anterior de igual tamanho para a variação.
4. Tela renderiza indicadores, rankings e a comparação; período sem dado → estado vazio.

### Flow 2: Exportar PDF
1. Barbeiro clica "Exportar PDF" na tela de relatórios (com o período já selecionado).
2. `GET /api/relatorios/pdf?from=&to=` roda `aggregateReport` (mesma função do Flow 1) e
   renderiza `lib/pdf/relatorio.tsx` com `@react-pdf/renderer`, devolvendo `application/pdf`.

### Flow 3: Fechamento mensal automático (worker)
1. pg-boss dispara `relatorios.monthly-snapshot` no início do mês (cron `5 0 1 * *` — dia 1,
   00:05, fecha o mês anterior).
2. Para cada barbearia ativa, chama `aggregateReport(barbershopId, [1º dia, último dia do mês
   anterior])`.
3. `upsertReportSnapshot` grava por `(barbershop_id, year, month)` — `ON CONFLICT` atualiza
   (idempotente; permite reprocessar se rodar de novo).
4. Log por barbearia processada, sem PII, com `tenant_id`.

## Error Flows

### Error Flow 1: Intervalo inválido
1. `from > to` → API responde 400 antes de qualquer query.

### Error Flow 2: Barbearia sem agenda configurada (ocupação indisponível)
1. `capacity.ts` recebe grade vazia → retorna capacidade 0 → `aggregateReport` marca ocupação
   como "indisponível" (não `0/0` nem erro de divisão).

### Error Flow 3: Job do worker falha para uma barbearia
1. Loop de barbearias no job captura erro por tenant individualmente (log de erro com
   `tenant_id`, sem PII) e segue para a próxima — uma barbearia com dado inconsistente não
   derruba o snapshot das demais.

## API / Contract Design

Rotas em `apps/web/app/api`, session-guarded, tenant da sessão, Zod na entrada.

| Método & rota | Ação |
|---|---|
| `GET /api/relatorios?from=&to=` (ou `preset=mes_atual\|mes_passado\|semana\|trimestre`) | Indicadores + rankings + comparação do período |
| `GET /api/relatorios/pdf?from=&to=` | PDF do resumo do período (`application/pdf`) |

Respostas de erro: 400 (intervalo inválido), 401 (sem sessão). Sem 409 (rota só de leitura).

## Data Model and Persistence

- **`report_snapshots`**: `id uuid`, `barbershop_id uuid NOT NULL REFERENCES barbershops(id)`,
  `year int NOT NULL`, `month int NOT NULL` (1–12), `revenue_cents int NOT NULL DEFAULT 0`,
  `visits_count int NOT NULL DEFAULT 0`, `avg_ticket_cents int NULL`,
  `new_clients_count int NOT NULL DEFAULT 0`, `served_clients_count int NOT NULL DEFAULT 0`,
  `occupied_count int NOT NULL DEFAULT 0`, `capacity_count int NOT NULL DEFAULT 0`,
  `no_show_count int NOT NULL DEFAULT 0`, `canceled_count int NOT NULL DEFAULT 0`,
  `top_services jsonb NOT NULL DEFAULT '[]'`, `top_barbers jsonb NOT NULL DEFAULT '[]'`,
  `generated_at timestamptz NOT NULL DEFAULT now()`,
  — **reservado para a Fase 5, sempre NULL nesta change**:
  `reactivated_count int NULL`, `no_show_prevented_count int NULL`,
  `bot_messages_count int NULL`, `recovered_revenue_cents int NULL`.
  - Restrição única `(barbershop_id, year, month)` — garante idempotência do upsert.
  - Índice `(barbershop_id, year, month)`.

Nenhuma alteração em tabelas existentes. Migração puramente aditiva.

## Authentication and Authorization

- Reusa a auth existente (`requireSessionApi`); `barbershopId` sempre da sessão, nunca do
  corpo/query. Papel único "dono" (igual às fases anteriores).
- O worker roda o job para todas as barbearias com contexto de sistema, mas cada chamada de
  agregação recebe `barbershopId` explícito (mesmo padrão do `no-show-sweep`).

## Security and Privacy

- **LGPD**: relatórios expõem só agregados numéricos, nunca lista nominal de clientes além do
  que o CRM já mostra. Exclusão de cliente (regra existente) preserva os totais — esta change
  depende dessa garantia, não a redefine (delta de spec só em `relatorios`).
- **Logs** do job: `tenant_id`, mês processado, contagens — sem telefone/conteúdo.
- Sem segredo novo; `@react-pdf/renderer` roda em processo, sem chamada externa.

## Observability

### Logs
- Job: início/fim, nº de barbearias processadas, erros por tenant (isolados).
- API: uma linha por consulta com `tenant_id` e período (sem PII).

### Metrics
- Contadores simples via log, como na Fase 2; métrica formal fica para fase de operação.

## Testing Strategy

- **Unit**: `capacity.ts` (grade simples, exceções, passo diferente); `aggregateReport` com
  dados sintéticos (faturamento, ticket médio com/sem valor, comparação com período anterior
  sem base).
- **Integration (Postgres real)**: `reports.ts` repositório — faturamento/atendimentos/rankings
  corretos contra dados gravados; `upsertReportSnapshot` idempotente (rodar 2× no mesmo mês não
  duplica, atualiza).
- **Isolamento de tenant**: teste dedicado provando que barbearia B não aparece nos indicadores
  nem no snapshot de A.
- **Contrato**: rota `/api/relatorios` — 400 em intervalo inválido; período vazio → estado
  vazio, sem erro.
- **PDF**: teste de que a rota devolve `application/pdf` com conteúdo não vazio para um período
  com dados e para um período vazio (sem crash).
- **Worker**: teste do job de snapshot — mês fechado gera 1 linha; rodar de novo não duplica;
  erro numa barbearia não impede as demais.
- **Manual/visual**: screenshot da tela conferindo tokens Blade e ausência de "churn"/
  "conversão"; PDF aberto visualmente uma vez para conferir legibilidade.

## Migration Strategy

- **Schema**: `pnpm db:generate` + `pnpm db:migrate` cria `report_snapshots`. Nenhuma coluna
  nova em tabela existente, nenhum backfill obrigatório.
- **Backfill opcional**: nenhum — o histórico de snapshot começa a existir a partir do primeiro
  fechamento mensal após o deploy; meses anteriores continuam consultáveis sob demanda (Flow 1)
  mesmo sem snapshot.
- **Compatibilidade**: nenhuma mudança em `crm-clientes`/`agendamento`; puramente aditiva.

## Rollback Plan

- Reversível: remover o job do worker (`registerJobs`) e, se necessário, `DROP TABLE
  report_snapshots`. Nenhum dado de outra capability é afetado.

## Compatibility

- Nenhuma quebra de contrato existente. Tela e rota são inteiramente novas.

## Remaining Risks

| Risk | Impact | Mitigation | Owner/Decision |
|---|---|---|---|
| Ocupação por contagem de slot (não por minuto) ler "estranho" para serviços muito díspares em duração | Baixo | Documentado (Decision 2); evolução futura sem quebrar interface | Dev |
| `@react-pdf/renderer` não reproduzir 100% a identidade Blade (fontes customizadas) | Baixo | Registrar fontes via `Font.register`; revisão visual manual antes de fechar | Dev |
| Job mensal rodar num mês com muitas barbearias e demorar | Baixo | Volume pequeno (ICP), loop sequencial simples suficiente; paralelizar se crescer | Dev (futuro) |

## Open Questions

- Retenção do histórico de snapshot (quantos meses guardar) — sem TTL nesta fase; decidir se
  virar operacional depois de acumular volume real.
- Se `avg_ticket_cents` do snapshot deve recalcular ao excluir cliente (LGPD) depois do mês
  fechado — decisão: **não**, snapshot é fotografia do fechamento; exclusão LGPD anonimiza mas
  não força reprocessamento retroativo do snapshot (consistente com "preservar agregados já
  fechados" da spec de `crm-clientes`).
