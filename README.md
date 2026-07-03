# Blade Mídia — SaaS de Retenção para Barbearias

Plataforma de gestão operacional para barbearias: CRM, atendimento inteligente via WhatsApp
com IA, confirmação automática de agendamentos, reativação de clientes inativos e relatórios.

> **Estado atual:** fundação do projeto (Spec-Driven Development + arquitetura proposta).
> Nenhuma funcionalidade implementada ainda — por decisão: nada é implementado sem spec aprovada.

## Comece por aqui

| Quero... | Leia |
|---|---|
| Entender o negócio e as decisões estruturais | [openspec/project.md](openspec/project.md) |
| Entender o fluxo de desenvolvimento (obrigatório) | [openspec/workflow.md](openspec/workflow.md) |
| Escrever specs/artefatos do jeito certo | [openspec/conventions.md](openspec/conventions.md) |
| Criar uma nova funcionalidade | [openspec/changes/README.md](openspec/changes/README.md) |
| Ver a arquitetura proposta e por quê | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Consultar o método SDD completo | [docs/sdd/](docs/sdd/) |
| Contexto de negócio (ICP, tom de voz, design system) | [docs/business/contexto-negocio.md](docs/business/contexto-negocio.md) |

## Estrutura do repositório

```text
openspec/
  project.md            # contexto oficial do projeto (fonte da verdade)
  workflow.md           # fluxo SDD, DoD, branches, versionamento
  conventions.md        # convenções de escrita, docs e código
  templates/            # exploration, proposal, spec-delta, design, tasks
  specs/                # specs permanentes por capability (comportamento do sistema)
  changes/              # mudanças em andamento + archive/
docs/
  sdd/                  # método Spec-Driven Development (prompts, checklist)
  business/             # contexto de negócio consolidado
  architecture/         # overview + ADRs (decisões com justificativa)
apps/, packages/        # (futuro) código — criado pela change init-project-skeleton
```

## O fluxo, em uma linha

```text
Ideia → Refinamento → Discussão → Spec → Validação → Arquitetura
      → Plano técnico → Implementação → Testes → Revisão → Conclusão
```

**Nenhuma implementação antes da aprovação da especificação.**
