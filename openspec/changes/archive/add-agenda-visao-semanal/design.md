# Design: Agenda — visão semanal em grade

## Context

A Fase 2 entregou `/agenda` com visão por dia e por semana organizada por barbeiro
(`AgendaCalendar`, `AgendaDayColumn`, `AppointmentBlock`), consumindo `AgendaService` e a rota
`GET /api/appointments?from=&to=&barberId=`. Esta change adiciona um layout novo à mesma tela —
não recria a busca de dados, só a apresentação e o ponto de ação. Depende de
`packages/core/agenda/capacity.ts`, fatorado pela change `add-relatorios` (ver ADR-0010) — por
isso esta change deve ser implementada **depois** de `add-relatorios` (ou, no mínimo, depois da
tarefa 0.2/0.3 daquela).

## Goals and Constraints

### Goals
- Grade dias×horários como visão adicional, sem tocar nas visões existentes.
- Reusar `computeOccupancy` (mesma função de `relatorios`) para o indicador do rodapé.
- Clicar célula vazia/card reusa o `AppointmentForm`/`AppointmentDetailPanel` já existentes —
  nenhuma regra de agendamento nova.

### Constraints
- **Dependência declarada**: requer `packages/core/agenda/capacity.ts` (de `add-relatorios`).
  Se `add-relatorios` ainda não estiver implementada, a tarefa 0.1 desta change deve fatorar a
  função ela mesma (ver `tasks.md`, nota na tarefa 0.1) — o achado do ADR-0010 é o mesmo,
  qualquer uma das duas changes pode nascer primeiro, a outra reusa.
- **D5 / ADR-0007**: nenhuma leitura nova ignora `barbershopId`.
- Nenhuma tabela, migração ou chamada externa.

## Proposed Architecture

```text
apps/web/
  app/agenda/page.tsx              # +toggle de visão (dia | semana-por-barbeiro | grade)
  components/
    AgendaWeekGrid.tsx             # NOVO — grade dias×horários
    AgendaWeekGridCell.tsx         # NOVO — célula (1+ cards ou vazia, clicável)
    AgendaOccupancyBadge.tsx       # NOVO — "21/45 · 47%"
    AppointmentForm.tsx            # reusado (recebe dia/horário pré-preenchidos)
    AppointmentDetailPanel.tsx     # reusado (abre a partir do card)
```

Nenhuma rota de API nova é estritamente necessária: `GET /api/appointments?from=&to=` (sem
`barberId`) já retorna os agendamentos da semana para todos os barbeiros (Fase 2); o modo "um
barbeiro" filtra client-side ou reusa o mesmo endpoint com `barberId`. A ocupação usa uma nova
leitura fina de `computeOccupancy` exposta via API (ver abaixo).

## Technical Decisions

### Decision 1: Grade consome os mesmos dados da visão semanal atual
- Decision: `AgendaWeekGrid` recebe a mesma lista de agendamentos que `AgendaCalendar` já busca
  (`GET /api/appointments?from=&to=`); a diferença é só o layout de renderização (matriz
  dia×horário em vez de colunas por barbeiro).
- Rationale: evita rota duplicada e garante que os dois layouts nunca divirjam nos dados
  exibidos.
- Trade-offs: nenhum — é reuso direto.

### Decision 2: Ocupação via nova rota fina `GET /api/agenda/occupancy`
- Decision: pequena rota que chama `computeOccupancy(barbershopId, from, to, barberId?)` e
  retorna `{ occupied, capacity }`.
- Rationale: `computeOccupancy` é `packages/core`, não deve ser chamada do client; uma rota
  fina e dedicada é mais simples que sobrecarregar a rota de `appointments`.
- Trade-offs: mais uma rota pequena — aceitável, escopo mínimo.

### Decision 3: Criação no modo consolidado exige barbeiro antes de gravar
- Decision: ao clicar célula vazia no modo "todos os barbeiros", `AppointmentForm` abre com
  dia/horário preenchidos e o campo barbeiro **obrigatório e vazio** (mesmo form da Fase 2, que
  já valida barbeiro obrigatório) — nenhuma lógica nova, só o pré-preenchimento parcial.
- Rationale: resposta de Vítor ao ponto em aberto da exploração; a solução mais simples é não
  inventar um sub-fluxo — o form já exige barbeiro, só não o pré-preenche no modo consolidado.
- Trade-offs: nenhum.

### Decision 4: Dias e horas da grade derivam da grade de trabalho, não fixos
- Decision: `AgendaWeekGrid` calcula a faixa de dias (quais dias têm ao menos um barbeiro com
  expediente) e a faixa de horas (menor início, maior fim) a partir dos dados de
  `work_schedules` já carregados para a semana — mesma fonte que `capacity.ts` usa.
- Rationale: evita grade fixa "seg–sex 09–18" que não bate com barbearias que trabalham sábado
  ou têm expediente diferente.
- Trade-offs: se nenhum barbeiro tem grade configurada, a faixa fica vazia — tratado como
  estado vazio explícito (Scenario da spec).

## Alternatives Considered

