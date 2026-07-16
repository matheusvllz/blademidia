# Capability: fidelizacao-clientes (delta — change `add-fidelizacao-e-funcionarios`)

> Delta de spec proposto pela change `add-fidelizacao-e-funcionarios` (Fase 4). Ao concluir
> (etapa 11), estes requisitos passam a compor a spec permanente
> `openspec/specs/fidelizacao-clientes/spec.md`.
>
> Esta capability é **informativa**: nunca aplica desconto, crédito ou qualquer efeito
> automático de pagamento — o sistema sinaliza, o barbeiro decide e age fora do sistema
> (coerente com o non-goal "sem processar pagamento" do `project.md`).

## ADDED Requirements

### Requirement: Contagem de visitas para fidelização
O sistema SHALL contar, para cada cliente, o número de atendimentos (`visits`) registrados
desde o resgate mais recente ou, se nunca resgatado, desde a data de ativação da fidelização
para aquele cliente (`loyalty_baseline_at`), sem considerar atendimentos anteriores a essa
data.

#### Scenario: Contagem desde a ativação (cliente novo na feature)
- GIVEN um cliente sem nenhum resgate registrado
- WHEN o sistema calcula a contagem de fidelização
- THEN o sistema SHALL contar apenas os atendimentos ocorridos a partir de
  `loyalty_baseline_at`
- AND atendimentos anteriores a essa data SHALL NOT contar para a meta

#### Scenario: Contagem após um resgate
- GIVEN um cliente com um resgate registrado numa data
- WHEN o sistema calcula a contagem de fidelização
- THEN o sistema SHALL contar apenas os atendimentos ocorridos após a data do resgate mais
  recente

### Requirement: Sinalização de meta atingida
O sistema SHALL sinalizar, no perfil do cliente e no dashboard, quando a contagem de
fidelização do cliente atingir o limite configurado da barbearia.

#### Scenario: Cliente atinge o limite
- GIVEN uma barbearia com limite de fidelização configurado em 6 visitas
- WHEN um cliente completa a 6ª visita desde o último resgate (ou ativação)
- THEN o sistema SHALL exibir o cliente no perfil com a sinalização "meta atingida"
- AND o cliente SHALL aparecer na lista de "clientes prontos para resgate" do dashboard

#### Scenario: Cliente abaixo do limite
- GIVEN um cliente com contagem abaixo do limite configurado
- WHEN o barbeiro abre o perfil do cliente
- THEN o sistema SHALL exibir o progresso atual (ex.: "3/6") sem sinalizar meta atingida

### Requirement: Registro de resgate
O sistema SHALL permitir que o barbeiro registre explicitamente o resgate da fidelização de um
cliente, o que SHALL reiniciar a contagem a partir da data do resgate.

#### Scenario: Marcar resgate
- GIVEN um cliente com a meta de fidelização atingida
- WHEN o barbeiro marca o resgate no perfil do cliente
- THEN o sistema SHALL registrar o resgate com a data/hora atual
- AND a contagem de fidelização desse cliente SHALL reiniciar a partir dessa data

#### Scenario: Resgate não é inferido automaticamente
- GIVEN um atendimento registrado sem valor pago (R$0 ou sem informar)
- WHEN o sistema processa esse atendimento
- THEN o sistema SHALL NOT inferir um resgate de fidelização a partir da ausência de valor
- AND o resgate só SHALL ocorrer por ação explícita do barbeiro

### Requirement: Configuração do limite de fidelização
O sistema SHALL permitir que o barbeiro-dono configure, por barbearia, o número de visitas que
define a meta de fidelização, com um valor padrão de 6 quando nunca configurado.

#### Scenario: Barbearia sem configuração própria
- GIVEN uma barbearia que nunca configurou o limite de fidelização
- WHEN o sistema calcula quem atingiu a meta
- THEN SHALL usar o valor padrão de 6 visitas

#### Scenario: Alterar o limite
- GIVEN o barbeiro-dono autenticado na barbearia X
- WHEN ele altera o limite de fidelização de 6 para 10 visitas
- THEN o sistema SHALL recalcular quem atingiu a meta usando o novo limite
- AND a alteração SHALL valer apenas para a barbearia X

### Requirement: Preservação de histórico de resgate na exclusão LGPD
O sistema SHALL preservar os resgates de fidelização já registrados de forma agregada e
anonimizada quando um cliente for excluído (LGPD), sem reexpor a identidade removida.

#### Scenario: Exclusão de cliente com resgates anteriores
- GIVEN um cliente com um ou mais resgates de fidelização registrados
- WHEN o barbeiro exclui esse cliente a pedido do titular
- THEN o sistema SHALL desvincular a identidade removida dos registros de resgate
- AND SHALL NOT expor nome ou telefone do cliente removido em nenhuma tela de fidelização

### Requirement: Isolamento de dados entre barbearias (fidelização)
O sistema SHALL impedir que contagens, resgates ou configurações de fidelização de uma
barbearia sejam visíveis ou alteráveis por outra.

#### Scenario: Acesso cruzado a fidelização
- GIVEN um cliente e resgates de fidelização da barbearia X
- WHEN um usuário autenticado da barbearia Y solicita dados de fidelização
- THEN o sistema SHALL retornar apenas dados da barbearia Y, nunca de X
