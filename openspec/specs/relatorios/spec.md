# Capability: relatorios

> Spec permanente — fonte da verdade do comportamento dos relatórios do produto.
> Não editar diretamente: toda mudança passa por uma change (ver [workflow](../../workflow.md)).
>
> Histórico:
> - Fase 3 (núcleo — indicadores operacionais, PDF, snapshot mensal) estabelecida pela change
>   `add-relatorios` (concluída 2026-07-15).
>
> Escopo atual: Fase 3. Esta capability **lê** dados de `crm-clientes` e `agendamento`; não
> altera o comportamento dessas capabilities. Métricas causais do relatório comercial
> prometido no negócio (clientes reativados automaticamente, no-shows evitados por
> confirmação, mensagens respondidas pelo bot, R$ recuperado) dependem estruturalmente da
> Fase 5 (`whatsapp-canal`/`atendimento-ia`/`confirmacao-agendamento`/`reativacao-clientes`,
> ainda não implementada) e **não** estão aqui — esta capability reserva lugar para elas no
> snapshot mensal, sem exibi-las como número real nem como zero enganoso. Envio automático do
> relatório está fora desta fase (acoplado à Fase 5).

## Requirement: Seleção de período
O sistema SHALL permitir consultar os relatórios por um período de datas, oferecendo presets
(mês atual, mês passado, últimos 7 dias, trimestre atual) e um intervalo livre com data inicial
e final, interpretando as fronteiras no fuso America/Sao_Paulo.

#### Scenario: Preset de mês atual
- GIVEN o barbeiro-dono autenticado na barbearia X
- WHEN ele abre os relatórios com o preset "mês atual"
- THEN o sistema SHALL agregar os dados do primeiro ao último dia do mês corrente no fuso
  America/Sao_Paulo
- AND SHALL exibir o rótulo do período selecionado

#### Scenario: Intervalo livre válido
- GIVEN o barbeiro-dono autenticado
- WHEN ele informa um intervalo com data inicial anterior ou igual à data final
- THEN o sistema SHALL agregar os dados nesse intervalo, inclusive nas datas de fronteira

#### Scenario: Intervalo inválido
- GIVEN o barbeiro-dono autenticado
- WHEN ele informa uma data inicial posterior à data final
- THEN o sistema SHALL recusar a consulta com um erro identificando o problema
- AND SHALL NOT executar a agregação

## Requirement: Indicadores operacionais do período
O sistema SHALL calcular, para o período e a barbearia da sessão, o faturamento registrado, o
número de atendimentos realizados, o ticket médio, o número de clientes novos e o número de
clientes atendidos, todos escopados ao `barbershop_id`.

#### Scenario: Período com movimento
- GIVEN uma barbearia com atendimentos e pagamentos registrados no período
- WHEN o barbeiro consulta os indicadores do período
- THEN o sistema SHALL exibir o faturamento como a soma dos valores registrados em `payments_log`
  no período
- AND SHALL exibir o número de atendimentos, o ticket médio (faturamento ÷ atendimentos com
  valor) e a contagem de clientes novos e atendidos

#### Scenario: Atendimentos sem valor informado
- GIVEN um período em que parte dos atendimentos foi registrada sem valor pago
- WHEN o barbeiro consulta os indicadores
- THEN o sistema SHALL excluir os atendimentos sem valor do cálculo do ticket médio
- AND SHALL sinalizar quantos atendimentos ficaram sem valor informado, para que o faturamento
  não seja lido como total absoluto

#### Scenario: Período sem dados
- GIVEN um período sem nenhum atendimento nem pagamento
- WHEN o barbeiro consulta os indicadores
- THEN o sistema SHALL exibir um estado vazio explícito, sem métrica quebrada nem erro

## Requirement: Indicadores da agenda no período
O sistema SHALL calcular, para o período e a barbearia da sessão, a ocupação da agenda, o número
de faltas, o número de cancelamentos e a taxa de comparecimento, a partir dos agendamentos e da
capacidade da grade de trabalho.

#### Scenario: Ocupação e faltas
- GIVEN uma barbearia com grade de trabalho configurada e agendamentos no período
- WHEN o barbeiro consulta os indicadores da agenda
- THEN o sistema SHALL exibir a ocupação como agendamentos atendidos sobre a capacidade da grade
  no período (ex.: "21/45")
- AND SHALL exibir o número de faltas (`faltou`), de cancelamentos e a taxa de comparecimento

#### Scenario: Barbearia sem agenda configurada
- GIVEN uma barbearia sem grade de trabalho nem agendamentos
- WHEN o barbeiro consulta os indicadores da agenda
- THEN o sistema SHALL exibir um estado vazio explícito para a agenda, sem erro nem divisão por
  zero

## Requirement: Rankings do período
O sistema SHALL apresentar, para o período e a barbearia da sessão, o ranking de serviços (por
volume de atendimentos e por receita) e a produção por barbeiro (atendimentos e receita),
escopados ao `barbershop_id`.

