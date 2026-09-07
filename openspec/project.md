# Blade Mídia — Contexto Oficial do Projeto

> Fonte da verdade sobre o negócio, o produto e as decisões estruturais.
> Toda exploração crítica, proposal e design deve ser coerente com este documento.
> Alterações aqui exigem aprovação explícita dos sócios.

## Os 3 guias estratégicos oficiais (leia antes de tudo)

> **Aprovados pelos sócios em 2026-07-28.** São a **principal fonte de verdade estratégica** da
> Blade Mídia. Qualquer decisão que envolva **dor, persona ou comunicação** consulta estes
> documentos — não os reinterpreta, não os reconstrói e não cria informação conflitante com eles.
> Este `project.md` continua sendo a fonte da verdade de **produto e decisões estruturais**, e é
> derivado deles no que toca a estratégia.

| # | Guia | Papel | Consultar sempre que… |
|---|---|---|---|
| **1** | **[Guia da Dor](../docs/business/dor-central.md)** (`docs/business/dor-central.md`) | Define e documenta **o problema central** que a empresa resolve: o que é, quem sofre, como se manifesta, por que existe, o que custa, por que as alternativas falham e qual é a hierarquia entre dor central e dores secundárias. | for decidir **o que** o produto resolve, priorizar roadmap, escrever proposta de valor, justificar preço ou definir qual problema uma peça de comunicação ataca. |
| **2** | **[Guia da Persona](../docs/business/persona-icp.md)** (`docs/business/persona-icp.md`) | Define **para quem** falamos: perfil, contexto, rotina, maturidade digital, desejos, medos, frustrações, dores ocultas, objeções, quem influencia, como decide, como fala — e quem **não** é cliente. | for definir público, qualificar ou desqualificar um cliente, escolher canal, calibrar preço, desenhar UX ou escrever qualquer texto voltado ao mercado. |
| **3** | **[Guia de COPY](../docs/business/guia-de-copy.md)** (`docs/business/guia-de-copy.md`) | Define **como comunicamos**: posicionamento, mensagem central, narrativa, gatilhos, tom de voz, léxico obrigatório e banido, tradução de funcionalidade em benefício, copy por nível de consciência e aplicação canal a canal. | for escrever **qualquer texto** — site, landing, anúncio, prospecção, WhatsApp, reunião, Instagram, e-mail, microcopy do produto e mensagens automáticas ao cliente final. |

**Como os três funcionam juntos:** a **Dor** define o problema → a **Persona** define para quem →
o **COPY** define como dizer. Uma peça só está correta quando passa nos três.
Precedência em caso de conflito: **Dor > Persona > COPY**. O guia de COPY deriva dos outros dois
e é o que se corrige quando divergir.

## O negócio

A **Blade Mídia** é uma empresa especializada exclusivamente em barbearias (Brasília/DF na fase 1). Sócio único: **Matheus Vellozo** (comercial: prospecção, reuniões, fechamento — e operação geral do negócio). O pai de Matheus, desenvolvedor, apoia pontualmente a implementação técnica (não é sócio). *(Atualizado em 2026-09-07 — até 2026-08 a estrutura era de dois sócios, Vítor Machado e Matheus Vellozo; Vítor não faz mais parte da operação. Referências a "Vítor" em registros anteriores deste repositório são histórico.)*

O produto é um **atendimento operado para barbearia**, entregue como serviço gerenciado sobre um SaaS próprio. O eixo em que a Blade compete é **capacidade de atendimento** — *a barbearia continua atendendo quando o dono não pode*. O objetivo NÃO é gerar demanda nova para as barbearias (tráfego e divulgação estão fora do escopo): é **parar o vazamento da demanda que já chega**.

**Dor central** ([Guia da Dor](../docs/business/dor-central.md)): o barbeiro-dono é ao mesmo tempo
quem produz e quem vende, e as duas funções não cabem no mesmo par de mãos. O WhatsApp — único
canal de venda do negócio — fica sem operador no horário em que a demanda chega, e o prejuízo
disso é **invisível** para o dono: quem desistiu de esperar nunca avisa que desistiu.

