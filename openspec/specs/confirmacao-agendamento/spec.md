# Capability: confirmacao-agendamento

> Spec permanente — fonte da verdade do comportamento de confirmação automática de agendamento.
> Não editar diretamente: toda mudança passa por uma change (ver [workflow](../../workflow.md)).
>
> Histórico:
> - Fase 5.3 (envio único do lembrete, confirmação via tool do bot, registro para relatório
>   futuro) estabelecida pela change `add-confirmacao-agendamento` (concluída 2026-09-11).
>
> Escopo atual: envio automático do template de confirmação (categoria *utility*) na janela de
> `confirmation_lead_hours` de cada barbearia habilitada, e a transição de domínio quando o
> cliente confirma pela resposta. Reativação de clientes inativos (`reativacao-clientes`) é
> capability separada, ainda não implementada.

## Requirement: Envio único do lembrete de confirmação
O sistema SHALL enviar, para cada agendamento com status `agendado` que entrar na janela de
`confirmation_lead_hours` da sua barbearia, o template de confirmação aprovado — no máximo uma
vez por agendamento, independentemente de o cliente responder ou não e de quantas vezes o job
de seleção rodar antes do horário do agendamento.

#### Scenario: Agendamento entra na janela pela primeira vez
- GIVEN um agendamento `agendado`, cuja barbearia tem `confirmationAutomationEnabled = true`,
  cujo início cai dentro de `confirmation_lead_hours`
- AND nenhum envio de lembrete foi registrado para esse agendamento
- WHEN o job de confirmação roda
- THEN o sistema SHALL enviar o template via `WhatsAppProvider.sendTemplate`
- AND SHALL registrar o envio

#### Scenario: Job roda de novo antes do cliente responder
- GIVEN um agendamento com envio de lembrete já registrado, ainda `agendado`
- WHEN o job de confirmação roda novamente, com o agendamento ainda dentro da janela
- THEN o sistema SHALL NOT enviar o template de novo para esse agendamento

#### Scenario: Barbearia sem confirmação automática habilitada
- GIVEN um agendamento que entraria na janela de confirmação
- AND a barbearia correspondente tem `confirmationAutomationEnabled = false` (ou ausente)
- WHEN o job de confirmação roda
- THEN o sistema SHALL NOT enviar nada para esse agendamento
- AND SHALL NOT registrar tentativa de envio

#### Scenario: Agendamento muda de estado entre a seleção e o envio
- GIVEN um agendamento selecionado pelo job por estar `agendado` dentro da janela
- WHEN, antes do envio efetivo, o agendamento deixa de estar `agendado` (cancelado, remarcado
  para fora da janela, ou já confirmado por outro caminho)
- THEN o sistema SHALL reler o status imediatamente antes de enviar e SHALL NOT enviar o
  template se o status não for mais `agendado`

#### Scenario: Falha no envio de um agendamento não interrompe os demais
- GIVEN dois ou mais agendamentos elegíveis na mesma execução do job
- WHEN o envio do template para um deles falha (erro do provedor/BSP)
- THEN o sistema SHALL registrar a falha sem lançar exceção não tratada
- AND SHALL continuar processando os demais agendamentos elegíveis da mesma execução

## Requirement: Confirmação do agendamento pela resposta do cliente
O sistema SHALL disponibilizar, ao loop de conversa do `atendimento-ia`, uma forma de marcar um
agendamento como confirmado (`confirmar_agendamento`) quando o cliente final responder
confirmando o lembrete, transicionando o agendamento de `agendado` para `confirmado` através do
`AgendaService`, de forma idempotente.

#### Scenario: Cliente confirma o agendamento
- GIVEN um agendamento `agendado` que recebeu o lembrete de confirmação
- WHEN o cliente responde confirmando e o bot chama a tool `confirmar_agendamento` para esse
  agendamento
- THEN o sistema SHALL transicionar o agendamento para `confirmado`

#### Scenario: Cliente confirma mais de uma vez (reentrega ou repetição)
- GIVEN um agendamento já `confirmado`
- WHEN a tool `confirmar_agendamento` é chamada novamente para o mesmo agendamento
- THEN o sistema SHALL retornar sucesso sem gerar novo efeito nem erro

#### Scenario: Cliente pede para mudar o horário em vez de confirmar
- GIVEN um agendamento que recebeu o lembrete de confirmação
- WHEN o cliente responde pedindo para remarcar
- THEN o sistema SHALL tratar o pedido pelo loop de conversa existente do `atendimento-ia`,
  usando a tool `remarcar_agendamento` já existente — SHALL NOT criar um caminho de
  processamento separado do canal geral de mensagens

## Requirement: Registro de envio para uso futuro em relatórios
O sistema SHALL registrar, para cada envio de lembrete de confirmação, identificadores técnicos
suficientes para permitir, em capability futura, calcular a métrica de "no-show evitado" —
sem incluir conteúdo de mensagem nem telefone completo no registro.

#### Scenario: Envio bem-sucedido é registrado
- GIVEN um envio de template concluído com sucesso
- WHEN o sistema registra o evento
- THEN o registro SHALL conter, no mínimo, o id do agendamento, o id da barbearia e o momento
  do envio
- AND SHALL NOT conter o corpo da mensagem nem o telefone completo do cliente

## Requirement: Isolamento de dados entre barbearias
O sistema SHALL escopar toda seleção, envio e registro de confirmação por `barbershop_id`, sem
exceção.

#### Scenario: Seleção nunca mistura barbearias
- GIVEN agendamentos elegíveis de duas barbearias distintas
- WHEN o job de confirmação roda
- THEN o sistema SHALL processar e registrar cada agendamento apenas sob o `barbershop_id` a
  que ele pertence, nunca sob outro
