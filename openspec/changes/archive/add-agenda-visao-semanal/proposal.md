# Proposal: Agenda — visão semanal em grade

## Change ID
`add-agenda-visao-semanal`

## Status
Done <!-- Draft | Proposed | Approved | In Progress | In Review | Done | Rejected | Superseded -->

> Aprovada por Vítor em 2026-07-15 (portão da etapa 5 do [workflow](../../workflow.md)).
> Implementada por completo na branch `feature/add-agenda-visao-semanal` (6 grupos do
> `tasks.md`, todos com evidência), depois de `add-relatorios` ter fatorado
> `packages/core/agenda/capacity.ts` (ADR-0010). Deltas aplicados a
> `openspec/specs/agendamento/spec.md` em 2026-07-15; change arquivada. Decisões de escopo em
> [exploration.md](./exploration.md), "Decisões da discussão".

## Context

A Fase 2 (`add-agendamento`) entregou a agenda com a visão por dia e por semana organizada por
barbeiro. Esta change adiciona uma **visão semanal em grade** (dias × horários) como layout
alternativo, consolidável por todos os barbeiros e clicável, sem alterar as regras de
agendamento existentes.

## Problem

A visão por barbeiro não dá a leitura imediata de "como está minha semana — cheia ou com
buracos?". Uma grade dias×horários com ocupação agregada comunica isso num olhar e, se
clicável, vira o ponto natural para preencher horários vazios sem trocar de tela.

## Goals

- Adicionar uma visão semanal em grade (dias como colunas, horários como linhas) com os
  agendamentos posicionados por célula, mostrando cliente, serviço e estado.
- Permitir alternar a grade entre **todos os barbeiros** (consolidado) e **um barbeiro** (com
  seletor), e navegar entre semanas.
- Exibir a **ocupação da semana** no rodapé (ex.: "21/45 · 47%"), com a mesma definição da
  capability `relatorios`.
- Tornar a grade um ponto de ação: clicar célula vazia inicia um agendamento naquele horário;
  clicar num card abre o agendamento — reusando integralmente o fluxo da Fase 2.

## Non-Goals

- Qualquer regra de agendamento nova (disponibilidade, sobreposição, ciclo de vida seguem da
  Fase 2, inalteradas).
- Substituir as visões de dia e de semana-por-barbeiro atuais (esta é **adicional**).
- Arrastar-e-soltar para remarcar; auto-agendamento pelo cliente final (Fase 5).
- Nova tabela, migração de dados ou qualquer chamada externa.

## Users / Actors Impacted

- **Barbeiro-dono** — usuário primário da nova visão.
- **Barbeiro (recurso)** — filtrável no modo "um barbeiro"; não acessa o sistema.
- **AgendaService (domínio)** — fonte única das leituras/ações, sem caminho paralelo.

## Scope

### In scope
- `apps/web`: nova visão semanal em grade na tela de agenda, com toggle todos/um barbeiro,
  navegação de semana, ocupação no rodapé, e as ações clicar-para-criar / clicar-para-abrir.
- `core`: uma função única de capacidade/ocupação, compartilhada com `relatorios`; leitura
  semanal agregada da agenda via `AgendaService` (se ainda não exposta).

### Out of scope
- Tudo em Non-Goals; qualquer mudança de schema; qualquer alteração das regras da Fase 2.

## Business Rules

- Escopo por `barbershop_id` em toda leitura/ação; a grade nunca mistura tenants.
- Fuso America/Sao_Paulo define os limites de dia e da semana exibida.
- A criação a partir da célula reusa as regras de agendamento da Fase 2, sem exceção.
- No modo consolidado, a célula agrega os agendamentos de todos os barbeiros exibidos; a
  ocupação agrega o mesmo conjunto.
- Ocupação = mesma definição de `relatorios`; função única no `core`.

## Affected Capabilities
- `agendamento` (modificada — requisito "Visão da agenda" estendido; ocupação e ação na grade
  adicionadas).
- `relatorios` — compartilha a definição de ocupação (sem dependência de escopo bloqueante).

## Expected Impact

### Code
- `apps/web`: componente de grade semanal + toggle + navegação + integração com o fluxo de
  criação/detalhe existente.
- `core`: função de capacidade/ocupação; possivelmente uma leitura semanal agregada no
  `AgendaService`.

### Data
- Nenhuma. Sem tabela nova, sem migração.

### APIs / Contracts
- Possível endpoint interno de leitura semanal agregada (tenant-scoped, session-guarded), se a
  leitura atual não cobrir. Sem contrato externo.

### Integrations
- Nenhuma.

### Operations
- Nenhuma mudança operacional (sem novo processo, sem novo custo).

### Security / Privacy (LGPD)
- Exibe os mesmos dados de agenda que a Fase 2 já mostra, escopados ao tenant. Sem novo dado
  pessoal exposto; sem log de telefone/conteúdo.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Criar no modo "todos os barbeiros" sem barbeiro definido | Médio | Exigir escolha do barbeiro no clique (ou permitir criação só no modo "um barbeiro") — design |
| Ocupação divergir da de `relatorios` | Médio | Função única de capacidade/ocupação no `core` |
| Duplicar leitura da agenda em vez de reusar `AgendaService` | Médio | Consumir a camada de domínio existente |
| Faixa de dias/horas não refletir a realidade (sábado) | Médio | Derivar dias/horas da grade de trabalho, não fixo seg–sex |

## Success Criteria

- A visão semanal em grade exibe a semana (dias × horários) com os agendamentos posicionados,
  cliente/serviço/estado visíveis, escopada ao tenant.
- O toggle alterna entre todos os barbeiros e um barbeiro; a navegação muda a semana.
- A ocupação no rodapé bate com a definição de `relatorios` (mesma função no `core`).
- Clicar célula vazia inicia um agendamento com dia/horário preenchidos e aplica as regras da
  Fase 2; clicar num card abre o agendamento.
- Semana vazia mostra grade vazia explícita com ocupação zerada, sem erro.
- As visões de dia e de semana-por-barbeiro existentes continuam funcionando.
- Isolamento de tenant testado; suíte completa verde; `pnpm build`/`typecheck` limpos.

## Assumptions

- A grade exibe os dias com expediente configurado (inclui sábado quando houver grade); a faixa
  de horas deriva da grade de trabalho; passo conforme a configuração da agenda.
- Volume pequeno por tenant → render e leitura sob demanda, sem cache dedicado.

## Open Questions

- Criação no modo consolidado: pedir barbeiro no clique ou habilitar só no modo "um barbeiro"?
  → design (recomendação: pedir no ato).
- Semana exibida: seg–sáb, seg–dom ou dinâmica pela grade? → design (recomendação: dinâmica).
- Registrar a change nos índices `openspec/changes/README.md` / `specs/README.md` na conclusão.
