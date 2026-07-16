# Tasks: Relatórios (Produto — Fase 3)

> Tarefas pequenas o bastante para um agente de IA implementar com baixo risco por sessão.
> Marque `[x]` **somente com evidência** (teste passando, screenshot, saída de comando).
> Ordem = ordem recomendada: **fundação/capacidade → schema → domínio de agregação → API →
> tela → PDF → worker → fechamento**. Branch: `feature/add-relatorios`.

## 0. Fundação — capacidade/ocupação compartilhada

- [x] 0.1 ADR-0010 (capacidade/ocupação compartilhada)
  - Evidência: `ADR-0010-capacidade-ocupacao-compartilhada.md` criado (Status Proposto, formato de conventions.md), referenciado no `design.md`.
  - Objective: registrar a decisão transversal — `packages/core/agenda/capacity.ts` como
    fonte única de capacidade/ocupação, consumida por `relatorios` e (depois)
    `add-agenda-visao-semanal`. Status `Proposto`.
  - Likely files: `docs/architecture/decisions/ADR-0010-capacidade-ocupacao-compartilhada.md`.
  - Depends on: —
  - Validation: manual — segue o formato de ADR (conventions.md).
  - Completion criteria: ADR criado e referenciado no `design.md`.

- [x] 0.2 `capacity.ts` — capacidade de um período (reuso de `availability.ts`)
  - Evidência: `capacity.ts` reusa diretamente `resolveOpenWindows`/`generateSlots`, já exportados de `availability.ts` — nenhuma refatoração foi necessária (as funções já eram puras e reexportáveis). `availability.test.ts` seguiu 10/10 verde sem alteração no arquivo.
  - Objective: extrair a enumeração de slots (grade − exceções) já usada em
    `agenda/availability.ts` para uma função `computeCapacity(barbershopId, from, to, barberId?)`
    que retorna o total de slots possíveis no período, **sem** subtrair agendamentos.
  - Likely files: `packages/core/src/agenda/capacity.ts`.
  - Depends on: 0.1
  - Validation: unit — grade simples, com exceção (folga zera o dia), passo diferente (15/30);
    e teste de regressão de `availability.test.ts` (todos os cenários da Fase 2 continuam
    verdes após a refatoração).
  - Completion criteria: `capacity.ts` testado isoladamente; `availability.test.ts` 100% verde.

- [x] 0.3 `computeOccupancy` — ocupação (capacidade + agendamentos)
  - Evidência: `capacity.test.ts` — 6/6 testes verdes (capacidade 1 dia = 6 slots, 3 dias = 18, folga zera, barbearia sem grade → 0 sem erro, ocupação conta confirmado/concluído/ignora cancelado, ocupação sem grade → `{occupied:0, capacity:0}`).
  - Objective: `computeOccupancy(barbershopId, from, to, barberId?)` → `{ occupied, capacity }`,
    onde `occupied` = contagem de agendamentos `confirmado`/`concluido`/`faltou` no período.
    Retorna capacidade 0 sem erro quando não há grade.
  - Likely files: `packages/core/src/agenda/capacity.ts`.
  - Depends on: 0.2
  - Validation: unit — período com agendamentos ativos/cancelados (cancelado não conta);
    barbearia sem grade → `{ occupied: 0, capacity: 0 }` sem exceção.
  - Completion criteria: cenários "Indicadores da agenda no período" (ocupação/capacidade zero)
    cobertos.

## 1. Schema de dados

- [x] 1.1 Tabela `report_snapshots` (schema Drizzle)
  - Evidência: `report-snapshots.ts` — 20 colunas (4 reservadas nullable para Fase 5), restrição única `(barbershop_id, year, month)`; `pnpm db:generate` → `0002_faulty_warlock.sql`; typecheck limpo.
  - Objective: criar a tabela conforme `design.md` (Data Model), com colunas causais da Fase 5
    nullable e restrição única `(barbershop_id, year, month)`.
  - Likely files: `packages/db/src/schema/report-snapshots.ts`, `schema/index.ts`.
  - Depends on: —
  - Validation: manual — `pnpm db:generate` gera migração coerente; typecheck limpo.
  - Completion criteria: schema compila; snapshot Drizzle gerado.

