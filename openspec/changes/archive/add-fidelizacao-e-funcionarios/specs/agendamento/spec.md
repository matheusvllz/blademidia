# Capability: agendamento (delta — change `add-fidelizacao-e-funcionarios`)

> Delta de spec proposto pela change `add-fidelizacao-e-funcionarios` (Fase 4). Ao concluir
> (etapa 11), o requisito MODIFIED substitui o correspondente na spec permanente
> `openspec/specs/agendamento/spec.md`.
>
> Esta change não altera nenhuma regra de disponibilidade, conflito ou ciclo de vida do
> agendamento — apenas remove a restrição absoluta de que um barbeiro nunca pode ter login. As
> regras de QUEM pode logar como funcionário e o que um funcionário pode fazer pertencem a
> `auth-tenancy`, não a esta capability.

## MODIFIED Requirements

### Requirement: Barbeiro como recurso da agenda, com login opcional
O sistema SHALL tratar o barbeiro como recurso da agenda (grade, exceções, agendamentos)
independentemente de ter ou não credenciais de login. O login, quando existir, é gerido e
autorizado pela capability `auth-tenancy` — a existência de agendamentos, grade ou exceções de
um barbeiro SHALL NOT depender de ele ter login.

#### Scenario: Barbeiro sem login (padrão)
- GIVEN um barbeiro cadastrado sem login definido
- WHEN se avalia o acesso ao sistema
- THEN o barbeiro SHALL continuar sendo apenas um recurso da agenda, sem exigir credenciais

#### Scenario: Barbeiro com login (funcionário)
- GIVEN um barbeiro que passou a ter login (papel `funcionario`, via `auth-tenancy`)
- WHEN ele loga no sistema
- THEN o sistema SHALL continuar reconhecendo-o como o mesmo recurso `barbers` da agenda,
  com todo o histórico de agendamentos preservado
