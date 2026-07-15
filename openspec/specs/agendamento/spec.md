# Capability: agendamento

> Spec permanente — fonte da verdade do comportamento da agenda do produto.
> Não editar diretamente: toda mudança passa por uma change (ver [workflow](../../workflow.md)).
>
> Histórico:
> - Fase 2 (núcleo da agenda) estabelecida pela change `add-agendamento` (concluída 2026-07-15).
>
> Escopo atual: Fase 2. Envio automático de mensagem (confirmação 24h, reativação),
> auto-agendamento pelo cliente final e conversação de IA pertencem a outras capabilities
> (`whatsapp-canal`, `atendimento-ia`, `confirmacao-agendamento`, `reativacao-clientes`) e não
> estão aqui — esta capability expõe a fronteira de domínio que elas vão consumir.

## Requirement: Cadastro de serviço
O sistema SHALL permitir que o barbeiro-dono cadastre, edite e desative serviços da sua
barbearia, cada um com nome, duração em minutos e, opcionalmente, preço de tabela, escopados
ao `barbershop_id`.

#### Scenario: Cadastro de serviço válido
- GIVEN o barbeiro-dono autenticado na barbearia X
- WHEN ele cadastra um serviço "Corte" com duração de 40 minutos e preço R$40
- THEN o serviço é criado com `barbershop_id` = X e passa a aparecer na lista de serviços
- AND fica disponível para seleção ao criar um agendamento

#### Scenario: Duração inválida
- GIVEN o barbeiro-dono autenticado
- WHEN ele tenta cadastrar um serviço com duração ausente, zero ou negativa
- THEN o sistema SHALL recusar a criação com erro identificando o campo

#### Scenario: Desativar serviço com agendamentos futuros
- GIVEN um serviço "Barba" com agendamentos futuros
- WHEN o barbeiro desativa o serviço
- THEN o serviço SHALL deixar de ser oferecido em novos agendamentos
- AND os agendamentos futuros já existentes SHALL ser preservados

## Requirement: Cadastro de barbeiro
O sistema SHALL permitir que o barbeiro-dono cadastre, edite e desative barbeiros (recursos
da agenda, sem acesso ao sistema) escopados ao `barbershop_id`.

#### Scenario: Cadastro de barbeiro válido
- GIVEN o barbeiro-dono autenticado na barbearia X
- WHEN ele cadastra um barbeiro "Rafael"
- THEN o barbeiro é criado com `barbershop_id` = X e pode receber grade de horário e
  agendamentos

#### Scenario: Barbeiro não é usuário do sistema
- GIVEN um barbeiro cadastrado
- WHEN se avalia o acesso ao sistema
- THEN o barbeiro SHALL NOT possuir credenciais de login nesta fase (é apenas recurso da
  agenda)

#### Scenario: Desativar barbeiro com agendamentos futuros
- GIVEN um barbeiro com agendamentos futuros
- WHEN o barbeiro-dono o desativa
- THEN o barbeiro SHALL deixar de aparecer para novos agendamentos
- AND os agendamentos futuros existentes SHALL ser preservados e continuar visíveis na agenda

## Requirement: Associação barbeiro–serviço
O sistema SHALL permitir definir quais serviços cada barbeiro executa, e SHALL considerar
apenas barbeiros habilitados a um serviço ao calcular disponibilidade daquele serviço.

#### Scenario: Barbeiro habilitado a um subconjunto de serviços
- GIVEN a barbearia com serviços "Corte" e "Barba" e o barbeiro "João" habilitado só a "Corte"
- WHEN o sistema calcula a disponibilidade de "Barba"
- THEN "João" SHALL NOT aparecer como opção para "Barba"

#### Scenario: Barbeiro sem restrição declarada
- GIVEN um barbeiro sem nenhuma associação de serviço registrada
- WHEN o sistema calcula disponibilidade
- THEN o sistema SHALL tratá-lo como habilitado a todos os serviços ativos da barbearia

