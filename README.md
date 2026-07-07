# Blade Mídia — Agência + SaaS de Retenção para Barbearias

Este repositório é a **base única de trabalho da Blade Mídia** e serve a três frentes:

1. **O site da agência** (`site/`) — a landing de vendas publicada em
   [blademidia.netlify.app](https://blademidia.netlify.app) (Netlify conectado a este repo).
2. **A operação da agência** (`automation/` + `infra/`) — presets de atendimento
   automático no WhatsApp, provisionamento de cliente novo, controle dos dados e das
   instâncias de cada cliente. É o que permite entregar um cliente novo com agilidade:
   copiar o preset, preencher, provisionar, escanear QR.
3. **O produto SaaS** (`openspec/` + `docs/` + `apps/`/`packages/`) — CRM,
   agendamento, confirmação automática e reativação, desenvolvido via
   Spec-Driven Development. O CRM de clientes (Fase 1, change `add-crm-clientes`)
   é a primeira capability implementada — ver [apps/web/README.md](apps/web/README.md).

Filosofia de entrega: **SLC** (Simple, Lovable, Complete) — escopo enxuto, acabamento
bom, nada entregue pela metade.

## Operadores

| Sócio | Papel |
|---|---|
| **Vítor Machado** | Técnico — constrói e opera o sistema, monitora a saúde das conexões |
| **Matheus Vellozo** | Comercial — prospecção, fechamento, relação com cada barbearia |

## Comece por aqui

| Quero... | Leia / rode |
|---|---|
| Rodar o CRM de clientes do produto (painel do barbeiro) | [apps/web/README.md](apps/web/README.md) |
| Testar a automação de atendimento agora (sem instalar nada) | [automation/README.md](automation/README.md) — `node automation/webhook-server.mjs` + `node automation/simulate.mjs` |
| Provisionar um cliente novo (runbook) | [automation/README.md](automation/README.md) § Onboarding |
| Subir o gateway WhatsApp (Evolution API) | [infra/evolution/](infra/evolution/) — compose local e de produção |
| Mexer no site da agência | `site/` (estático puro; publica via Netlify ao dar push na `main`) |
| Entender o negócio e as decisões estruturais | [openspec/project.md](openspec/project.md) |
| Entender o fluxo de desenvolvimento do produto | [openspec/workflow.md](openspec/workflow.md) |
| Ver a arquitetura proposta e por quê | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Contexto de negócio (ICP, tom de voz, design system) | [docs/business/contexto-negocio.md](docs/business/contexto-negocio.md) |

## Estrutura do repositório

```text
site/                  # landing de vendas da agência (estático, publica no Netlify)
automation/            # motor de atendimento + presets por cliente + provisionamento
  presets/             # barbearia-default.json (base) + clientes/<slug>.json (reais)
infra/
  evolution/           # Docker Compose do gateway WhatsApp (local e produção)
openspec/              # specs, changes e convenções do produto (SDD)
docs/                  # método SDD, contexto de negócio, arquitetura e ADRs
apps/web/              # painel do produto (Next.js) — CRM de clientes (Fase 1)
packages/db/           # schema Drizzle + repositórios + migração (produto)
```

## Regras rápidas (as completas estão em [CLAUDE.md](CLAUDE.md) e [openspec/](openspec/))

- Produto: **nenhuma implementação sem spec aprovada** (fluxo SDD).
- Nunca logar conteúdo de mensagem de cliente final nem telefone completo.
- Vocabulário do barbeiro em toda UI/copy: "cliente", "horário", "zap" —
  nunca "lead", "funil", "CRM".
- O número de WhatsApp é o ativo mais valioso do barbeiro — warm-up e rate limit
  não são opcionais.
