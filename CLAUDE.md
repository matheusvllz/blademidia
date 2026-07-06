# Instruções para agentes de IA neste repositório

Este projeto usa **Spec-Driven Development**. Estas regras não são opcionais.

## O que é este repositório (leia primeiro)

A Blade Mídia é uma agência que vende **retenção/atendimento automático para barbearias**.
Sócios: **Vítor Machado** (técnico) e **Matheus Vellozo** (comercial). Este repositório
único serve **três frentes** — saiba em qual você está mexendo antes de agir:

| Frente | Pasta | Regime |
|---|---|---|
| **Site da agência** (landing de vendas) | `site/` | Estático puro, sem build. Publica no Netlify a cada push na `main` que toque `site/` (workflow `.github/workflows/deploy-site.yml`). Formatar JS com Prettier (ver `site/README.md`). |
| **Operação da agência** (atendimento + CRM + presets) | `automation/`, `infra/` | Ferramenta operacional. Node puro, zero deps. **Não segue o fluxo SDD completo** — é tooling interno, evolui direto (mas com os mesmos princípios: sem logar dado sensível, escopo por barbearia). |
| **Produto SaaS** (CRM/agendamento definitivos) | `openspec/`, `docs/`, futuro `apps/`+`packages/` | **Segue SDD à risca**: nada de implementação sem spec `Approved`. |

**Regra de ouro do regime:** mudança em `site/` ou `automation/` é operacional e pode ser
feita direto (com bom senso e validação). Mudança que cria capability do **produto**
(`apps/`, `packages/`, specs novas) passa pelo fluxo SDD abaixo, sem exceção.

## Operação da agência — como funciona hoje (`automation/`)

Tudo roda em **Node puro (18+), sem `npm install`**. Ver `automation/README.md` para o runbook.

- **Presets de atendimento** (`automation/presets/`): `barbearia-default.json` tem respostas,
  regras (confirmação 24h, reativação 21d, escalação p/ humano) e warm-up anti-ban. Cliente
  novo = copiar para `presets/clientes/<slug>.json` e preencher.
- **Motor de atendimento** (`webhook-server.mjs` + `lib/engine.mjs`): auto-resposta por
  intenção (preços/agendamento/saudação), sem LLM (a IA conversacional é do produto). Testável
  sem WhatsApp/Docker via `simulate.mjs` (dry-run).
- **Provisionamento** (`provision.mjs`, `status.mjs`): cria a instância Evolution do cliente
  e o QR de pareamento. Depende de `EVOLUTION_URL`/`EVOLUTION_API_KEY` (senão, dry-run).
- **Dois painéis** (`panel-server.mjs`, dados locais em `automation/data/` — fora do git):
  - **Painel da AGÊNCIA** (`/`, pasta `panel/`): estilo do site (Ink/Gold). Gestão de
    barbearias (tenants), CRM dos clientes finais, detecção de inativos. Para Vítor e Matheus.
  - **Painel do CLIENTE** (`/cliente?barbershop=<slug>`, pasta `client-panel/`):
    **deliberadamente simples e claro (não segue o estilo do site)** — é ferramenta do
    barbeiro no celular. Preset clonável por cliente.
- **Infra Docker** (`infra/`): `infra/evolution/` (só o gateway) e `infra/stack/` (preset
  full-stack: Evolution + painel + motor + Caddy, um comando para pôr um cliente no ar no VPS).
  Imagens multi-arquitetura (roda em Oracle Free ARM ou Hetzner AMD).

**Regras operacionais herdadas (valem em toda a operação):** nunca logar conteúdo de mensagem
de cliente final nem telefone completo (mascarar `***1234`); todo acesso a dado é escopado por
barbearia; o número de WhatsApp é o ativo do barbeiro (warm-up/rate-limit não são opcionais).

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
