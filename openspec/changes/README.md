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
| — | — | — | — |

> Mantenha esta tabela atualizada ao criar/arquivar changes.
