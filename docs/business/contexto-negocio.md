# Contexto de Negócio — Extrato Consolidado

> Extrato dos três documentos oficiais (Briefing de Copywriting v1.0, Plano de Ação v1.0,
> Design System 2025) com os fatos que impactam o produto. Os documentos originais (HTML)
> são a fonte primária; em caso de conflito, eles prevalecem.

> ⚠️ **Este documento é secundário desde 2026-07-28.** Dor, persona e comunicação passaram a ser
> definidas pelos **3 guias estratégicos oficiais**, aprovados pelos sócios:
>
> | Guia | Papel |
> |---|---|
> | **[Guia da Dor](dor-central.md)** (`dor-central.md`) | define o problema central que a empresa resolve |
> | **[Guia da Persona](persona-icp.md)** (`persona-icp.md`) | define quem é o cliente ideal e quem não é |
> | **[Guia de COPY](guia-de-copy.md)** (`guia-de-copy.md`) | define como a empresa se comunica em todos os canais |
>
> **Precedência: Dor > Persona > COPY > este extrato.** Em qualquer conflito sobre problema,
> público, posicionamento, proposta de valor ou linguagem, os guias prevalecem. Este documento
> permanece como referência de **design system, tom de voz original e números do plano de ação**.
>
> **Ticket de referência (2026-07-28):** corte **R$30-55** · corte + barba **R$55-80** ·
> ticket médio de trabalho **R$45**.

## Posicionamento

> Definição normativa completa: [Guia de COPY](guia-de-copy.md) §§ 2-3 e
> [Guia da Dor](dor-central.md) § 11.

- Exclusivamente barbearias. "Não vendemos tráfego. Vendemos processo."
- **Eixo:** *capacidade de atendimento* — a barbearia continua atendendo quando o dono não pode.
  Cobre resposta, confirmação e reativação sob uma promessa só, e mantém a fronteira com
  tráfego/divulgação (fora do escopo).
- **Categoria reivindicada:** *atendimento operado para barbearia* — nunca "software de gestão".
  A comparação mental correta é com **recepcionista**, não com aplicativo.
- **Problema resolvido:** o zap sem operador — mensagem sem resposta enquanto o dono corta. O
  no-show e o cliente sumido são **consequências da mesma causa**, e entram como prova, nunca
  como teses paralelas.
- Tagline: *"Sua barbearia está perdendo cliente todo dia no WhatsApp. A gente resolve isso."*
- Promessa central: **"Sistema instalado, funcionando, sem você operar nada."**
- Proposta de valor em 1 linha: *"A gente atende o zap da sua barbearia enquanto você corta."*

## ICP — Rafael, o barbeiro-dono

> Resumo. A definição completa (rotina, medos, dores ocultas, objeções, influenciadores, como
> pesquisa, como fala, critérios de qualificação) está no
> [Guia da Persona](persona-icp.md), que é a fonte da verdade.

| Atributo | Valor |
|---|---|
| Perfil | 28-38 anos, barbearia independente, **2-4 cadeiras** com ≥1 barbeiro parceiro, sem recepcionista, dono presente e cortando |
| Faturamento | **R$18-45k/mês** da casa · corte R$30-55 · ticket médio R$45 · 400-1.000 atendimentos/mês |
| Tecnologia | Instagram + WhatsApp + papel/memória; nunca usou CRM |
| Dor principal | **O zap sem operador**: mensagem sem resposta enquanto ele corta → cliente marca em outro lugar e ele nunca fica sabendo. No-show e cliente sumido são **consequências da mesma causa**, não dores paralelas — ver [dor-central.md § 9](dor-central.md) |
| Objeções | "Já tentei e não funcionou" · "Não tenho tempo de aprender" · "Meu cliente é fiel" |
| Vocabulário | "horário", "agenda", "cliente", "corte", "zap", "encaixe" — nunca "lead/CRM/funil" |
| Anti-ICP | Franquia, barbearia de shopping 10+ barbeiros, salão feminino, dono com gestor de marketing, barbearia com recepcionista dedicada, barbeiro solo/cadeira alugada, casa abaixo de ~R$15k/mês, barbearia com menos de 6 meses, e quem procura tráfego/divulgação — lista completa em [persona-icp.md § 9.2](persona-icp.md) |

## Números do negócio (plano de ação)

