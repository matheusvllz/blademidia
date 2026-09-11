# Delta for atendimento-ia

## ADDED Requirements

### Requirement: Confirmação de agendamento só acontece via tool
O sistema SHALL executar a confirmação de um agendamento exclusivamente através da tool
`confirmar_agendamento`, nunca inferindo a confirmação a partir do texto gerado pelo modelo —
mesma regra já aplicada às demais ações estruturadas do bot.

#### Scenario: Cliente responde confirmando o lembrete
- GIVEN uma conversa em que o cliente final recebeu um lembrete de confirmação de agendamento
- WHEN o cliente responde de forma afirmativa
- THEN o sistema SHALL chamar a tool `confirmar_agendamento` com o `appointmentId` correspondente
- AND o texto de resposta ao cliente SHALL refletir o resultado real retornado pela tool, nunca
  assumir sucesso antes da chamada

#### Scenario: Tool nunca recebe o tenant como argumento livre
- GIVEN uma chamada à tool `confirmar_agendamento` feita pelo modelo com um campo extra
  tentando indicar outro tenant
- WHEN o sistema executa a tool
- THEN o sistema SHALL usar exclusivamente o `barbershopId` da conversa em processamento,
  ignorando qualquer valor de tenant presente no input do modelo
