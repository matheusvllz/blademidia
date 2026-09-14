# Capability: crm-clientes

> Spec permanente — fonte da verdade do comportamento do CRM de clientes do produto.
> Não editar diretamente: toda mudança passa por uma change (ver [workflow](../../workflow.md)).
>
> Histórico:
> - Fase 1 (núcleo) estabelecida pela change `add-crm-clientes` (concluída 2026-07-07).
> - Fase 2 (integração com a agenda) estendida pela change `add-agendamento` (concluída
>   2026-07-15): histórico passa a referenciar o catálogo de serviço/barbeiro, exclusão LGPD
>   abrange agendamentos futuros, dashboard ganha agenda de hoje, perfil ganha próximo
>   agendamento.
> - Fase 5 (canal WhatsApp) estendida pela change `add-whatsapp-canal` (concluída
>   2026-09-10): exclusão LGPD passa a anonimizar também as conversas/mensagens de WhatsApp
>   associadas ao cliente.
>
> Escopo atual: Fases 1-2 + delta da Fase 5. Comportamentos de fases futuras (relatório
> mensal, fidelização, atendimento por IA) pertencem a outras capabilities (`relatorios`,
> `fidelizacao-clientes`, `atendimento-ia`, `reativacao-clientes`) e não estão aqui.

## Requirement: Cadastro de cliente
O sistema SHALL permitir que o barbeiro-dono cadastre um cliente com, no mínimo, nome e
telefone, escopado à sua barbearia (`barbershop_id`).

#### Scenario: Cadastro com dados válidos
- GIVEN o barbeiro-dono autenticado na barbearia X
- WHEN ele cadastra um cliente com nome "Rafael" e telefone válido
- THEN o cliente é criado com `barbershop_id` = X
- AND o cliente aparece na lista de clientes da barbearia X

#### Scenario: Telefone duplicado na mesma barbearia
- GIVEN a barbearia X já tem um cliente com o telefone "5561999990000"
- WHEN o barbeiro tenta cadastrar outro cliente com o mesmo telefone na barbearia X
- THEN o sistema SHALL recusar a criação e apontar o cliente existente
- AND SHALL NOT criar um registro duplicado

#### Scenario: Dados obrigatórios ausentes
- GIVEN o barbeiro-dono autenticado
- WHEN ele tenta cadastrar um cliente sem nome ou sem telefone
- THEN o sistema SHALL recusar a criação com um erro identificando o campo faltante

## Requirement: Isolamento de dados entre barbearias
O sistema SHALL impedir que dados de clientes de uma barbearia sejam visíveis ou editáveis
por outra barbearia, em qualquer operação de leitura ou escrita.

#### Scenario: Tentativa de acesso cruzado
- GIVEN a barbearia X tem um cliente C
- WHEN um usuário autenticado da barbearia Y solicita os dados do cliente C
- THEN o sistema SHALL retornar "não encontrado", nunca os dados de C
- AND SHALL NOT expor a existência do registro para o tenant errado

## Requirement: Registro de atendimento (histórico)
O sistema SHALL permitir registrar um atendimento realizado para um cliente, com serviço,
data e barbeiro responsável, mantendo o histórico completo e ordenado cronologicamente. O
serviço e o barbeiro SHALL poder referenciar o catálogo da barbearia (`agendamento`) quando
existir, mantendo compatibilidade com atendimentos antigos registrados em texto livre.

#### Scenario: Registrar atendimento
- GIVEN um cliente cadastrado na barbearia X
- WHEN o barbeiro registra um atendimento com serviço "Corte", data de hoje
- THEN o atendimento SHALL aparecer no histórico do cliente
- AND o histórico SHALL manter todos os atendimentos anteriores, em ordem cronológica

#### Scenario: Cliente sem nenhum atendimento ainda
- GIVEN um cliente recém-cadastrado, sem atendimentos
- WHEN o barbeiro abre o histórico desse cliente
- THEN o sistema SHALL exibir um estado vazio explícito, não um erro

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

## Requirement: Registro financeiro por atendimento
O sistema SHALL permitir registrar o valor pago por um atendimento, associado ao cliente e
à visita, sem processar ou intermediar o pagamento em si.

#### Scenario: Registrar valor pago
- GIVEN um atendimento registrado para um cliente
- WHEN o barbeiro informa o valor pago naquele atendimento
- THEN o sistema SHALL associar o valor à visita e ao cliente
- AND o valor SHALL contar para o total gasto e o ticket médio do cliente

#### Scenario: Atendimento sem valor informado
- GIVEN um atendimento sendo registrado
- WHEN o barbeiro não informa o valor pago
- THEN o sistema SHALL aceitar o registro sem valor
- AND SHALL excluir esse atendimento do cálculo de ticket médio, sem quebrar o dashboard

## Requirement: Detecção de cliente inativo
O sistema SHALL identificar como "inativo" todo cliente sem atendimento registrado há mais
dias do que o limite configurado pela barbearia, com um valor padrão de 21 dias.

