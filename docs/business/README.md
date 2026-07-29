# Contexto Estratégico da Blade Mídia

Esta pasta guarda a **estratégia** do negócio: o problema que resolvemos, para quem, e como
falamos sobre isso. É a camada que orienta produto, site, marketing, prospecção e vendas.

## Os 3 guias oficiais (fonte de verdade estratégica)

Aprovados pelos sócios em **2026-07-28**. Devem ser consultados como **fonte oficial de
referência para qualquer decisão futura** relacionada a dor, persona e comunicação — por
humanos e por qualquer IA que trabalhe neste repositório.

| # | Guia | Define | Use quando |
|---|---|---|---|
| **1** | **[Guia da Dor](dor-central.md)** | **o problema central** que a empresa resolve — o que é, quem sofre, como se manifesta, por que existe, quanto custa, por que as alternativas falham, e a hierarquia entre dor central e dores secundárias | for decidir o que o produto resolve, priorizar roadmap, justificar preço, escrever proposta de valor ou escolher qual problema uma peça ataca |
| **2** | **[Guia da Persona](persona-icp.md)** | **quem é o cliente ideal** — perfil, contexto, rotina, maturidade digital, objetivos, medos, frustrações, dores explícitas e ocultas, desejos, objeções, quem influencia, como decide, como fala — e **quem não é cliente** | for definir público, qualificar/desqualificar um prospect, escolher canal, calibrar preço, desenhar UX ou escrever qualquer texto de mercado |
| **3** | **[Guia de COPY](guia-de-copy.md)** | **como a empresa se comunica** — posicionamento, mensagem central, narrativa mestra, gatilhos, tom de voz, léxico obrigatório e banido, tradução de funcionalidade em benefício, copy por nível de consciência, aplicação canal a canal, objeções e checklist | for escrever **qualquer** texto: site, landing, anúncio, prospecção, WhatsApp, reunião, Instagram, e-mail, microcopy do produto e mensagens automáticas ao cliente final |

### Como os três funcionam juntos

```text
DOR      →  define o PROBLEMA         (o que resolvemos)
PERSONA  →  define PARA QUEM          (com quem estamos falando)
COPY     →  define COMO COMUNICAR     (de que forma dizemos)
```

Uma peça, uma spec ou uma decisão comercial só está correta quando passa nos três.
**Precedência em caso de conflito: Dor > Persona > COPY.** O Guia de COPY deriva dos outros
dois — se divergir, é ele que se corrige.

**Regra de manutenção:** nenhum documento do repositório pode criar informação conflitante com
os guias. Encontrou divergência? Corrija o documento errado ou suba a questão para os sócios —
nunca deixe as duas versões coexistindo.

## Documentos de apoio

| Documento | Papel |
|---|---|
| [contexto-negocio.md](contexto-negocio.md) | extrato dos documentos originais (briefing, plano de ação, design system). **Secundário** aos guias: vale para design system, tom de voz original e números do plano |

## Constantes oficiais (repetidas aqui para consulta rápida)

| Constante | Valor |
|---|---|
| Corte | **R$30-55** |
| Corte + barba | **R$55-80** |
| Ticket médio de trabalho | **R$45** |
| ICP — tamanho | 2-4 cadeiras, ≥1 barbeiro além do dono, sem recepcionista |
| ICP — faturamento da casa | R$18-45k/mês · 400-1.000 atendimentos/mês |
| ICP — dono | 28-38 anos, **corta todos os dias** (critério definidor) |
| Praça | Brasília/DF (fase 1) |
| Preço | R$697/mês + setup R$997 |
| Payback | ~16 atendimentos recuperados/mês ("evitar 4 furos por semana") |
| Eixo de posicionamento | capacidade de atendimento |
| Promessa central | "Sistema instalado, funcionando, sem você operar nada." |
| Teste de coerência | "seu zap fica sem ninguém e você perde cliente sem saber" |

## Onde isso é referenciado no SDD

- [openspec/project.md](../../openspec/project.md) — § "Os 3 guias estratégicos oficiais", D0, posicionamento, ICP, estratégia comercial e de marketing
- [openspec/workflow.md](../../openspec/workflow.md) — portão estratégico do fluxo e DoD
- [openspec/conventions.md](../../openspec/conventions.md) — vocabulário obrigatório na UI
- [openspec/templates/exploration.md](../../openspec/templates/exploration.md) — seção "Coerência estratégica"
- [docs/sdd/04-checklist-avaliador.md](../sdd/04-checklist-avaliador.md) — § 0 do checklist
- [CLAUDE.md](../../CLAUDE.md) — passo 0 obrigatório para agentes de IA
