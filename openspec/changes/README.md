# Changes

Cada mudança do sistema vive em `openspec/changes/<change-id>/` enquanto ativa e é movida
para `archive/` quando concluída (ou rejeitada).

## Estrutura de uma change

```text
openspec/changes/<change-id>/
  exploration.md          # etapas 1-3: ideia, refinamento, discussão
  proposal.md             # etapa 4: por quê e o quê (com Status)
  specs/
    <capability>/spec.md  # etapa 4: deltas de comportamento
  design.md               # etapa 6: como (decisões técnicas)
  tasks.md                # etapa 7: plano de execução
```

Templates em [`openspec/templates/`](../templates/). Fluxo completo e portões de aprovação
em [`openspec/workflow.md`](../workflow.md).

## Como iniciar uma change

1. Escolha um `change-id` kebab-case orientado a resultado (ex.: `add-appointment-confirmation`).
2. Crie a pasta e copie `templates/exploration.md`.
3. Registre a ideia original e conduza a exploração crítica (use o prompt em
   [`docs/sdd/01-prompt-final-completo.md`](../../docs/sdd/01-prompt-final-completo.md) com um agente de IA).
4. Resolva as perguntas bloqueantes com os sócios antes de escrever o proposal.

## Índice de changes ativas

| Change ID | Título | Status | Capabilities |
|---|---|---|---|
| `add-agency-ops-panel` | Painel de Operação da Agência | Approved (só Fase 0 de 5 entregue; 5/21 tasks) | operacional (`automation/`, `infra/`) — fora do fluxo SDD do produto |

> Mantenha esta tabela atualizada ao criar/arquivar changes. Próxima a abrir:
> `add-confirmacao-agendamento` (Fase 5.3 do produto) — ver
> [`docs/sdd/06-plano-execucao-fase-5.md`](../../docs/sdd/06-plano-execucao-fase-5.md).

## Índice de changes arquivadas (produto, concluídas)

| Change ID | Capability(ies) | Fase |
|---|---|---|
| `add-crm-clientes` | `crm-clientes` | 1 |
| `add-agendamento` | `agendamento` | 2 |
| `add-agenda-visao-semanal` | `agendamento` (delta) | — |
| `add-relatorios` | `relatorios` | 3 |
| `add-fidelizacao-e-funcionarios` | `fidelizacao-clientes`, `auth-tenancy` | 4 |
| `add-whatsapp-canal` | `whatsapp-canal`, `crm-clientes` (delta) | 5 (1/4) |
| `add-atendimento-ia` | `atendimento-ia` | 5 (2/4) |
| `init-project-skeleton` | — (infraestrutura; `Superseded`, nunca chegou a `Approved` — ver o proposal arquivado) | — |

Todas em `openspec/changes/archive/`, specs permanentes correspondentes em `openspec/specs/`.