#### Scenario: Cliente cruza o limite de inatividade
- GIVEN um cliente com o limite de inatividade da barbearia configurado em 21 dias
- WHEN se passam 22 dias desde o último atendimento registrado
- THEN o sistema SHALL marcar o cliente como inativo
- AND o cliente SHALL aparecer na lista de "clientes para reativar" do dashboard

#### Scenario: Barbearia sem configuração própria
- GIVEN uma barbearia que nunca configurou o limite de inatividade
- WHEN o sistema calcula clientes inativos
- THEN SHALL usar o valor padrão de 21 dias

## Requirement: Configuração da regra de inatividade
O sistema SHALL permitir que o barbeiro-dono configure, por barbearia, o número de dias
sem atendimento que define um cliente como inativo.

#### Scenario: Alterar o limite
- GIVEN o barbeiro-dono autenticado na barbearia X
- WHEN ele altera o limite de inatividade de 21 para 30 dias
- THEN o sistema SHALL recalcular quais clientes são inativos usando o novo limite
- AND a alteração SHALL valer apenas para a barbearia X

## Requirement: Dashboard com indicadores básicos
O sistema SHALL exibir, num painel único, o número de clientes ativos, o número de
clientes inativos, o ticket médio da barbearia e um resumo da agenda do dia (agendamentos
de hoje e faltas recentes).

#### Scenario: Barbearia com clientes e histórico
- GIVEN uma barbearia com clientes ativos e inativos e atendimentos registrados
- WHEN o barbeiro abre o dashboard
- THEN o sistema SHALL exibir a contagem de ativos, a contagem de inativos e o ticket
  médio calculado sobre os atendimentos com valor informado

#### Scenario: Barbearia nova, sem clientes
- GIVEN uma barbearia recém-onboardada, sem clientes cadastrados
- WHEN o barbeiro abre o dashboard
- THEN o sistema SHALL exibir um estado vazio explícito, não erro nem métrica quebrada

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

## Requirement: Exclusão de cliente (LGPD)
O sistema SHALL permitir que o barbeiro-dono exclua um cliente a pedido, removendo os
dados pessoais identificáveis e preservando os totais agregados de histórico/relatório já
fechados de forma anonimizada. A exclusão SHALL também tratar os agendamentos futuros do
cliente, cancelando-os e desvinculando a identidade removida, e SHALL anonimizar as
conversas e mensagens de WhatsApp associadas ao cliente, preservando o conteúdo operacional
sem vínculo com a identidade removida.

#### Scenario: Exclusão a pedido do titular
- GIVEN um cliente cadastrado com histórico de atendimentos
- WHEN o barbeiro exclui esse cliente a pedido do titular dos dados
- THEN o sistema SHALL remover nome e telefone identificáveis
- AND SHALL preservar os valores agregados de atendimento/transação de forma anonimizada,
  sem vínculo com a identidade removida

#### Scenario: Exclusão de cliente com agendamento futuro
- GIVEN um cliente com um ou mais agendamentos futuros
- WHEN o barbeiro exclui esse cliente
- THEN o sistema SHALL cancelar os agendamentos futuros desse cliente, liberando os horários
- AND SHALL desvincular a identidade removida sem quebrar a visão da agenda nem os agregados

#### Scenario: Exclusão anonimiza conversas de WhatsApp associadas
- GIVEN um cliente com conversas de WhatsApp registradas (`whatsapp-canal`, Fase 5)
- WHEN o barbeiro exclui esse cliente a pedido do titular dos dados
- THEN o sistema SHALL remover o vínculo entre a conversa e a identidade do cliente
- AND SHALL preservar o conteúdo das mensagens já trocadas, sem telefone identificável

## Requirement: Próximo agendamento no perfil do cliente
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

## Requirement: Migração de dados da operação da agência
O sistema SHALL importar, uma única vez por barbearia no momento do onboarding no produto,
os clientes já existentes em `automation/data/db.json`, sem duplicar registros em
migrações repetidas.

#### Scenario: Primeira migração de um tenant
- GIVEN uma barbearia com clientes cadastrados no tooling interno da agência
- WHEN o onboarding dessa barbearia no produto executa a migração
- THEN cada cliente válido do arquivo de origem SHALL ser criado no CRM do produto,
  escopado à barbearia correta

#### Scenario: Migração executada duas vezes
- GIVEN uma barbearia já migrada com sucesso
- WHEN a migração é executada novamente para a mesma barbearia
- THEN o sistema SHALL NOT duplicar os clientes já importados

#### Scenario: Registro de origem malformado
- GIVEN um registro no arquivo de origem sem nome ou sem telefone válido
- WHEN a migração processa esse registro
- THEN o sistema SHALL pular esse registro e reportá-lo num relatório de divergências
- AND SHALL NOT interromper a migração dos demais registros válidos