#### Scenario: Ranking de serviços
- GIVEN uma barbearia com atendimentos de serviços diferentes no período
- WHEN o barbeiro consulta o ranking de serviços
- THEN o sistema SHALL listar os serviços ordenados por volume e permitir ver a receita de cada
  um

#### Scenario: Produção por barbeiro
- GIVEN uma barbearia com mais de um barbeiro atendendo no período
- WHEN o barbeiro consulta a produção por barbeiro
- THEN o sistema SHALL exibir, por barbeiro, o número de atendimentos e a receita gerada no
  período

## Requirement: Comparação com o período anterior
O sistema SHALL exibir, para os indicadores principais, a variação em relação à janela de mesmo
tamanho imediatamente anterior ao período selecionado.

#### Scenario: Variação vs. período anterior
- GIVEN um período selecionado com dados e uma janela anterior de mesmo tamanho também com dados
- WHEN o barbeiro consulta os indicadores
- THEN o sistema SHALL exibir, para faturamento, atendimentos e faltas, a variação relativa ao
  período anterior (ex.: faturamento +12%)

#### Scenario: Período anterior sem dados
- GIVEN um período selecionado cujo intervalo anterior não tem nenhum dado
- WHEN o barbeiro consulta os indicadores
- THEN o sistema SHALL exibir os indicadores do período sem variação, indicando ausência de base
  de comparação, sem erro

## Requirement: Resumo apresentável e exportação em PDF
O sistema SHALL produzir, para o período selecionado, um resumo apresentável com identidade
visual Blade e SHALL permitir exportá-lo como um arquivo PDF, sem depender de qualquer canal de
envio.

#### Scenario: Exportar PDF do período
- GIVEN um período com dados agregados
- WHEN o operador solicita a exportação do resumo
- THEN o sistema SHALL gerar um PDF com os indicadores do período e a identidade Blade
- AND o PDF SHALL conter apenas dados da barbearia da sessão

#### Scenario: Exportar período sem dados
- GIVEN um período sem dados
- WHEN o operador solicita a exportação
- THEN o sistema SHALL gerar um PDF com o estado vazio explícito, sem erro

## Requirement: Snapshot mensal automático
O sistema SHALL, por meio de uma tarefa agendada no worker, materializar ao fechar cada mês um
snapshot dos indicadores agregados daquele mês por barbearia, de forma idempotente, servindo de
base para consulta histórica e para o envio automático e as métricas causais da Fase 5.

#### Scenario: Fechamento mensal gera snapshot
- GIVEN uma barbearia com movimento num mês encerrado
- WHEN a tarefa agendada de fechamento mensal executa
- THEN o sistema SHALL persistir um snapshot com os indicadores operacionais daquele mês,
  escopado ao `barbershop_id`

#### Scenario: Reexecução idempotente
- GIVEN um mês cujo snapshot já foi gerado para a barbearia
- WHEN a tarefa de fechamento executa novamente para o mesmo mês e barbearia
- THEN o sistema SHALL NOT criar um segundo snapshot para o mesmo mês
- AND SHALL manter os agregados consistentes

#### Scenario: Lugar reservado para métricas da Fase 5
- GIVEN um snapshot mensal materializado na Fase 3
- WHEN se inspecionam as métricas causais (reativados automáticos, no-shows evitados, mensagens
  do bot, R$ recuperado)
- THEN o snapshot SHALL manter esses campos sem valor (não preenchidos) até a Fase 5 alimentá-los
- AND o sistema SHALL NOT exibi-los como número real nem como zero na Fase 3

## Requirement: Isolamento de dados entre barbearias (relatórios)
O sistema SHALL impedir que qualquer indicador, ranking, resumo, PDF ou snapshot de uma
barbearia seja visível ou gerado a partir de dados de outra, em toda operação de leitura ou de
fechamento.

#### Scenario: Consulta cruzada de relatório
- GIVEN dados de relatório da barbearia X
- WHEN um usuário autenticado da barbearia Y consulta relatórios
- THEN o sistema SHALL agregar e exibir apenas dados da barbearia Y
- AND SHALL NOT incluir nenhum dado da barbearia X em indicadores, PDF ou snapshot

## Requirement: Preservação de agregados na exclusão LGPD
O sistema SHALL manter os indicadores e snapshots de períodos já contabilizados mesmo após a
exclusão (LGPD) de um cliente, sem reexpor a identidade removida.

#### Scenario: Exclusão de cliente não altera relatório fechado
- GIVEN um mês com atendimentos de um cliente e um snapshot já materializado
- WHEN esse cliente é excluído a pedido do titular
- THEN os agregados do período (faturamento, atendimentos) SHALL permanecer consistentes
- AND SHALL NOT exibir nome nem telefone do cliente removido em nenhum relatório
