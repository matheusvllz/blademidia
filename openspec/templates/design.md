# Design: <título da mudança>

## Context
<Resumo técnico do cenário atual.>

## Goals and Constraints
### Goals
- ...
### Constraints
- <orçamento de infra (D4), multi-tenancy (D5), LGPD, provedor WhatsApp abstraído (D2)>

## Proposed Architecture
...

## Technical Decisions
### Decision 1: <nome>
- Decision: ...
- Rationale: ...
- Trade-offs: ...
- Consequences: ...

<Se a decisão for transversal ao produto, promova a um ADR e referencie aqui.>

## Alternatives Considered
### Alternative 1: <nome>
- Description: ...
- Why not chosen: ...

## Affected Components
| Component | Change | Reason |
|---|---|---|

## Main Flows
### Flow 1: <nome>
1. ...

## Error Flows
### Error Flow 1: <nome>
1. ...

## API / Contract Design
<Endpoints, eventos, schemas — quando aplicável.>

## Data Model and Persistence
<Entidades, tabelas, índices, migrações. Toda tabela de dados de negócio tem `barbershop_id`.>

## Authentication and Authorization
...

## Security and Privacy
<Dados sensíveis, LGPD, logs seguros.>

## Observability
### Logs
- ...
### Metrics
- ...
### Alerts
- ...

## Testing Strategy
- Unit: ...
- Integration: ...
- Contract: ...
- E2E: ...
- Manual: ...

## Migration Strategy
...

## Rollback Plan
...

## Compatibility
...

## Remaining Risks
| Risk | Impact | Mitigation | Owner/Decision |
|---|---|---|---|

## Open Questions
- ...
