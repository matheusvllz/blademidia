# Blade Mídia — Contexto Oficial do Projeto

> Fonte da verdade sobre o negócio, o produto e as decisões estruturais.
> Toda exploração crítica, proposal e design deve ser coerente com este documento.
> Alterações aqui exigem aprovação explícita dos sócios.

## O negócio

A **Blade Mídia** é uma empresa especializada exclusivamente em barbearias (Brasília/DF na fase 1). Dois sócios: **Vítor Machado** (implementação técnica) e **Matheus Vellozo** (comercial: prospecção, reuniões, fechamento).

O produto é um **SaaS próprio de retenção e atendimento automatizado**. O objetivo NÃO é gerar leads para as barbearias — é resolver o gargalo operacional:

1. Clientes que enviam mensagem no WhatsApp e não recebem resposta;
2. Clientes que deixam de agendar;
3. Clientes que agendam e não comparecem (no-show);
4. Clientes antigos que somem e nunca são recontatados.

Modelo comercial (plano de ação v1.0): mensalidade **Pro R$697/mês** + setup **R$997**. Meta de 90 dias: 5 clientes pagantes (~R$3.485 MRR).

## O produto (visão)

Plataforma completa de gestão operacional para barbearias:

- **CRM próprio** — clientes, histórico completo, status ativo/inativo;
- **Atendimento inteligente via WhatsApp** — IA responde clientes em segundos;
- **Agendamento** — serviços, barbeiros, horários;
- **Confirmação automática** — 24h antes do horário;
- **Reativação automática** — cliente sem visita há 21+ dias recebe mensagem;
- **Follow-up automático**;
- **Painel web completo** — operação e visão do negócio;
- **Relatório mensal** — resultados que justificam a mensalidade.

### Persona do cliente final (ICP)

**Rafael, o barbeiro-dono** — 26-40 anos, 1-3 cadeiras, fatura R$10-35k/mês. Usa Instagram + WhatsApp + papel/memória. Nunca usou CRM. Não usa jargão técnico ("lead", "CRM", "funil" não existem no vocabulário dele). Objeção central: *"não tenho tempo de aprender mais uma coisa"*.

**Consequência de produto:** a promessa comercial é "você não opera nada". O sistema deve funcionar sem o barbeiro precisar mexer; o painel existe, mas nada essencial pode depender de o barbeiro operá-lo.

### Fora do escopo do produto (v1)

- Geração de leads / tráfego pago;
- Pagamentos e cobrança dentro do sistema;
- App mobile nativo;
- Franquias / barbearias grandes com gestão profissional;
- Salões que atendem público feminino.

## Decisões estruturais (aprovadas em 2026-07-03)

| # | Decisão | Detalhe |
|---|---------|---------|
| D1 | **O SaaS substitui o stack no-code desde já** | O plano de ação previa Typebot/n8n/Sheets; decidiu-se construir o produto real desde o início. O no-code não será usado. |
| D2 | **Integração WhatsApp: decisão em aberto** | A arquitetura isola o provedor atrás de uma interface única (`WhatsAppProvider`). Uma spike técnica compara API oficial (Meta Cloud) vs não-oficial (Evolution API) antes do design final. Ver ADR-0004. |
| D3 | **IA conversacional desde a v1** | LLM responde os clientes das barbearias; fluxos determinísticos para agendamento/confirmação. Ver ADR-0005. |
| D4 | **Orçamento de infra: até ~R$150-200/mês** | Restrição ativa em toda decisão de arquitetura. |
| D5 | **Multi-tenancy simples** | Dados isolados por barbearia (tenant) em instância única. Sem infraestrutura distribuída na v1, mas o modelo de dados nasce multi-tenant. Ver ADR-0007. |
| D6 | **Desenvolvimento via Spec-Driven Development** | Nenhuma implementação sem spec aprovada. Ver [workflow.md](workflow.md). |

## Restrições e requisitos não funcionais transversais

- **LGPD**: o sistema armazena dados pessoais (nome, telefone, histórico de visitas) de clientes finais das barbearias. Consentimento, retenção e exclusão devem ser considerados em toda spec que toque dados de clientes.
- **O número de WhatsApp é o ativo mais valioso do barbeiro.** Qualquer risco de banimento é risco de negócio crítico.
- **Time técnico de 1 pessoa** (Vítor) com desenvolvimento assistido por IA. Simplicidade operacional > sofisticação arquitetural.
- **Idioma**: toda a interface e comunicação com clientes em PT-BR. Linguagem do painel segue o vocabulário do barbeiro (ver briefing de copy — nunca "lead", "CRM", "conversão").
- **Design System**: paleta Ink `#0D0D0D` / Gold `#C9A84C` / Chalk `#F5F2EC` / Steel `#2B2B2B` / Wire `#8C8C8C`; tipografia Barlow Condensed (display), Barlow (corpo), Space Mono (labels). Detalhes em [docs/business/contexto-negocio.md](../docs/business/contexto-negocio.md).

## Documentos de referência

| Documento | Onde |
|---|---|
| Método SDD (prompts, templates, checklist) | [docs/sdd/](../docs/sdd/) |
| Contexto de negócio (briefing, plano, design system — extrato) | [docs/business/contexto-negocio.md](../docs/business/contexto-negocio.md) |
| Arquitetura proposta | [docs/architecture/overview.md](../docs/architecture/overview.md) |
| Decisões de arquitetura (ADRs) | [docs/architecture/decisions/](../docs/architecture/decisions/) |
| Fluxo de desenvolvimento | [workflow.md](workflow.md) |
| Convenções de escrita e código | [conventions.md](conventions.md) |
| Registro de capabilities | [specs/README.md](specs/README.md) |