- Pricing: **Pro R$697/mês** + **setup R$997**.
- Meta 90 dias: 5 clientes Pro ≈ R$3.485 MRR (+setups ≈ R$5-6k no mês 3).
- Mecânicas do produto prometidas: resposta automática no zap; **confirmação 24h antes**;
  **reativação após 21 dias** sem visita; relatório mensal de resultados.
- Critério operacional herdado: onboarding completo de um cliente novo em **< 4 horas**.
- Papéis: Vítor Machado = técnico; Matheus Vellozo = comercial; conteúdo/precificação/onboarding = compartilhado.

> **Seção "Quem opera" na landing (parked 2026-07-06):** existe intenção estratégica de
> apresentar Vítor e Matheus como operadores reais do sistema — mensagem de *accountability*
> ("tem gente com nome respondendo por isso, não um call center terceirizado"), que reforça
> a promessa "sem você operar nada" com um rosto humano. A primeira execução foi removida da
> landing por não ter convencido visualmente (decisão de Vítor). O código da seção
> (`Operators()` em `site/sections-bot.js`) está preservado, só desconectado do render.
> Retomar quando houver uma apresentação à altura — a ideia é boa, a execução que precisa melhorar.

## Relatório mensal (justificativa da mensalidade)

Formato definido no briefing — o produto deve produzir estes números por barbearia/mês:

- X clientes reativados automaticamente;
- Y no-shows evitados por confirmação;
- Z mensagens respondidas pelo bot;
- R$ estimado recuperado (reativados × ticket médio + no-shows evitados × ticket médio) —
  **ticket médio de referência: R$45**, sempre com a conta à vista.

O relatório é o instrumento que torna **visível a perda invisível** da dor central: ele mostra,
mês a mês, o que teria vazado e não vazou. Por isso é peça de retenção comercial, não enfeite.

## Tom de voz (impacta toda copy do produto)

> Princípios originais do briefing. A **aplicação prática** — exemplos ✅/❌, registro por canal,
> léxico obrigatório, tabela de tradução e checklist — está no
> [Guia de COPY](guia-de-copy.md) §§ 7-8, que é a fonte de trabalho do dia a dia.

1. **Direto** — frases curtas, sem rodeio;
2. **Confiante** — parceiro experiente, nunca arrogante;
3. **Específico** — número real com âncora de cálculo, nunca promessa vaga;
4. **Humano** — tecnologia invisível: "resposta automática no zap", não "bot"; "lista de clientes", não "CRM";
5. **Provocador** — nunca agressivo, e **nunca culpando o barbeiro** (regra da absolvição:
   o inimigo é a situação, não a pessoa — [Guia de COPY](guia-de-copy.md) § 5.3).

Proibições absolutas: jargão de marketing, "Olá, tudo bem?", promessas vagas, voz passiva,
adjetivos sem âncora, "nossa plataforma/solução" (use "o sistema"). Lista completa de palavras
banidas: [Guia de COPY](guia-de-copy.md) § 8.2.

## Design System

### Paleta

| Nome | Hex | Uso |
|---|---|---|
| Ink | `#0D0D0D` | Fundo principal, tipografia de destaque |
| Gold | `#C9A84C` | Acento primário |
| Chalk | `#F5F2EC` | Fundo claro, texto em fundo escuro |
| Steel | `#2B2B2B` | Superfícies secundárias, cards |
| Wire | `#8C8C8C` | Texto auxiliar, metadados, labels |

Auxiliares (do plano de ação): Gold light `#E8C97A`, Gold dark `#8A6E2A`, red `#C0392B`, green `#1A6B45`.

### Tipografia

| Papel | Fonte | Peso |
|---|---|---|
| Display / títulos | Barlow Condensed | 900 (títulos), 700 |
| Corpo | Barlow | 400 / 500 |
| Labels / metadados | Space Mono | 400 / 700 |

### Marca

- Wordmark: **BLADE.MÍDIA** (o ponto é intencional — precisão).
- ⚠️ **Inconsistência registrada**: o Design System mostra monograma "BH" e o texto de
  "Por que Mídia" descreve conceito de "casa/house" — resquício aparente de nome anterior.
  O plano de ação especifica monograma **BM**. Premissa adotada: **BM**. Validar com os sócios
  antes de gerar assets definitivos.