Manifestações, **na hierarquia oficial** (uma causa, duas consequências — nunca três dores com
peso igual):

1. **Tese** — clientes que enviam mensagem no WhatsApp e não recebem resposta a tempo;
2. **Prova** — clientes que agendam e não comparecem, porque ninguém confirmou;
3. **Prova de extensão** — clientes antigos que somem e nunca são recontatados.

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

### Posicionamento e proposta de valor

> Fonte: [Guia da Dor](../docs/business/dor-central.md) § 11 e
> [Guia de COPY](../docs/business/guia-de-copy.md) §§ 2-3. Resumo normativo:

- **Categoria reivindicada:** *atendimento operado para barbearia* — **não** "software de gestão
  para barbearia". A analogia mental correta para o cliente é **um recepcionista que não falta,
  não pede aumento e não vai embora**, nunca "um app".
- **Promessa central:** *"Sistema instalado, funcionando, sem você operar nada."*
- **Tagline oficial:** *"Sua barbearia está perdendo cliente todo dia no WhatsApp. A gente
  resolve isso."*
- **Proposta de valor (1 linha):** *"A gente atende o zap da sua barbearia enquanto você corta."*
- **Fronteiras inegociáveis:** não vendemos tráfego, divulgação nem geração de demanda; não
  vendemos acesso a ferramenta — vendemos **resultado operado**.
- **Teste de coerência** (vale para produto, site, venda e UI): se a mensagem não puder ser
  resumida em *"seu zap fica sem ninguém e você perde cliente sem saber"*, está fora do
  posicionamento.

### Persona do cliente final (ICP)

**Rafael, o barbeiro-dono que ainda corta** — 28-38 anos, barbearia independente de **2-4
cadeiras** com pelo menos 1 barbeiro parceiro, sem recepcionista, faturamento da casa
**R$18-45k/mês**, DF. Usa Instagram + WhatsApp + papel/memória. Nunca usou CRM. Não usa jargão
técnico ("lead", "CRM", "funil" não existem no vocabulário dele). Objeção central: *"não tenho
tempo de aprender mais uma coisa"*.

**Ticket de referência do segmento:** corte **R$30-55**; corte + barba **R$55-80**; ticket médio
de trabalho **R$45** — base de todo cálculo comercial, de ROI e de copy. A calibragem completa do
ICP (e a lógica econômica de cada faixa) está em
[persona-icp.md § 1](../docs/business/persona-icp.md).

**Anti-ICP (não vender, não comunicar):** franquia ou rede; barbearia de shopping com 10+
barbeiros; salão feminino/unissex; dono que não corta ou que tem gestor de marketing; barbearia
com recepcionista dedicada em tempo integral; barbeiro solo / cadeira alugada / atendimento em
casa; casa abaixo de ~R$15k/mês; barbearia com menos de 6 meses; e quem procura
tráfego/divulgação. Critérios de qualificação (5 de 7) e justificativa em
[persona-icp.md § 9](../docs/business/persona-icp.md).

**Consequência de produto:** a promessa comercial é "você não opera nada". O sistema deve
funcionar sem o barbeiro precisar mexer; o painel existe como **conveniência**, nunca como
requisito de uso — nada essencial pode depender de o barbeiro operá-lo.

**Consequência de UX e microcopy:** toda tela e toda mensagem falam o vocabulário dele e passam
pelo [Guia de COPY](../docs/business/guia-de-copy.md) §§ 8 e 13.9 — inclusive estados vazios e
mensagens automáticas enviadas ao cliente final da barbearia (voz da **barbearia**, nunca voz da
Blade).

### Estratégia comercial e de aquisição

> Fonte: [Guia da Persona](../docs/business/persona-icp.md) §§ 7 e 11 e
> [Guia de COPY](../docs/business/guia-de-copy.md) § 13. Decisões que orientam produto e operação:

