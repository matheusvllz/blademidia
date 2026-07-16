# Proposal: Relatórios (Produto — Fase 3)

## Change ID
`add-relatorios`

## Status
Done <!-- Draft | Proposed | Approved | In Progress | In Review | Done | Rejected | Superseded -->

> Aprovada por Vítor em 2026-07-15 (portão da etapa 5 do [workflow](../../workflow.md)).
> Implementada por completo na branch `feature/add-relatorios` (9 grupos do `tasks.md`, todos
> com evidência — código, 83 testes automatizados e verificação via HTTP real/PDF real
> conferido visualmente/boot real do worker contra Postgres). Deltas aplicados às specs
> permanentes em 2026-07-15 (`openspec/specs/relatorios/spec.md` novo); change arquivada.
> Decisões de escopo em [exploration.md](./exploration.md), seção "Decisões da discussão".

## Context

O produto entregou a Fase 1 (`add-crm-clientes`) e a Fase 2 (`add-agendamento`): há um CRM com
histórico e financeiro por visita, uma agenda operável com ciclo de vida completo (incluindo
`faltou`), e um worker com pg-boss já em produção. O roadmap define a **Fase 3 = `relatorios`**.
Esta change realiza a Fase 3.

## Problem

Os dados acumulados (atendimentos, faturamento registrado, agendamentos, faltas, catálogo) não
viram **leitura de resultado**. O barbeiro não tem a visão do período (faturamento, ocupação,
faltas, rankings, evolução vs. mês anterior), e a Blade não tem a **peça de resultado** que
sustenta a mensalidade na renovação. O dashboard atual mostra o *agora*, não o *período*.

## Constraint estrutural (decisão de escopo central)

As 4 métricas do relatório mensal *comercial* prometido (reativados automaticamente, no-shows
evitados por confirmação, mensagens do bot, R$ recuperado) dependem da **Fase 5** (mensageria +
IA), que não existe. Por decisão de Vítor, a Fase 3 entrega os relatórios **operacionais** que
os dados de hoje sustentam e deixa a **fundação de snapshot** pronta para a Fase 5 preencher as
métricas causais e fazer o envio automático — sem prometer nem exibir como zero enganoso o que
ainda não pode medir. Ver [exploration.md](./exploration.md), "O achado crítico".

## Goals

- Dar ao barbeiro uma leitura de negócio por período: faturamento, atendimentos, ticket médio,
  ocupação da agenda, faltas/comparecimento, clientes novos, rankings de serviço e barbeiro, e
  a variação vs. o período anterior.
- Selecionar o período por presets (mês atual, mês passado, semana, trimestre) e por intervalo
  livre.
- Produzir um **resumo apresentável** e sua **exportação em PDF** com identidade Blade (peça de
  retenção), independente de qualquer canal.
- Materializar um **snapshot mensal** por barbearia (job cron no worker), base para o envio
  automático e as métricas causais da Fase 5.
- Preservar escopo de tenant e tratamento LGPD de agregados em tudo que for novo.

## Non-Goals

- Métricas causais da Fase 5 (reativados automáticos, no-show evitado, mensagens do bot, R$
  recuperado) — apenas lugar reservado no snapshot, sem exibição.
- Qualquer **envio automático** ou integração de canal (WhatsApp/e-mail) — acoplado à Fase 5
  por decisão de Vítor.
- Qualquer chamada externa ou custo de runtime novo além do orçamento D4.
- Fechamento contábil/fiscal; conciliação de caixa; dashboards configuráveis pelo usuário;
  exportação em CSV/Excel.
- Acesso cross-tenant do operador Blade à peça de retenção (pertence a `auth-tenancy`).

## Users / Actors Impacted

- **Barbeiro-dono** — usuário primário da tela de relatórios (gestão do próprio negócio).
- **Operador Blade** — usa o resumo/PDF como peça de retenção (nesta fase, na sessão do tenant).
- **Worker (sistema)** — gera o snapshot mensal por cron.
- **Fase 5 (futuro)** — consumidora do snapshot (métricas causais + envio automático).
- **Cliente final** — apenas como agregado anonimizável (LGPD), nunca usuário.

## Scope

### In scope
- Capability nova `relatorios`: agregações operacionais por período escopadas ao tenant, sobre
  `visits`, `payments_log`, `appointments`, `clients`, `barbers`, `services` e a capacidade da
  grade (`work_schedules` via `AgendaService`).
- Tela de relatórios no painel (identidade Blade) com seletor de período (presets + intervalo
  livre) e comparação com o período anterior.
- Resumo apresentável + exportação PDF do período.
- Snapshot mensal persistido, gerado por job cron no worker (pg-boss), com estrutura extensível
  para as métricas causais da Fase 5.
- Estado vazio explícito (barbearia nova / período sem dados) e sinalização de qualidade de
  dado (atendimentos sem valor informado).
- Teste de isolamento de tenant para toda leitura/escrita nova.

### Out of scope
- Tudo em Non-Goals; qualquer envio; qualquer chamada externa; retrofit de histórico legado.