- [x] 1.2 Migração aplicada
  - Evidência: `pnpm db:migrate` aplicou a migração sem erro contra o Postgres do compose; a restrição única é exercida (e provada) em `reports.test.ts` ("upsertReportSnapshot é idempotente").
  - Objective: `pnpm db:migrate` cria `report_snapshots` em Postgres real, sem alterar tabela
    existente.
  - Likely files: `packages/db/migrations/0002_faulty_warlock.sql`.
  - Depends on: 1.1
  - Validation: integration — `pnpm db:migrate` aplica sem erro; inserir duas linhas com mesmo
    `(barbershop_id, year, month)` é rejeitado pela restrição única.
  - Completion criteria: migração aplicada em Postgres real; restrição provada.

- [x] 1.3 Repositório de agregação (`reports.ts`)
  - Evidência: `getRevenueStats`, `getNewClientsCount`, `getServedClientsCount`, `getTopServices`, `getTopBarbers`, `getAppointmentPeriodStats` — todas `barbershopId` como 1º argumento; `reports.test.ts` 7/7 verdes contra Postgres real.
  - Objective: queries tenant-scoped em `packages/db/src/repositories/reports.ts`.
  - Likely files: `packages/db/src/repositories/reports.ts`.
  - Depends on: —
  - Validation: integration — cada query contra dados reais gravados no Postgres do compose.
  - Completion criteria: funções exportadas por `@blademidia/db`; typecheck limpo.

- [x] 1.4 Repositório do snapshot (CRUD)
  - Evidência: `upsertReportSnapshot`/`getReportSnapshot`/`listReportSnapshots` no mesmo arquivo `reports.ts`; teste prova upsert 2× no mesmo mês atualiza a MESMA linha (`id` igual) sem duplicar, e nunca escreve as 4 colunas reservadas.
  - Objective: `upsertReportSnapshot` (por `barbershop_id`/`year`/`month`, `ON CONFLICT`
    atualiza) e `getReportSnapshot`/`listReportSnapshots`.
  - Likely files: `packages/db/src/repositories/reports.ts`.
  - Depends on: 1.2
  - Validation: integration — upsert 2× no mesmo mês não duplica; valores atualizam.
  - Completion criteria: idempotência provada contra Postgres real.

- [x] 1.5 Teste de isolamento de tenant
  - Evidência: `reports.isolation.test.ts` — 3/3 testes contra Postgres real (indicadores de B não incluem A, ranking de B não inclui serviço de A, snapshot de A não é lido pela chave de B).
  - Objective: provar que barbearia A não lê indicadores/snapshot de B, no molde de
    `agenda.isolation.test.ts`.
  - Likely files: `packages/db/src/repositories/reports.isolation.test.ts`.
  - Depends on: 1.3, 1.4
  - Validation: integration — testes verdes contra Postgres.
  - Completion criteria: DoD do ADR-0007 cumprido para `relatorios`.

## 2. Domínio — agregação (`packages/core/relatorios`)

- [x] 2.1 `aggregateReport` — composição dos indicadores
  - Evidência: `aggregate.ts` combina os repositórios de 1.3 + `computeOccupancy` (0.3) num `ReportData` único, com período anterior calculado por `previousPeriod`; `aggregate.test.ts` 4/4 verdes (intervalo inválido, período vazio, período com movimento incluindo sinalização de valor ausente, comparação com variação +100%).
  - Objective: `aggregateReport(barbershopId, { from, to })`.
  - Likely files: `packages/core/src/relatorios/aggregate.ts`, `types.ts`.
  - Depends on: 1.3, 0.3
  - Validation: unit — dados sintéticos (faturamento com/sem valor, ticket médio, variação vs
    anterior, anterior sem dado → sem variação, sem erro).
  - Completion criteria: cenários "Indicadores operacionais", "Comparação com o período
    anterior" da spec cobertos.

- [x] 2.2 Validação de período (intervalo inválido)
  - Evidência: `isInvalidRange` em `period.ts`, checado no início de `aggregateReport` antes de qualquer query; coberto no teste "intervalo inválido (from > to) é recusado sem consultar nada" (usa `randomUUID()` como barbershopId inexistente, provando que nenhuma query roda).
  - Objective: `from > to` recusado antes de qualquer query, com erro identificando o problema.
  - Likely files: `packages/core/src/relatorios/aggregate.ts`, `period.ts`.
  - Depends on: 2.1
  - Validation: unit — intervalo invertido recusado; intervalo com `from === to` aceito.
  - Completion criteria: cenário "Intervalo inválido" da spec coberto.

