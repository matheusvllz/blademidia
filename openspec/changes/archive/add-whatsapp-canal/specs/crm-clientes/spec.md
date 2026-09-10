# Delta for crm-clientes

## MODIFIED Requirements

### Requirement: Exclusão de cliente (LGPD)
O sistema SHALL permitir que o barbeiro-dono exclua um cliente a pedido, removendo os
dados pessoais identificáveis e preservando os totais agregados de histórico/relatório já
fechados de forma anonimizada. A exclusão SHALL também tratar os agendamentos futuros do
cliente, cancelando-os e desvinculando a identidade removida, e SHALL anonimizar as
conversas e mensagens de WhatsApp associadas ao cliente, preservando o conteúdo operacional
sem vínculo com a identidade removida.

Previously: a exclusão cobria dados de cadastro, histórico/financeiro agregado e
agendamentos futuros — não existiam conversas de WhatsApp associadas ao cliente até esta
change.

#### Scenario: Exclusão anonimiza conversas de WhatsApp associadas
- GIVEN um cliente com conversas de WhatsApp registradas
- WHEN o barbeiro exclui esse cliente a pedido do titular dos dados
- THEN o sistema SHALL remover o vínculo entre a conversa e a identidade do cliente
- AND SHALL preservar o conteúdo das mensagens já trocadas, sem telefone identificável