## Requirement: Grade de horário do barbeiro
O sistema SHALL permitir configurar, por barbeiro, a grade semanal de trabalho — um ou mais
intervalos de atendimento por dia da semana — usada como base para a disponibilidade.

#### Scenario: Grade com intervalo de almoço
- GIVEN o barbeiro "Rafael" com trabalho na terça das 09:00 às 12:00 e das 13:00 às 19:00
- WHEN o sistema calcula a disponibilidade de Rafael numa terça
- THEN nenhum horário entre 12:00 e 13:00 SHALL ser oferecido
- AND horários dentro das duas janelas SHALL ser oferecidos conforme a duração do serviço

#### Scenario: Dia sem grade
- GIVEN o barbeiro sem nenhuma janela de trabalho no domingo
- WHEN o sistema calcula a disponibilidade dele num domingo
- THEN o sistema SHALL retornar nenhum horário disponível, sem erro

## Requirement: Exceções de agenda (folga e bloqueio)
O sistema SHALL permitir registrar exceções por barbeiro numa data específica — folga (dia
inteiro), bloqueio (intervalo) ou disponibilidade extra — que SHALL sobrepor a grade semanal
no cálculo de disponibilidade.

#### Scenario: Folga em dia normalmente trabalhado
- GIVEN o barbeiro "Rafael" que normalmente trabalha na quarta
- AND uma folga registrada para uma quarta específica
- WHEN o sistema calcula a disponibilidade dessa quarta
- THEN nenhum horário SHALL ser oferecido para Rafael naquele dia

#### Scenario: Bloqueio parcial
- GIVEN o barbeiro com expediente 09:00–19:00 e um bloqueio das 15:00 às 16:00
- WHEN o sistema calcula a disponibilidade do dia
- THEN nenhum horário que ocupe o intervalo 15:00–16:00 SHALL ser oferecido

## Requirement: Cálculo de disponibilidade
O sistema SHALL calcular os horários livres para um serviço numa data, por barbeiro ou em
qualquer barbeiro habilitado, a partir da grade menos as exceções menos os agendamentos
ativos, respeitando a duração do serviço e o passo de horário configurado, no fuso da
barbearia.

#### Scenario: Horários livres de um serviço num dia
- GIVEN um barbeiro com expediente 09:00–12:00, passo de 30 min, serviço de 60 min e nenhum
  agendamento
- WHEN o sistema consulta a disponibilidade daquele dia
- THEN SHALL oferecer 09:00, 09:30, 10:00, 10:30 e 11:00 (último bloco que cabe até as 12:00)
- AND SHALL NOT oferecer 11:30 (um serviço de 60 min ultrapassaria o fim do expediente)
- AND um serviço que termine exatamente no fim do expediente (ex.: 30 min às 11:30) SHALL ser
  oferecido

#### Scenario: Horário já ocupado não é oferecido
- GIVEN um agendamento ativo das 10:00 às 10:40 para o barbeiro
- WHEN o sistema calcula a disponibilidade desse barbeiro para um serviço de 40 min
- THEN nenhum horário que se sobreponha ao intervalo 10:00–10:40 SHALL ser oferecido

#### Scenario: Disponibilidade em qualquer barbeiro
- GIVEN dois barbeiros habilitados ao serviço, com horários livres diferentes
- WHEN o sistema consulta a disponibilidade "em qualquer barbeiro"
- THEN SHALL retornar a união dos horários livres, indicando qual barbeiro atende cada um

## Requirement: Criação de agendamento
O sistema SHALL permitir criar um agendamento vinculando cliente, serviço, barbeiro e horário
de início, calculando o término pela duração do serviço, escopado ao `barbershop_id`.

#### Scenario: Agendamento em horário livre
- GIVEN um horário livre para o barbeiro e o serviço escolhidos
- WHEN o barbeiro-dono cria o agendamento para um cliente cadastrado
- THEN o agendamento é criado com estado "agendado", com início e término corretos
- AND passa a aparecer na agenda do dia e no perfil do cliente como próximo agendamento