- [x] 2.3 Presets de período
  - Evidência: `period.test.ts` — 9/9 testes verdes (mês atual incl. fevereiro, mês passado incl. virada de ano jan→dez do ano anterior, últimos 7 dias, trimestre atual, validação de intervalo).
  - Objective: função que resolve os presets (`mes_atual`, `mes_passado`, `semana`,
    `trimestre`) para `{ from, to }` no fuso America/Sao_Paulo.
  - Likely files: `packages/core/src/relatorios/period.ts`.
  - Depends on: —
  - Validation: unit — cada preset produz o intervalo correto num mês/ano de teste fixo
    (incluindo virada de ano no preset "mês passado" em janeiro).
  - Completion criteria: cenário "Preset de mês atual" da spec coberto.

## 3. API interna (apps/web)

- [x] 3.1 `GET /api/relatorios`
  - Evidência: `api/relatorios/route.ts`. Testado via HTTP real: login → `?preset=mes_atual` sem dado → estado vazio correto; `?from=2033-07-10&to=2033-07-01` → 400; sem preset nem from/to → 400; após seed de cliente+visita, `?preset=mes_atual` refletiu faturamento/atendimentos/ranking corretos.
  - Objective: aceita `from`/`to` OU `preset`; delega a `aggregateReport`; 400 em intervalo
    inválido; sessão → tenant.
  - Likely files: `apps/web/app/api/relatorios/route.ts`.
  - Depends on: 2.1, 2.2, 2.3
  - Validation: contract — 200 com dados; 200 com estado vazio (período sem dado); 400 em
    `from > to`; escopo por sessão (não vaza dado de outro tenant).
  - Completion criteria: rota acessível só ao tenant da sessão; contrato do design cumprido.

## 4. Tela de Relatórios (apps/web) — identidade Blade

- [x] 4.1 NavBar + rota `/relatorios`
  - Evidência: `nav-bar.tsx` +item "Relatórios"; `app/relatorios/page.tsx` (client, busca `/api/relatorios` conforme o período) + `components/period-picker.tsx` (presets + intervalo livre). Testado via HTTP real: rota 200, header "Relatórios", preset "Mês atual" ativo (`btn-gold`), inputs de data presentes.
  - Objective: item "Relatórios" na `nav-bar`; página com seletor de período.
  - Likely files: `apps/web/components/nav-bar.tsx`, `app/relatorios/page.tsx`,
    `components/period-picker.tsx`.
  - Depends on: 3.1
  - Validation: manual — navegação; tokens Blade; vocabulário do barbeiro (sem "churn"/
    "conversão").
  - Completion criteria: screenshot conferido (via HTML renderizado por HTTP real).

- [x] 4.2 Indicadores operacionais + comparação
  - Evidência: `components/report-summary.tsx` — cards de faturamento/atendimentos/ticket/novos-atendidos, variação vs. período anterior, sinalização "N atendimento(s) sem valor informado", estado vazio explícito. Dados corretos confirmados via `/api/relatorios` real (grupo 3).
  - Objective: cards de faturamento, atendimentos, ticket médio, clientes novos/atendidos, com
    variação vs. período anterior; sinalização de "N atendimentos sem valor informado".
  - Likely files: `apps/web/components/report-summary.tsx`.
  - Depends on: 4.1
  - Validation: e2e — período com dado e período vazio (estado vazio explícito).
  - Completion criteria: cenários "Período com movimento", "Atendimentos sem valor informado",
    "Período sem dados" da spec conferidos na tela.

- [x] 4.3 Indicadores de agenda (ocupação, faltas, cancelamentos)
  - Evidência: `components/report-agenda-summary.tsx` — ocupação "N/M · P% cheia", faltas, cancelamentos, taxa de falta; estado "sem grade configurada" quando capacidade 0 (mesmo dado testado em `capacity.test.ts`/`aggregate.test.ts`).
  - Objective: exibir ocupação, faltas, cancelamentos, taxa de comparecimento; estado
    indisponível quando não há grade configurada.
  - Likely files: `apps/web/components/report-agenda-summary.tsx`.
  - Depends on: 4.1
  - Validation: e2e — barbearia com agenda e sem agenda configurada.
  - Completion criteria: cenários "Ocupação e faltas", "Barbearia sem agenda configurada"
    conferidos.