### Alternative 1: Reaproveitar `AgendaCalendar` com um prop de layout
- Description: um único componente com `layout: "colunas" | "grade"`.
- Why not chosen: os dois layouts têm estrutura de DOM/CSS suficientemente diferente (colunas
  por barbeiro vs. matriz dia×hora) que forçar num componente só complicaria mais do que dois
  componentes pequenos e focados, cada um consumindo os mesmos dados.

## Affected Components

| Component | Change | Reason |
|---|---|---|
| `packages/core/agenda/capacity.ts` | Consumido (não modificado aqui — origem em `add-relatorios`) | Decision 1/2 |
| `apps/web/app/api/agenda/occupancy/route.ts` (novo) | Rota fina de ocupação | Decision 2 |
| `apps/web/components/AgendaWeekGrid.tsx` (novo) | Grade dias×horários | Goal principal |
| `apps/web/components/AgendaWeekGridCell.tsx` (novo) | Célula clicável | Interatividade |
| `apps/web/components/AgendaOccupancyBadge.tsx` (novo) | Indicador "21/45 · 47%" | Goal |
| `apps/web/app/agenda/page.tsx` | +toggle de visão e de barbeiro | Integração |

## Main Flows

### Flow 1: Ver a semana em grade
1. Barbeiro abre `/agenda`, seleciona a visão "Grade".
2. Busca agendamentos da semana (mesma rota da visão atual) + ocupação (`Decision 2`).
3. Grade renderiza dias (colunas) × horários (linhas), com cards nas células correspondentes.

### Flow 2: Alternar todos/um barbeiro
1. Barbeiro aciona o toggle; no modo "um barbeiro", escolhe o barbeiro num seletor.
2. Grade e ocupação são recalculadas (client-side filtra os agendamentos já carregados; a
   ocupação re-busca com `barberId`).

### Flow 3: Criar a partir de célula vazia
1. Barbeiro clica célula vazia → `AppointmentForm` abre com dia/horário preenchidos (e barbeiro
   preenchido, se o modo era "um barbeiro").
2. Segue o fluxo de criação inalterado da Fase 2 (disponibilidade, conflito, etc.).

### Flow 4: Abrir agendamento existente
1. Barbeiro clica um card → `AppointmentDetailPanel` abre, inalterado da Fase 2.

## Error Flows

- Reusa integralmente os erros já tratados pela Fase 2 (conflito 409, cross-tenant 404,
  transição inválida 409) — esta change não introduz caminho de erro novo, exceto:

### Error Flow 1: Ocupação sem capacidade
1. `GET /api/agenda/occupancy` com capacidade 0 → resposta indica "indisponível" (não erro),
   grade exibe o rodapé como "sem grade configurada".

## API / Contract Design

| Método & rota | Ação |
|---|---|
| `GET /api/agenda/occupancy?from=&to=&barberId=` | `{ occupied, capacity }` do período (barberId opcional) |

Todas as demais interações reusam rotas já existentes da Fase 2
(`/api/appointments`, `/api/availability`).

## Data Model and Persistence

Nenhuma. Sem tabela, sem migração.

## Authentication and Authorization

Reusa a auth existente; nenhuma mudança.

## Security and Privacy

Nenhum dado novo exposto além do que a Fase 2 já mostra na agenda.

## Observability

Nenhum log novo necessário além dos já existentes nas rotas reusadas.

## Testing Strategy

- **Unit**: cálculo da faixa de dias/horas da grade a partir de `work_schedules` variados
  (inclui sábado; inclui barbearia sem grade → faixa vazia).
- **Contract**: `GET /api/agenda/occupancy` — valores corretos; capacidade 0 → indisponível,
  sem erro.
- **E2E (Playwright)**: alternar visão → grade aparece; toggle todos/um barbeiro filtra
  corretamente; clicar célula vazia abre criação com dia/horário preenchidos; criar com sucesso
  faz o card aparecer na grade; clicar card abre detalhe; semana vazia mostra estado vazio.
- **Manual/visual**: screenshot da grade conferindo tokens Blade, legibilidade com muitos
  agendamentos numa célula (modo consolidado).

## Migration Strategy

Nenhuma — sem schema.

## Rollback Plan

Reversível: remover o toggle e os componentes novos; nenhuma tabela para reverter.

## Compatibility

- Visões de dia e semana-por-barbeiro continuam funcionando sem alteração.

## Remaining Risks

| Risk | Impact | Mitigation | Owner/Decision |
|---|---|---|---|
| Densidade visual com muitos agendamentos numa célula (modo consolidado) | Baixo | Revisão visual manual; scroll/overflow na célula se necessário | Dev |
| Dependência de `capacity.ts` de `add-relatorios` não estar pronta ainda | Baixo | Tarefa 0.1 fatora localmente se necessário; ADR-0010 documenta a fonte única, qualquer ordem funciona | Dev |

## Open Questions

Nenhuma remanescente — as duas do proposal (semana exibida, criação no modo consolidado) foram
resolvidas nas Decisions 3 e 4 acima.
