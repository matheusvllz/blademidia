# Delta for reativacao-clientes

> Capability nova — este delta contém apenas `ADDED Requirements` e, na conclusão da change,
> vira a spec permanente inicial em `openspec/specs/reativacao-clientes/spec.md`.

## ADDED Requirements

### Requirement: Envio de reativação para cliente inativo elegível
O sistema SHALL enviar o template de reativação aprovado a um cliente cuja última visita
ultrapassar `inactivityDaysThreshold` da barbearia, desde que a barbearia tenha
`reactivationAutomationEnabled = true`, o cliente tenha telefone válido e não esteja em opt-out,
e o cliente tenha pelo menos uma visita registrada.

#### Scenario: Cliente inativo elegível pela primeira vez
- GIVEN um cliente cuja última visita ultrapassa `inactivityDaysThreshold`, sem nenhum envio de
  reativação anterior registrado, com telefone válido
- AND a barbearia tem `reactivationAutomationEnabled = true`
- WHEN o job de reativação roda
- THEN o sistema SHALL enviar o template via `WhatsAppProvider.sendTemplate`
- AND SHALL registrar o envio, junto com a última visita do cliente no momento do envio

#### Scenario: Barbearia sem reativação automática habilitada
- GIVEN um cliente que ultrapassa `inactivityDaysThreshold`
- AND a barbearia correspondente tem `reactivationAutomationEnabled = false` (ou ausente)
- WHEN o job de reativação roda
- THEN o sistema SHALL NOT enviar nada para esse cliente

#### Scenario: Cliente sem nenhuma visita registrada
- GIVEN um cliente sem nenhuma visita registrada (`lastVisitAt` nulo)
- WHEN o job de reativação roda
- THEN o sistema SHALL NOT selecionar esse cliente para envio automático, mesmo que ele conste
  como inativo em outras leituras do sistema (ex.: dashboard)

#### Scenario: Cliente sem telefone (anonimizado por exclusão LGPD)
- GIVEN um cliente inativo elegível cujo telefone foi anonimizado
- WHEN o job de reativação roda
- THEN o sistema SHALL NOT selecionar esse cliente para envio

### Requirement: Reenvio só após novo ciclo de inatividade
O sistema SHALL impedir um novo envio de reativação para um cliente que já recebeu um, a menos
que o cliente tenha registrado uma visita nova após o envio anterior e esteja, de novo,
inativo pelo limiar da barbearia — nunca reenviando repetidamente para quem permanece no mesmo
período de inatividade sem ter respondido.

#### Scenario: Cliente já recebeu reativação e continua sem visitar
- GIVEN um cliente que recebeu um envio de reativação e não teve nenhuma visita nova desde então
- WHEN o job de reativação roda novamente, mesmo com o cliente ainda inativo
- THEN o sistema SHALL NOT enviar um novo template para esse cliente

#### Scenario: Cliente voltou a visitar e ficou inativo de novo
- GIVEN um cliente que recebeu uma reativação, depois visitou a barbearia, e mais tarde
  ultrapassa `inactivityDaysThreshold` de novo
- WHEN o job de reativação roda
- THEN o sistema SHALL considerar esse cliente elegível para um novo envio de reativação

### Requirement: Limite diário de envios por barbearia (throttling)
O sistema SHALL limitar o número de envios de reativação por barbearia a, no máximo,
`reactivationDailyCap` por execução do job, priorizando os clientes com maior tempo de
inatividade quando houver mais elegíveis do que o limite permite.

#### Scenario: Mais elegíveis do que o limite diário
- GIVEN uma barbearia com mais clientes elegíveis do que `reactivationDailyCap`
- WHEN o job de reativação roda
- THEN o sistema SHALL enviar no máximo `reactivationDailyCap` mensagens nessa execução,
  priorizando os clientes inativos há mais tempo
- AND os demais elegíveis SHALL permanecer candidatos para a próxima execução

### Requirement: Opt-out interrompe qualquer envio de reativação
O sistema SHALL respeitar o opt-out do cliente final sem exceção — nenhum envio de reativação
SHALL ocorrer para uma conversa marcada como opt-out.

#### Scenario: Cliente em opt-out não recebe reativação
- GIVEN um cliente elegível para reativação cuja conversa está marcada como opt-out
- WHEN o job de reativação roda
- THEN o sistema SHALL NOT enviar o template para esse cliente

### Requirement: Falha de envio não interrompe o lote
O sistema SHALL registrar a falha de envio para um cliente sem lançar exceção não tratada e
SHALL continuar processando os demais clientes elegíveis da mesma execução.

#### Scenario: Falha no envio de um cliente
- GIVEN dois ou mais clientes elegíveis na mesma execução do job
- WHEN o envio do template para um deles falha (erro do provedor/BSP)
- THEN o sistema SHALL registrar a falha sem lançar exceção não tratada
- AND SHALL continuar processando os demais clientes elegíveis da mesma execução

### Requirement: Registro de envio para uso futuro em relatórios
O sistema SHALL registrar, para cada envio de reativação, identificadores técnicos suficientes
para permitir, em capability futura, calcular a métrica de "cliente reativado" — sem incluir
conteúdo de mensagem nem telefone completo no registro.

#### Scenario: Envio bem-sucedido é registrado
- GIVEN um envio de template de reativação concluído com sucesso
- WHEN o sistema registra o evento
- THEN o registro SHALL conter, no mínimo, o id do cliente, o id da barbearia, o momento do
  envio e a última visita do cliente no momento do envio
- AND SHALL NOT conter o corpo da mensagem nem o telefone completo do cliente

### Requirement: Isolamento de dados entre barbearias
O sistema SHALL escopar toda seleção, envio e registro de reativação por `barbershop_id`, sem
exceção.

#### Scenario: Seleção nunca mistura barbearias
- GIVEN clientes elegíveis de duas barbearias distintas
- WHEN o job de reativação roda
- THEN o sistema SHALL processar e registrar cada cliente apenas sob o `barbershop_id` a que
  ele pertence, nunca sob outro
