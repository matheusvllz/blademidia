# Delta for crm-clientes

> A capability `crm-clientes` já existe (Fase 1). Este delta descreve como ela **evolui** com
> a Fase 2. Na conclusão da change, estes deltas são aplicados a
> `openspec/specs/crm-clientes/spec.md`. Comportamento observável apenas.

## MODIFIED Requirements

### Requirement: Registro de atendimento (histórico)
O sistema SHALL permitir registrar um atendimento realizado para um cliente, com serviço,
data e barbeiro responsável, mantendo o histórico completo e ordenado cronologicamente. O
serviço e o barbeiro SHALL poder referenciar o catálogo da barbearia (`agendamento`) quando
existir, mantendo compatibilidade com atendimentos antigos registrados em texto livre.

Previously: serviço e barbeiro eram exclusivamente texto livre (`service_label`/`staff_label`),
sem catálogo.

#### Scenario: Atendimento a partir do catálogo
- GIVEN uma barbearia com serviços e barbeiros cadastrados na agenda
- WHEN um atendimento é registrado escolhendo um serviço e um barbeiro do catálogo
- THEN o atendimento SHALL referenciar o serviço e o barbeiro do catálogo
- AND SHALL aparecer no histórico do cliente como hoje

#### Scenario: Atendimento antigo em texto livre
- GIVEN um atendimento registrado na Fase 1 apenas com texto livre de serviço
- WHEN o histórico do cliente é exibido
- THEN o atendimento antigo SHALL continuar aparecendo normalmente, sem exigir vínculo com o
  catálogo

### Requirement: Exclusão de cliente (LGPD)
O sistema SHALL permitir que o barbeiro-dono exclua um cliente a pedido, removendo os dados
pessoais identificáveis e preservando os totais agregados de histórico/relatório já fechados
de forma anonimizada. A exclusão SHALL também tratar os agendamentos futuros do cliente,
cancelando-os e desvinculando a identidade removida.

Previously: a exclusão tratava apenas cliente, visitas e valores agregados; agendamentos não
existiam.

#### Scenario: Exclusão a pedido do titular
- GIVEN um cliente cadastrado com histórico de atendimentos
- WHEN o barbeiro exclui esse cliente a pedido do titular dos dados
- THEN o sistema SHALL remover nome e telefone identificáveis
- AND SHALL preservar os valores agregados de atendimento/transação de forma anonimizada

#### Scenario: Exclusão de cliente com agendamento futuro
- GIVEN um cliente com um ou mais agendamentos futuros
- WHEN o barbeiro exclui esse cliente
- THEN o sistema SHALL cancelar os agendamentos futuros desse cliente, liberando os horários
- AND SHALL desvincular a identidade removida sem quebrar a visão da agenda nem os agregados

### Requirement: Dashboard com indicadores básicos
O sistema SHALL exibir, num painel único, o número de clientes ativos, o número de clientes
inativos, o ticket médio da barbearia e um resumo da agenda do dia (agendamentos de hoje e
faltas recentes).

Previously: o dashboard exibia apenas ativos, inativos e ticket médio, sem qualquer visão de
agenda.

#### Scenario: Barbearia com agenda no dia
- GIVEN uma barbearia com agendamentos para hoje
- WHEN o barbeiro abre o dashboard
- THEN o sistema SHALL exibir, além dos indicadores da Fase 1, um resumo dos agendamentos de
  hoje e a contagem de faltas recentes

#### Scenario: Barbearia sem agenda configurada
- GIVEN uma barbearia sem barbeiros/serviços/agendamentos
- WHEN o barbeiro abre o dashboard
- THEN o sistema SHALL exibir um estado vazio explícito para a agenda, sem erro nem métrica
  quebrada

## ADDED Requirements

### Requirement: Próximo agendamento no perfil do cliente
O sistema SHALL exibir, no perfil do cliente, o próximo agendamento futuro do cliente (data,
serviço, barbeiro) e permitir iniciar um novo agendamento a partir do perfil.

#### Scenario: Cliente com agendamento futuro
- GIVEN um cliente com um agendamento futuro
- WHEN o barbeiro abre o perfil desse cliente
- THEN o sistema SHALL exibir o próximo agendamento com data, serviço e barbeiro

#### Scenario: Cliente sem agendamento futuro
- GIVEN um cliente sem nenhum agendamento futuro
- WHEN o barbeiro abre o perfil
- THEN o sistema SHALL exibir um estado vazio explícito e uma ação para agendar
