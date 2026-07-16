# Capability: auth-tenancy

> Spec permanente — fonte da verdade do comportamento de autenticação e autorização do produto.
> Não editar diretamente: toda mudança passa por uma change (ver [workflow](../../workflow.md)).
>
> Histórico:
> - Fase 4 (papel dono/funcionário, matriz de autorização retrofitada) estabelecida pela
>   change `add-fidelizacao-e-funcionarios` (concluída 2026-07-16) — primeira vez que esta
>   capability (antes só candidata) ganha spec real.
>
> Escopo atual: dois papéis (`dono`, `funcionario`), funcionário vinculado a um barbeiro do
> catálogo (`agendamento`). Papéis adicionais, acesso de suporte da Blade e convite por e-mail
> não estão aqui.

## Requirement: Papel de usuário
O sistema SHALL atribuir a cada usuário (`crm_users`) um papel — `dono` ou `funcionario` — com
`dono` como padrão para usuários existentes antes desta capability, preservando compatibilidade.

#### Scenario: Usuário existente antes da feature
- GIVEN um usuário criado antes desta capability existir (sem papel definido)
- WHEN o sistema resolve o papel desse usuário
- THEN o sistema SHALL tratá-lo como `dono`, sem exigir nova ação de configuração

#### Scenario: Novo funcionário criado
- GIVEN o barbeiro-dono autenticado
- WHEN ele cria um login vinculado a um barbeiro do catálogo
- THEN o sistema SHALL criar o usuário com papel `funcionario`

## Requirement: Funcionário vinculado a um barbeiro do catálogo
O sistema SHALL exigir que todo usuário com papel `funcionario` esteja vinculado a exatamente
um `barbers` (recurso da agenda) da mesma barbearia, e SHALL NOT permitir criar um funcionário
sem esse vínculo.

#### Scenario: Criar funcionário sem vínculo
- GIVEN o barbeiro-dono autenticado
- WHEN ele tenta criar um login de funcionário sem selecionar um barbeiro do catálogo
- THEN o sistema SHALL recusar a criação, identificando o campo obrigatório

#### Scenario: Barbeiro de outra barbearia
- GIVEN um barbeiro que pertence à barbearia Y
- WHEN um dono da barbearia X tenta vincular um login de funcionário a esse barbeiro
- THEN o sistema SHALL recusar como "não encontrado"

## Requirement: Gestão de login de funcionário pelo dono
O sistema SHALL permitir que o barbeiro-dono crie, redefina a senha e desative o login de um
funcionário, sem depender de e-mail ou qualquer fluxo de autoatendimento.

#### Scenario: Criar login de funcionário
- GIVEN o barbeiro-dono autenticado, com um barbeiro cadastrado sem login
- WHEN ele define um login (email ou telefone) e senha para esse barbeiro
- THEN o sistema SHALL criar o usuário funcionário, pronto para logar

#### Scenario: Redefinir senha
- GIVEN um funcionário já com login criado
- WHEN o dono redefine a senha desse funcionário
- THEN o sistema SHALL substituir a senha anterior
- AND a senha antiga SHALL NOT continuar válida

#### Scenario: Desativar login de funcionário
- GIVEN um funcionário com login ativo
- WHEN o dono desativa esse login
- THEN o sistema SHALL impedir novas sessões desse usuário
- AND SHALL NOT afetar o barbeiro (recurso da agenda) nem seus agendamentos já existentes

## Requirement: Escopo de agenda do funcionário
O sistema SHALL restringir toda leitura e ação de agenda de um usuário com papel `funcionario`
ao `barberId` ao qual ele está vinculado, em qualquer visão (dia, semana, grade).

#### Scenario: Funcionário lista a própria agenda
- GIVEN um funcionário vinculado ao barbeiro Rafael
- WHEN ele abre qualquer visão da agenda
- THEN o sistema SHALL exibir apenas os agendamentos de Rafael, mesmo que outros barbeiros
  tenham agendamentos no mesmo período

#### Scenario: Funcionário tenta criar agendamento para outro barbeiro
- GIVEN um funcionário vinculado ao barbeiro Rafael
- WHEN ele tenta criar um agendamento atribuído a outro barbeiro da mesma barbearia
- THEN o sistema SHALL recusar a criação, identificando a restrição de papel

