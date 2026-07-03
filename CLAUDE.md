# Instruções para agentes de IA neste repositório

Este projeto usa **Spec-Driven Development**. Estas regras não são opcionais.

## Antes de qualquer tarefa

1. Leia [openspec/project.md](openspec/project.md) — contexto e decisões estruturais (D1-D6).
2. Se a tarefa pertence a uma change, leia nesta ordem: `proposal.md` → `specs/` da change → `design.md` → `tasks.md`.
3. Consulte [openspec/conventions.md](openspec/conventions.md) para formato de requisitos, nomenclatura e padrões de código.

## Regras invioláveis

- **Nunca implemente funcionalidade sem spec aprovada** (`Status: Approved` no proposal). Se pedirem código sem spec, aponte o fluxo em [openspec/workflow.md](openspec/workflow.md) e ofereça iniciar a exploração crítica.
- **Nunca invente requisitos.** O que não estiver confirmado é Premissa, Ponto em aberto ou Risco — classifique explicitamente.
- Specs descrevem comportamento observável; decisões técnicas vão no `design.md`; decisões transversais viram ADR em `docs/architecture/decisions/`.
- Requisitos: PT-BR + `SHALL`/`MUST`/`SHOULD`/`MAY`; cenários GIVEN/WHEN/THEN; sem termos vagos sem métrica.
- Toda query de dados de negócio é escopada por `barbershop_id` via camada de repositório (ADR-0007). Sem exceções.
- Provedores externos (WhatsApp, LLM) só via interfaces em `packages/whatsapp` e `packages/ai`.
- Nunca logar conteúdo de mensagens de clientes finais, telefones completos ou segredos.
- UI e mensagens em PT-BR com o vocabulário do barbeiro (proibido: "lead", "funil", "conversão" — ver contexto de negócio).
- Ao concluir tarefas do `tasks.md`, marque `[x]` somente com evidência de validação (teste passando, saída de comando).

## Fluxo obrigatório de toda funcionalidade

```text
Ideia → Refinamento → Discussão → Spec → Validação (portão humano) → Arquitetura
      → Plano técnico → Implementação → Testes → Revisão → Conclusão
```

Exceção única: mudanças triviais (typo, bump de dependência) via `fix/...` — critério objetivo no workflow.

## Git

- Branch: `feature/<change-id>` ou `fix/<descricao>`; nunca commitar direto na `main`.
- Commits: Conventional Commits com escopo = capability (`feat(agendamento): ... [<change-id>]`).
- PR passa pelo checklist do avaliador: [docs/sdd/04-checklist-avaliador.md](docs/sdd/04-checklist-avaliador.md).
