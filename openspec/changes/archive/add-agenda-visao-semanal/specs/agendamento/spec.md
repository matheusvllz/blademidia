# Capability: agendamento (delta — change `add-agenda-visao-semanal`)

> Delta de spec proposto pela change `add-agenda-visao-semanal`. Ao concluir (etapa 11), o
> requisito MODIFIED substitui o correspondente na spec permanente
> `openspec/specs/agendamento/spec.md`, e os requisitos ADDED são acrescentados a ela.
>
> Esta change não altera nenhuma regra de agendamento (disponibilidade, sobreposição, ciclo de
> vida) — apenas a apresentação da agenda e o ponto de entrada da criação.

## MODIFIED Requirements

### Requirement: Visão da agenda
O sistema SHALL exibir a agenda em mais de uma visão — por dia, por semana organizada por
barbeiro, e em uma **grade semanal** com os dias como colunas e os horários como linhas —
mostrando os agendamentos com cliente, serviço, horário e estado, escopada à barbearia da
sessão. A grade semanal SHALL permitir alternar entre exibir **todos os barbeiros**
(consolidado) e **um barbeiro** selecionado, e navegar para a semana anterior e seguinte. As
faixas de dias e horários exibidas SHALL derivar da grade de trabalho configurada da barbearia,
no fuso America/Sao_Paulo.

#### Scenario: Agenda do dia com agendamentos
- GIVEN uma barbearia com barbeiros e agendamentos num dia
- WHEN o barbeiro abre a agenda daquele dia
- THEN o sistema SHALL exibir, por barbeiro, os agendamentos posicionados no horário, com o
  estado visível

#### Scenario: Grade semanal consolidada (todos os barbeiros)
- GIVEN uma barbearia com mais de um barbeiro e agendamentos na semana
- WHEN o barbeiro abre a visão em grade semanal no modo "todos os barbeiros"
- THEN o sistema SHALL posicionar cada agendamento na célula do seu dia e horário, mostrando
  cliente e serviço
- AND uma célula com agendamentos simultâneos de barbeiros diferentes SHALL exibir todos eles

#### Scenario: Grade semanal de um barbeiro
- GIVEN a visão em grade semanal aberta
- WHEN o barbeiro seleciona o modo "um barbeiro" e escolhe um barbeiro
- THEN o sistema SHALL exibir apenas os agendamentos daquele barbeiro na semana

#### Scenario: Navegação entre semanas
- GIVEN a visão em grade semanal exibindo uma semana
- WHEN o barbeiro navega para a semana anterior ou seguinte
- THEN o sistema SHALL exibir os agendamentos e a ocupação da nova semana

#### Scenario: Semana ou dia sem agendamentos
- GIVEN um dia ou uma semana sem nenhum agendamento
- WHEN o barbeiro abre a respectiva visão
- THEN o sistema SHALL exibir um estado vazio explícito (grade vazia com ocupação zerada), não
  um erro

## ADDED Requirements

### Requirement: Indicador de ocupação na grade semanal
O sistema SHALL exibir, na grade semanal, a ocupação da semana visível — os agendamentos
atendidos/ativos sobre a capacidade da grade de trabalho no período — usando a mesma definição
de ocupação da capability `relatorios`.

#### Scenario: Ocupação da semana
- GIVEN uma semana com agendamentos e uma grade de trabalho configurada
- WHEN o barbeiro abre a grade semanal
- THEN o sistema SHALL exibir a ocupação como uma razão e um percentual (ex.: "21/45 · 47%")
- AND o valor SHALL refletir o modo selecionado (todos os barbeiros ou o barbeiro filtrado)

#### Scenario: Ocupação sem capacidade configurada
- GIVEN uma barbearia sem grade de trabalho configurada
- WHEN o barbeiro abre a grade semanal
- THEN o sistema SHALL exibir a ocupação como indisponível, sem divisão por zero nem erro

### Requirement: Ação a partir da grade semanal
O sistema SHALL permitir iniciar a criação de um agendamento ao acionar uma célula livre da
grade — pré-preenchendo dia e horário — e abrir o agendamento existente ao acionar o seu card,
reutilizando o fluxo de criação e o detalhe de agendamento já existentes, sem introduzir regra
de agendamento nova.

#### Scenario: Criar a partir de célula livre
- GIVEN a grade semanal aberta
- WHEN o barbeiro aciona uma célula sem agendamento
- THEN o sistema SHALL abrir a criação de agendamento com o dia e o horário daquela célula
  pré-preenchidos
- AND SHALL aplicar as mesmas validações de disponibilidade, sobreposição, grade e passado da
  criação normal

#### Scenario: Criar no modo consolidado exige barbeiro
- GIVEN a grade semanal no modo "todos os barbeiros"
- WHEN o barbeiro aciona uma célula livre para criar
- THEN o sistema SHALL exigir a escolha do barbeiro antes de gravar o agendamento

#### Scenario: Abrir agendamento existente
- GIVEN uma célula com um agendamento
- WHEN o barbeiro aciona o card do agendamento
- THEN o sistema SHALL abrir o detalhe/ações desse agendamento (confirmar, concluir, remarcar,
  cancelar, marcar falta), como na visão atual

#### Scenario: Escopo de tenant preservado na ação
- GIVEN um agendamento pertencente à barbearia X
- WHEN um usuário da barbearia Y tenta abri-lo pela grade
- THEN o sistema SHALL retornar "não encontrado", sem expor nem alterar o dado do outro tenant