- **Motor de aquisição: prospecção ativa + indicação.** A categoria "atendimento automático para
  barbearia" não existe na cabeça do ICP — ele não a pesquisa. O site funciona como
  **credibilidade pós-contato**, não como gerador de demanda espontânea.
- **Conversão acontece no WhatsApp**, não em formulário longo nem em ligação. Todo CTA deve ser
  mais fácil que a decisão.
- **Mecanismo central de venda: o diagnóstico.** A dor é invisível; a venda começa fazendo o
  próprio barbeiro medir o buraco (quantas conversas sem resposta, quantos furos por semana) e
  devolvendo a conta com os números dele.
- **Âncora econômica oficial:** corte R$30-55, ticket médio de trabalho **R$45**; a mensalidade
  se paga com **~16 atendimentos recuperados no mês** (ou "evitar 4 furos por semana"). A
  comparação de preço é sempre com **recepcionista**, nunca com aplicativo.
- **Risco reversível como argumento:** primeiro mês com garantia, sem multa.
- **Responsabilidade integral pela conexão WhatsApp** (decisão registrada) é **argumento de
  venda**: "se cair, o problema é nosso" — endereça diretamente o maior medo do ICP.

### Estratégia de marketing, branding e comunicação

- **Uma tese por peça** — a hierarquia da § "O negócio" é normativa em toda comunicação.
- **Regra da absolvição:** o inimigo é sempre a situação (mão ocupada, dia cheio), nunca a
  pessoa. Nenhuma peça pode sugerir que o barbeiro é desorganizado ou culpado.
- **Números só com a conta à vista**; projeção sempre rotulada como projeção. Credibilidade é o
  ativo mais caro da marca com este público.
- **Léxico obrigatório e palavras banidas**: [Guia de COPY](../docs/business/guia-de-copy.md) § 8
  — vale para site, anúncios, vendas **e** interface do produto.
- **Identidade visual e tom de voz**: ver [contexto-negocio.md](../docs/business/contexto-negocio.md)
  (design system e princípios de tom), operacionalizados no Guia de COPY.

### Fora do escopo do produto (v1)

- Geração de leads / tráfego pago;
- Pagamentos e cobrança dentro do sistema;
- App mobile nativo;
- Franquias / barbearias grandes com gestão profissional;
- Salões que atendem público feminino.

> O escopo acima é consequência direta do anti-ICP e das fronteiras de posicionamento — ampliar
> qualquer um destes itens exige revisar antes o [Guia da Persona](../docs/business/persona-icp.md)
> e o [Guia da Dor](../docs/business/dor-central.md), não só este documento.

## Decisões estruturais (aprovadas em 2026-07-03)

| # | Decisão | Detalhe |
|---|---------|---------|
| D0 | **Dor, persona e copy têm guias oficiais** (2026-07-28) | Os três documentos em `docs/business/` são a principal fonte de verdade estratégica. Nenhuma spec, design, tela, texto ou decisão comercial pode conflitar com eles; divergência encontrada é corrigida no documento errado, nunca ignorada. Precedência: **Dor > Persona > COPY**. |
| D1 | **O SaaS substitui o stack no-code desde já** | O plano de ação previa Typebot/n8n/Sheets; decidiu-se construir o produto real desde o início. O no-code não será usado. |
| D2 | **Integração WhatsApp: decisão em aberto** | A arquitetura isola o provedor atrás de uma interface única (`WhatsAppProvider`). Uma spike técnica compara API oficial (Meta Cloud) vs não-oficial (Evolution API) antes do design final. Ver ADR-0004. |
| D3 | **IA conversacional desde a v1** | LLM responde os clientes das barbearias; fluxos determinísticos para agendamento/confirmação. Ver ADR-0005. |
| D4 | **Orçamento de infra: até ~R$150-200/mês** | Restrição ativa em toda decisão de arquitetura. |
| D5 | **Multi-tenancy simples** | Dados isolados por barbearia (tenant) em instância única. Sem infraestrutura distribuída na v1, mas o modelo de dados nasce multi-tenant. Ver ADR-0007. |
| D6 | **Desenvolvimento via Spec-Driven Development** | Nenhuma implementação sem spec aprovada. Ver [workflow.md](workflow.md). |