#### Scenario: Conflito de horário (sobreposição)
- GIVEN um agendamento ativo para o barbeiro num intervalo
- WHEN se tenta criar outro agendamento do mesmo barbeiro que se sobreponha a esse intervalo
- THEN o sistema SHALL recusar a criação e informar o conflito
- AND SHALL NOT gravar o agendamento sobreposto

#### Scenario: Conflito por concorrência
- GIVEN dois pedidos simultâneos para o mesmo último horário livre do mesmo barbeiro
- WHEN ambos tentam gravar
- THEN o sistema SHALL persistir no máximo um agendamento
- AND SHALL recusar o outro com conflito, sem corromper dados

#### Scenario: Fora da grade ou no passado
- GIVEN um horário fora da grade do barbeiro, numa folga, ou anterior ao momento atual
- WHEN se tenta criar o agendamento
- THEN o sistema SHALL recusar a criação identificando o motivo

#### Scenario: Cliente, serviço ou barbeiro de outra barbearia
- GIVEN um cliente/serviço/barbeiro que pertence à barbearia Y
- WHEN um usuário da barbearia X tenta criar um agendamento referenciando-o
- THEN o sistema SHALL recusar como "não encontrado", sem expor o registro do outro tenant

## Requirement: Ciclo de vida do agendamento
O sistema SHALL suportar as transições de estado do agendamento — agendado → confirmado,
agendado/confirmado → concluído, agendado/confirmado → cancelado, agendado/confirmado →
faltou — e SHALL recusar transições inválidas.

#### Scenario: Confirmar e concluir
- GIVEN um agendamento "agendado"
- WHEN o barbeiro o confirma e, depois, o conclui
- THEN o estado passa a "confirmado" e então a "concluído"

#### Scenario: Transição inválida
- GIVEN um agendamento já "concluído"
- WHEN se tenta cancelá-lo ou remarcá-lo
- THEN o sistema SHALL recusar a transição, mantendo o estado "concluído"

#### Scenario: Remarcação
- GIVEN um agendamento "agendado" ou "confirmado"
- WHEN o barbeiro o remarca para outro horário livre
- THEN o horário original SHALL voltar a ficar disponível
- AND o novo horário SHALL ser validado quanto a conflito, grade e passado como uma criação

## Requirement: Conclusão gera atendimento
O sistema SHALL, ao concluir um agendamento, registrar exatamente um atendimento (`visit`)
vinculado ao cliente, serviço e barbeiro, e opcionalmente o valor pago, sem duplicar em
conclusões repetidas.

#### Scenario: Concluir registra visita e valor
- GIVEN um agendamento "confirmado" de um serviço com um cliente
- WHEN o barbeiro o conclui informando o valor pago
- THEN o sistema SHALL criar um atendimento no histórico do cliente vinculado a esse serviço
  e barbeiro
- AND SHALL registrar o valor pago associado a esse atendimento
- AND o atendimento SHALL contar para o total e o ticket médio do cliente (regras da Fase 1)

#### Scenario: Conclusão idempotente
- GIVEN um agendamento já concluído que já gerou um atendimento
- WHEN a conclusão é solicitada novamente para o mesmo agendamento
- THEN o sistema SHALL NOT criar um segundo atendimento

#### Scenario: Concluir sem valor
- GIVEN um agendamento sendo concluído sem valor informado
- WHEN a conclusão é registrada
- THEN o atendimento SHALL ser criado sem valor e SHALL ser excluído do cálculo de ticket
  médio, sem quebrar o dashboard

## Requirement: Registro de falta (no-show)
O sistema SHALL permitir marcar um agendamento como falta, manualmente e por varredura
automática após um limite configurável de minutos além do horário, e SHALL NOT marcar como
falta agendamentos já concluídos ou cancelados.