## Business Rules

- `barbershop_id` escopa toda consulta/tabela nova (ADR-0007), com teste de isolamento.
- Fuso America/Sao_Paulo define fronteiras de dia/mês; armazenamento `timestamptz`.
- Faturamento = registrado em `payments_log`; o relatório sinaliza atendimentos sem valor.
- Métricas dependentes da Fase 5 SHALL NOT ser exibidas como número real ou zero enganoso.
- UI no vocabulário do barbeiro; nenhuma copy afirma causalidade que a fase não mede.
- Nenhum provedor externo é chamado; nenhum envio automático nesta fase.

## Affected Capabilities
- `relatorios` (nova).
- `crm-clientes`, `agendamento` — **lidas**, sem mudança de comportamento (esta change não
  altera as specs delas; apenas consome seus dados).
- Preparadas, não implementadas: `whatsapp-canal`, `atendimento-ia`, `confirmacao-agendamento`,
  `reativacao-clientes` (Fase 5, consumidoras do snapshot).

## Expected Impact

### Code
- Novo `packages/core` (ou módulo) de agregação de relatórios: funções puras de cálculo +
  repositório de leitura tenant-scoped.
- `apps/web`: rota(s) de API interna (session-guarded, tenant-scoped) + tela de relatórios +
  geração/exportação PDF.
- `apps/worker`: novo job cron `relatorios.monthly-snapshot`.
- `packages/db`: nova tabela de snapshot + repositório tenant-scoped.

### Data
- Nova tabela (ex.: `report_snapshots`) com agregados do mês fechado por barbearia e colunas/
  estrutura reservadas para métricas causais da Fase 5 (nulas até lá). Migração Drizzle. Sem
  alteração destrutiva em tabelas existentes.

### APIs / Contracts
- REST interno para consultar agregados por período e para o resumo apresentável. Sem contrato
  externo. Estrutura do snapshot documentada no design como o contrato que a Fase 5 preencherá.

### Integrations
- Nenhuma integração externa ativa. Seam: snapshot como ponto de acoplamento da Fase 5 (envio +
  métricas causais).

### Operations
- Novo job cron no worker já existente (mesmo Postgres, mesma imagem). Sem novo processo.
  Runbook atualizado com a periodicidade do snapshot.

### Security / Privacy (LGPD)
- Relatórios expõem **agregados**, não listas de dados pessoais além do que o CRM já mostra.
  Snapshot guarda agregados anonimizáveis; exclusão de cliente (regra já existente em
  `crm-clientes`) preserva os agregados sem vínculo com a identidade removida. Logs do worker
  sem telefone/conteúdo, com `tenant_id` e correlação.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Relatório operacional confundido com "prova do valor do bot" (Fase 5) | Alto | Distinção explícita na exploração/copy; snapshot separa operacional de causal; peça da Blade não afirma causalidade |
| Faturamento subestimado por valor não registrado | Alto | Sinalizar "N atendimentos sem valor"; não apresentar como total absoluto sem ressalva |
| Cálculo de ocupação errado (grade/fuso/exceções) | Médio | Reusar `AgendaService`; testes de capacidade |
| PDF trazer dependência pesada/custosa | Médio | Geração leve HTML→PDF, decidir no design; zero serviço externo pago (D4) |
| Escopo inflar para dashboards configuráveis | Médio | Non-Goals explícitos; período fixo por presets + intervalo |

## Success Criteria

- O barbeiro seleciona um período e vê faturamento, atendimentos, ticket médio, ocupação,
  faltas/comparecimento, clientes novos e rankings, com variação vs. o período anterior.
- Barbearia nova / período sem dados exibem estado vazio explícito, sem métrica quebrada.
- Atendimentos sem valor informado são sinalizados; o faturamento não é apresentado como
  absoluto sem essa ressalva.
- O resumo do período é exportável em PDF apresentável com identidade Blade.
- O worker fecha o mês e persiste o snapshot; rodar de novo não duplica o snapshot do mês.
- Nenhuma métrica causal da Fase 5 aparece como número real ou zero enganoso.
- Testes de isolamento de tenant passam para toda leitura/escrita nova; 0 ocorrências de
  "churn"/"no-show"/"conversão" nas telas; suíte completa verde; `pnpm build`/`typecheck`
  limpos; nenhuma chamada externa (custo dentro de D4).

## Assumptions

- Faturamento/ticket derivam de `payments_log` (registro), como na Fase 1.
- Volume pequeno por tenant → agregação sob demanda para consulta; snapshot só do mês fechado.
- Worker/pg-boss da Fase 2 hospeda o job de snapshot.
- "Período anterior" = janela de mesmo tamanho imediatamente anterior.

## Open Questions

- Definição fina de "ocupação" (capacidade = blocos da grade vs. meta configurável) → design,
  padrão = blocos da grade.
- Retenção do histórico de snapshot (nº de meses) → design/operacional.
- Registrar a change no índice `openspec/changes/README.md` e atualizar
  `openspec/specs/README.md` na conclusão (etapa 11) — pendente até a aprovação.
