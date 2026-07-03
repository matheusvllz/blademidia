# Delta for <capability>

> Se a capability ainda não existe em `openspec/specs/`, este delta conterá apenas
> `ADDED Requirements` e, na conclusão da change, vira a spec inicial da capability.

## ADDED Requirements

### Requirement: <nome do requisito>
O sistema SHALL <comportamento obrigatório, observável e verificável>.

#### Scenario: <caminho feliz>
- GIVEN ...
- WHEN ...
- THEN ...
- AND ...

#### Scenario: <entrada inválida ou falha externa>
- GIVEN ...
- WHEN ...
- THEN ...

## MODIFIED Requirements

### Requirement: <nome do requisito existente>
O sistema SHALL <novo comportamento>.

Previously: <comportamento anterior>.

#### Scenario: <cenário alterado>
- GIVEN ...
- WHEN ...
- THEN ...

## REMOVED Requirements

### Requirement: <nome do requisito removido>
Reason: <justificativa>.
Migration/Compatibility: <impacto, se houver>.