## Restrições e requisitos não funcionais transversais

- **LGPD**: o sistema armazena dados pessoais (nome, telefone, histórico de visitas) de clientes finais das barbearias. Consentimento, retenção e exclusão devem ser considerados em toda spec que toque dados de clientes.
- **O número de WhatsApp é o ativo mais valioso do barbeiro.** Qualquer risco de banimento é risco de negócio crítico.
- **Time técnico**: Matheus (não-técnico) com apoio pontual do pai (dev) e desenvolvimento assistido por IA. Simplicidade operacional > sofisticação arquitetural continua sendo o princípio guia.
- **Idioma e linguagem**: toda a interface e comunicação com clientes em PT-BR, no vocabulário do barbeiro. A lista completa de palavras banidas, a tabela de tradução obrigatória e as regras de microcopy estão no [Guia de COPY](../docs/business/guia-de-copy.md) §§ 8 e 13.9 — **é requisito não funcional, não preferência de estilo**. Antes de entregar qualquer texto, rodar o checklist da § 14 do guia.
- **Design System**: paleta Ink `#0D0D0D` / Gold `#C9A84C` / Chalk `#F5F2EC` / Steel `#2B2B2B` / Wire `#8C8C8C`; tipografia Barlow Condensed (display), Barlow (corpo), Space Mono (labels). Detalhes em [docs/business/contexto-negocio.md](../docs/business/contexto-negocio.md).

## Operação da agência (camada que já roda, paralela ao produto)

> Adicionado em 2026-07-06 com aprovação de Vítor. O produto SaaS descrito acima está em
> fase de spec; enquanto isso, a agência JÁ OPERA com uma camada de tooling própria —
> qualquer IA/dev que pegar este repo precisa saber que ela existe e onde está:

- **`automation/`** — motor de atendimento WhatsApp com presets por cliente, painel da
  agência (CRM de barbearias), painel do cliente (barbeiro) e provisionamento. Runbook:
  [automation/README.md](../automation/README.md).
- **`infra/`** — Docker do gateway Evolution (local e VPS) e preset full-stack.
- **Verificação pré-venda**: `node automation/check.mjs` prova em um comando que a
  estrutura está íntegra (motor, presets, painéis, site, form de leads).
- **Regime**: esta camada é operacional — evolui direto, sem o fluxo SDD completo (o
  produto, não). Regras que valem nas duas: escopo por barbearia, nunca logar
  conteúdo/telefone completo, warm-up anti-ban. Detalhes no [CLAUDE.md](../CLAUDE.md)
  (seção "Estado atual e próximos passos" — **manter atualizada a cada mudança relevante**,
  é o ponto de sincronização entre as IAs dos dois sócios).

## Documentos de referência

| Documento | Onde |
|---|---|
| **Dor central (o que resolvemos)** | [docs/business/dor-central.md](../docs/business/dor-central.md) |
| **Persona / ICP (para quem resolvemos)** | [docs/business/persona-icp.md](../docs/business/persona-icp.md) |
| **Guia de COPY e comunicação (como falamos)** | [docs/business/guia-de-copy.md](../docs/business/guia-de-copy.md) |
| Operação da agência (motor, presets, painéis) | [automation/README.md](../automation/README.md) |
| Método SDD (prompts, templates, checklist) | [docs/sdd/](../docs/sdd/) |
| Contexto de negócio (briefing, plano, design system — extrato) | [docs/business/contexto-negocio.md](../docs/business/contexto-negocio.md) |
| Arquitetura proposta | [docs/architecture/overview.md](../docs/architecture/overview.md) |
| Decisões de arquitetura (ADRs) | [docs/architecture/decisions/](../docs/architecture/decisions/) |
| Fluxo de desenvolvimento | [workflow.md](workflow.md) |
| Convenções de escrita e código | [conventions.md](conventions.md) |
| Registro de capabilities | [specs/README.md](specs/README.md) |