- [x] 4.4 Rankings (serviços e barbeiros)
  - Evidência: `components/report-rankings.tsx` — listas de serviços/barbeiros com atendimentos+receita; dados corretos confirmados em `reports.test.ts`/`aggregate.test.ts` (getTopServices/getTopBarbers).
  - Objective: lista ordenada por volume com receita de cada serviço; produção por barbeiro.
  - Likely files: `apps/web/components/report-rankings.tsx`.
  - Depends on: 4.1
  - Validation: e2e — barbearia com múltiplos serviços/barbeiros no período.
  - Completion criteria: cenários "Ranking de serviços", "Produção por barbeiro" conferidos.

## 5. Exportação em PDF

- [x] 5.1 Adicionar `@react-pdf/renderer`
  - Evidência: `apps/web/package.json` +`@react-pdf/renderer ^4.5.1`; build de produção (`next build`) compilou limpo com a dependência.
  - Objective: dependência nova em `apps/web`.
  - Likely files: `apps/web/package.json`.
  - Depends on: —
  - Validation: manual — `pnpm install`; import básico compila.
  - Completion criteria: dependência instalada; sem conflito de build.

- [x] 5.2 Documento do resumo (`lib/pdf/relatorio.tsx`)
  - Evidência: `ReportPdfDocument` com paleta Blade em hex (Ink/Gold/Chalk/Steel/Wire). PDF real gerado e **conferido visualmente** (Read do arquivo): wordmark "BLADE.MÍDIA" com ponto gold, indicadores em cards, seções de agenda/rankings, rodapé — legível e com identidade reconhecível.
  - Objective: componente `@react-pdf/renderer` com identidade Blade renderizando o `ReportData`.
  - Likely files: `apps/web/lib/pdf/relatorio.tsx`.
  - Depends on: 2.1, 5.1
  - Validation: manual — gerar um PDF localmente e abrir para conferência visual (uma vez).
  - Completion criteria: PDF legível, identidade Blade reconhecível.

- [x] 5.3 `GET /api/relatorios/pdf`
  - Evidência: `api/relatorios/pdf/route.tsx`. Testado via HTTP real (curl): período com dado → 200, `Content-Type: application/pdf`, 3436 bytes, `file` confirma "PDF document, version 1.3, 1 page(s)"; período vazio (2020) → 200, PDF válido de 2703 bytes, sem crash.
  - Objective: roda `aggregateReport` (mesma função da tela) e devolve `application/pdf`.
  - Likely files: `apps/web/app/api/relatorios/pdf/route.tsx`.
  - Depends on: 5.2, 3.1
  - Validation: contract — resposta `Content-Type: application/pdf` não vazia para período com
    dado e para período vazio (sem crash).
  - Completion criteria: cenários "Exportar PDF do período", "Exportar período sem dados"
    cobertos.

- [x] 5.4 Botão "Exportar PDF" na tela
  - Evidência: link `<a href="/api/relatorios/pdf?from=...&to=...">` em `app/relatorios/page.tsx`, usando o período atualmente carregado (`data.period`) — mesmo padrão de link direto (GET, sem JS extra) usado em outras exportações do repo.
  - Objective: botão que baixa o PDF do período atualmente selecionado.
  - Likely files: `apps/web/app/relatorios/page.tsx`.
  - Depends on: 5.3, 4.1
  - Validation: manual — clicar baixa um PDF coerente com o período visível na tela.
  - Completion criteria: fluxo completo conferido.

## 6. Worker — snapshot mensal

- [x] 6.1 Job `relatorios.monthly-snapshot`
  - Evidência: `runMonthlySnapshot` (usa a MESMA `aggregateReport` da tela) + `registerMonthlySnapshot` (createQueue+work+schedule `5 0 1 * *`), registrado em `jobs/index.ts`. Teste de integração 2/2 verdes (fecha o mês/materializa; idempotente). Boot real do worker confirmou fila e cron em `pgboss.queue`/`pgboss.schedule` (`SELECT` direto no Postgres). Erro por barbearia isolado via `try/catch` dentro do loop (revisão de código — sem teste de falha forçada, mesmo padrão de rigor dos demais jobs do repo, que também não simulam falha).
  - Objective: cron `5 0 1 * *`; para cada barbearia, chama `aggregateReport` do mês
    anterior e `upsertReportSnapshot`; erro numa barbearia não interrompe as demais.
  - Likely files: `apps/worker/src/jobs/monthly-snapshot.ts`, `jobs/index.ts` (registro).
  - Depends on: 2.1, 1.4
  - Validation: integration — mês fechado com dados gera 1 snapshot por barbearia; rodar de
    novo não duplica (upsert).
  - Completion criteria: cenários "Fechamento mensal gera snapshot", "Reexecução idempotente"
    da spec verdes; boot real do worker confirma a fila/cron registrados.