#### Scenario: Funcionário opera o próprio agendamento
- GIVEN um agendamento do barbeiro ao qual o funcionário está vinculado
- WHEN o funcionário confirma, conclui, remarca, cancela ou marca falta nesse agendamento
- THEN o sistema SHALL permitir a ação normalmente, como faria o dono

## Requirement: Restrição de acesso a relatórios financeiros
O sistema SHALL impedir que um usuário com papel `funcionario` acesse a capability
`relatorios` (indicadores financeiros, PDF, snapshot), retornando acesso negado.

#### Scenario: Funcionário tenta acessar relatórios
- GIVEN um usuário com papel `funcionario` autenticado
- WHEN ele solicita qualquer rota ou tela de `relatorios`
- THEN o sistema SHALL negar o acesso (403), sem expor nenhum dado financeiro

## Requirement: Restrição de acesso a configurações da barbearia
O sistema SHALL impedir que um usuário com papel `funcionario` crie, edite ou remova serviços,
preços, barbeiros, logins de funcionário ou regras da agenda (grade, exceções, passo de
horário, regras de fidelização).

#### Scenario: Funcionário tenta editar um serviço
- GIVEN um usuário com papel `funcionario` autenticado
- WHEN ele tenta criar, editar ou remover um serviço
- THEN o sistema SHALL negar a ação (403)

#### Scenario: Funcionário tenta gerenciar outro funcionário
- GIVEN um usuário com papel `funcionario` autenticado
- WHEN ele tenta criar, redefinir senha ou desativar o login de qualquer funcionário
  (incluindo o próprio)
- THEN o sistema SHALL negar a ação (403)

#### Scenario: Funcionário pode consultar o catálogo para agendar
- GIVEN um usuário com papel `funcionario` autenticado
- WHEN ele consulta a lista de serviços para criar um agendamento
- THEN o sistema SHALL permitir a leitura (necessária para operar a própria agenda), mesmo sem
  permitir edição

## Requirement: Restrição de acesso à exclusão de cliente (LGPD)
O sistema SHALL restringir a exclusão/anonimização de cliente (LGPD) ao papel `dono`.

#### Scenario: Funcionário tenta excluir um cliente
- GIVEN um usuário com papel `funcionario` autenticado
- WHEN ele tenta excluir um cliente a pedido do titular
- THEN o sistema SHALL negar a ação (403)

## Requirement: Cadastro de cliente compartilhado entre papéis
O sistema SHALL permitir que tanto o dono quanto qualquer funcionário da mesma barbearia
consultem, cadastrem e editem clientes, sem restringir a visibilidade do cadastro por barbeiro.

#### Scenario: Funcionário consulta cliente atendido por outro barbeiro
- GIVEN um cliente com histórico de atendimentos por outro barbeiro da mesma barbearia
- WHEN um funcionário abre o perfil desse cliente
- THEN o sistema SHALL exibir o cadastro e o histórico normalmente, sem restrição por papel

## Requirement: Sessão compatível sem forçar logout no deploy
O sistema SHALL continuar aceitando sessões emitidas antes desta capability existir,
resolvendo-as como papel `dono`, até expirarem naturalmente.

#### Scenario: Sessão antiga após o deploy
- GIVEN uma sessão criada antes desta capability existir
- WHEN o usuário faz uma requisição após o deploy
- THEN o sistema SHALL continuar autenticando essa sessão, tratando-a como `dono`
- AND SHALL NOT exigir novo login imediato

## Requirement: Isolamento de dados entre barbearias (auth-tenancy)
O sistema SHALL impedir que um usuário de uma barbearia crie, veja ou altere logins,
funcionários ou vínculos de barbeiro de outra barbearia, em qualquer operação.

#### Scenario: Acesso cruzado a gestão de funcionário
- GIVEN um funcionário da barbearia X
- WHEN um dono da barbearia Y tenta gerenciar (ver, redefinir senha, desativar) esse login
- THEN o sistema SHALL retornar "não encontrado", sem expor a existência do registro
