# Instruções para agentes de IA neste repositório

Este projeto usa **Spec-Driven Development**. Estas regras não são opcionais.

## O que é este repositório (leia primeiro)

A Blade Mídia é uma agência que vende **retenção/atendimento automático para barbearias**.
Sócio único: **Matheus Vellozo** (comercial e operação geral do negócio). Pai de Matheus
(desenvolvedor) apoia pontualmente a implementação técnica, sem ser sócio. *(Atualizado em
2026-09-07 — até então a estrutura era de dois sócios; Vítor Machado não faz mais parte da
operação.)* Este repositório
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
    barbearias (tenants), CRM dos clientes finais, detecção de inativos. Para Matheus (e apoio
    técnico pontual do pai).
  - **Painel do CLIENTE** (`/cliente?barbershop=<slug>`, pasta `client-panel/`):
    **deliberadamente simples e claro (não segue o estilo do site)** — é ferramenta do
    barbeiro no celular. Preset clonável por cliente.
- **Infra Docker** (`infra/`): `infra/evolution/` (só o gateway) e `infra/stack/` (preset
  full-stack: Evolution + painel + motor + Caddy, um comando para pôr um cliente no ar no VPS).
  Imagens multi-arquitetura (roda em Oracle Free ARM ou Hetzner AMD).

**Regras operacionais herdadas (valem em toda a operação):** nunca logar conteúdo de mensagem
de cliente final nem telefone completo (mascarar `***1234`); todo acesso a dado é escopado por
barbearia; o número de WhatsApp é o ativo do barbeiro (warm-up/rate-limit não são opcionais).

## Estado atual e próximos passos (atualizado 2026-09-07 — manter este bloco em dia)

**Garantia rápida**: `node automation/check.mjs` — 17 checks que provam a estrutura
íntegra em segundos. Rode antes de demo, onboarding ou depois de qualquer mudança.

**O que JÁ funciona (validado):**
- Site no ar (blademidia.netlify.app) com auto-deploy a cada push em `site/`, copy revisada
  conforme o guia de copy oficial.
- Formulário de diagnóstico do site capturando leads no Netlify Forms (ver painel
  Netlify → Forms) com notificação por e-mail a Matheus a cada envio (checar se o e-mail
  cadastrado nas notificações do Netlify já foi atualizado — isso é config externa, não só doc).
- Stack Evolution local em Docker (`infra/evolution/docker-compose.local.yml`) — testado:
  instância criada via `provision.mjs`, QR gerado, eventos reais chegando no
  `webhook-server.mjs`. Auth local: API key `local-dev-key` (só dev; produção usa `.env`).
  Continua sendo a ferramenta da **operação da agência** (`automation/`) — não é o canal do
  produto (ver Fase 5 abaixo, que usa Meta Cloud API via BSP, não Evolution).
- Painéis da agência (`/`) e do cliente (`/cliente?barbershop=<slug>`) via
  `node automation/panel-server.mjs`.
- **Produto SaaS completo até a Fase 4**, mergeado na `main`: CRM de clientes
  (`add-crm-clientes`), agenda com anti-double-booking (`add-agendamento` +
  `add-agenda-visao-semanal`), relatórios com PDF (`add-relatorios`), fidelização de
  clientes + papéis dono/funcionário (`add-fidelizacao-e-funcionarios`). Todas arquivadas em
  `openspec/changes/archive/`, specs permanentes em `openspec/specs/`.

**Próximos passos, em ordem:**
1. **Fase 5 do produto — canal WhatsApp + atendimento por IA.** É o item ativo agora.
   Plano de execução completo (decisões de arquitetura, contratos da Meta/BSP, barra de
   verificação) em [`docs/sdd/06-plano-execucao-fase-5.md`](docs/sdd/06-plano-execucao-fase-5.md)
   — leia-o inteiro antes de tocar em qualquer coisa desta fase. Sequência:
   `add-whatsapp-canal` → `add-atendimento-ia` → `add-confirmacao-agendamento` →
   `add-reativacao-clientes`. D2 (provedor) resolvida: Meta Cloud API via BSP com
   coexistência (número continua no celular do barbeiro) — ver ADR-0004.
2. **Pendências comerciais da operação da agência (Matheus)**: preço da taxa de gestão,
   texto de contrato (cancelamento/limites de responsabilidade), regra de carência de
   inadimplência — ver perguntas bloqueantes em
   `openspec/changes/add-agency-ops-panel/exploration.md`.
3. **Validar dor e persona em campo (Matheus)**: [dor-central.md](docs/business/dor-central.md)
   e [persona-icp.md](docs/business/persona-icp.md) listam as hipóteses a validar (H1-H8 e
   P1-P8) em conversas reais de prospecção. H1 e H2 (ele perde por demora **e não sabe disso**)
   são as decisivas: se caírem, a dor central muda e os três documentos de negócio se reescrevem.

**Convenções de infraestrutura (não quebrar):** Netlify site_id
`ef53f93d-117f-420f-935b-0348612c17dc` (conta vodetmor/Intellecta) publica deste repo,
dir `site/`; secret `NETLIFY_BUILD_HOOK` no GitHub aciona o deploy; push direto na `main`
é aceito para `site/` e `automation/` (operacional), produto exige branch+PR.

## Antes de qualquer tarefa

0. **Contexto estratégico (obrigatório para qualquer coisa que toque produto, site, copy,
   posicionamento, UI ou prospecção):** leia, nesta ordem,
   [docs/business/dor-central.md](docs/business/dor-central.md) (**o que** resolvemos),
   [docs/business/persona-icp.md](docs/business/persona-icp.md) (**para quem**) e
   [docs/business/guia-de-copy.md](docs/business/guia-de-copy.md) (**como falamos** — fonte
   oficial de toda decisão de copy e comunicação, com protocolo próprio para IA na § 17).
   São a fonte da verdade estratégica e prevalecem sobre o extrato em
   [docs/business/contexto-negocio.md](docs/business/contexto-negocio.md). Regras derivadas:
   **uma peça de comunicação nunca tem duas teses** (se não puder ser resumida em "seu zap fica
   sem ninguém e você perde cliente sem saber", está fora do posicionamento); **ticket de
   referência: corte R$30-55, médio R$45**; **todo número vem com a conta à vista**.
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
- UI e mensagens em PT-BR com o vocabulário do barbeiro (proibido: "lead", "funil", "conversão" — lista completa e tabela de tradução em [docs/business/guia-de-copy.md](docs/business/guia-de-copy.md) § 8).
- **Todo texto voltado ao mercado ou exibido ao usuário segue o [guia de copy](docs/business/guia-de-copy.md)** — inclusive microcopy de UI, estados vazios e mensagens automáticas enviadas ao cliente final (§ 13.9). Antes de entregar, rode o checklist da § 14.
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