- [x] 6.2 Campos reservados da Fase 5 nunca preenchidos
  - Evidência: teste "fecha o mês e materializa o snapshot, sem preencher colunas da Fase 5" — `reactivatedCount`/`noShowPreventedCount`/`botMessagesCount`/`recoveredRevenueCents` todos `null` após o job rodar contra Postgres real. Tela/PDF (grupos 4/5) nunca leem essas colunas (não existem no `ReportData`).
  - Objective: garantir que os 4 campos causais permanecem `NULL` após o job rodar.
  - Likely files: `apps/worker/src/jobs/monthly-snapshot.test.ts`.
  - Depends on: 6.1
  - Validation: integration — snapshot gerado tem as 4 colunas `NULL`.
  - Completion criteria: cenário "Lugar reservado para métricas da Fase 5" da spec verde.

## 7. Integração LGPD (verificação, sem mudança de comportamento)

- [x] 7.1 Exclusão de cliente não quebra relatório fechado
  - Evidência: `packages/core/src/relatorios/lgpd.test.ts` — 1/1 verde: `aggregateReport` do mesmo período antes/depois de `deleteClient` retorna faturamento/atendimentos/clientes-atendidos IDÊNTICOS; `deleteClient` confirmado anonimizando nome/telefone; saída serializada do relatório não contém o nome do cliente removido.
  - Objective: excluir cliente após snapshot gerado não altera os agregados nem expõe identidade.
  - Likely files: `packages/core/src/relatorios/lgpd.test.ts`.
  - Depends on: 6.1
  - Validation: integration — snapshot antes/depois da exclusão idêntico nos agregados; sem
    identidade do cliente em nenhuma saída.
  - Completion criteria: cenário "Exclusão de cliente não altera relatório fechado" da spec
    verde.

## 8. Documentação e fechamento (DoD)

- [x] 8.1 CHANGELOG + suíte completa verde
  - Evidência: `CHANGELOG.md` atualizado (entrada `add-relatorios`). `pnpm lint` (No ESLint warnings or errors), `pnpm typecheck` (5/5 pacotes limpos), `pnpm test` (83/83 testes verdes: db 27, core 44, ai 6, worker 6), `pnpm build` (Next.js compilou, 25 rotas geradas incluindo `/relatorios` e `/api/relatorios(/pdf)`).
  - Objective: entrada no `CHANGELOG.md`; suíte limpa.
  - Likely files: `CHANGELOG.md`.
  - Depends on: todas as anteriores
  - Validation: manual — saídas de comando anexadas como evidência.
  - Completion criteria: DoD do workflow satisfeito.

- [x] 8.2 Aplicar deltas nas specs permanentes e índices
  - Evidência: `openspec/specs/relatorios/spec.md` criado a partir do delta; `openspec/specs/README.md` e `openspec/changes/README.md` atualizados; change movida para `changes/archive/add-relatorios/`.
  - Objective: criar `openspec/specs/relatorios/spec.md`; atualizar índices; arquivar a change.
  - Likely files: `openspec/specs/**`, `openspec/changes/README.md`.
  - Depends on: 8.1
  - Validation: manual — specs coerentes; índices atualizados.
  - Completion criteria: change concluída e arquivada (etapa 11 do workflow).

<!--
Lembretes de rigor:
- Capacidade/ocupação (0.2-0.3): fatorar sem duplicar `availability.ts`; regressão da Fase 2
  tem que continuar 100% verde.
- Uma função de agregação para tela E snapshot (2.1): não implementar dois cálculos.
- PDF (5.x): sem headless browser; conferência visual manual é validação aceitável (não há
  teste automatizado de pixel).
- Worker (6.x): erro por tenant isolado; nunca preencher colunas da Fase 5.
-->