#### Scenario: Falta manual
- GIVEN um agendamento cujo horário já passou e o cliente não compareceu
- WHEN o barbeiro o marca como falta
- THEN o estado passa a "faltou" e o agendamento fica disponível como insumo de reativação

#### Scenario: Varredura automática de falta
- GIVEN um agendamento "agendado"/"confirmado" cujo horário passou além do limite configurado
- WHEN a varredura automática do worker executa
- THEN o agendamento SHALL passar a "faltou"
- AND agendamentos "concluído" ou "cancelado" SHALL permanecer inalterados

#### Scenario: Varredura idempotente
- GIVEN um agendamento já marcado como "faltou"
- WHEN a varredura executa novamente
- THEN o estado SHALL permanecer "faltou", sem efeito colateral

## Requirement: Visão da agenda
O sistema SHALL exibir a agenda por dia e por semana, organizada por barbeiro, mostrando os
agendamentos com cliente, serviço, horário e estado, escopada à barbearia da sessão.

#### Scenario: Agenda do dia com agendamentos
- GIVEN uma barbearia com barbeiros e agendamentos num dia
- WHEN o barbeiro abre a agenda daquele dia
- THEN o sistema SHALL exibir, por barbeiro, os agendamentos posicionados no horário, com o
  estado visível

#### Scenario: Dia sem agendamentos
- GIVEN um dia sem nenhum agendamento
- WHEN o barbeiro abre a agenda
- THEN o sistema SHALL exibir um estado vazio explícito, não um erro

## Requirement: Configuração das regras da agenda
O sistema SHALL permitir configurar, por barbearia, o passo de horário, a antecedência mínima
para agendar, o limite de minutos para varredura de falta e as horas de antecedência da
confirmação (dado consumido em fase futura), com valores padrão.

#### Scenario: Barbearia sem configuração própria
- GIVEN uma barbearia que nunca configurou as regras da agenda
- WHEN o sistema calcula disponibilidade e varreduras
- THEN SHALL usar os valores padrão (passo 30 min, antecedência mínima 0, falta após 30 min,
  confirmação 24h antes)

#### Scenario: Alterar o passo de horário
- GIVEN o barbeiro-dono autenticado
- WHEN ele altera o passo de 30 para 15 minutos
- THEN as próximas consultas de disponibilidade SHALL oferecer horários a cada 15 minutos
- AND a alteração SHALL valer apenas para a barbearia dele

## Requirement: Isolamento de dados entre barbearias (agenda)
O sistema SHALL impedir que serviços, barbeiros, grades, exceções e agendamentos de uma
barbearia sejam visíveis ou editáveis por outra, em qualquer operação de leitura ou escrita.

#### Scenario: Acesso cruzado a agendamento
- GIVEN um agendamento pertencente à barbearia X
- WHEN um usuário autenticado da barbearia Y solicita ou tenta alterar esse agendamento
- THEN o sistema SHALL retornar "não encontrado" e SHALL NOT expor ou alterar o dado

## Requirement: Fronteira de domínio consumível por automações
O sistema SHALL expor as operações de agenda (consultar disponibilidade, criar, remarcar,
cancelar agendamento) por uma camada de domínio única, tenant-scoped e independente da sessão
web, registrando a origem de cada agendamento (painel, bot ou importação).

#### Scenario: Origem registrada
- GIVEN um agendamento criado pelo painel
- WHEN ele é persistido
- THEN o sistema SHALL registrar a origem "painel"
- AND a mesma operação de domínio SHALL aceitar origem "bot" quando invocada por uma
  automação futura, sem caminho de escrita paralelo

#### Scenario: Escopo de tenant na camada de domínio
- GIVEN uma operação de agenda invocada sem `barbershop_id`
- WHEN a camada de domínio a processa
- THEN a operação SHALL falhar, pois nenhum caminho de leitura/escrita de agenda existe sem
  escopo de tenant (ADR-0007)
