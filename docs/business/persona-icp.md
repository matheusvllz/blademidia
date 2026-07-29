# Persona e Cliente Ideal (ICP) da Blade Mídia

> **Status:** Proposto — aguarda ratificação explícita de Vítor Machado e Matheus Vellozo.
> **Origem:** análise crítica de todo o SDD em 2026-07-28.
> **Documento par:** [dor-central.md](dor-central.md) — define **o que** resolvemos.
> Este define **para quem**. Os dois são inseparáveis: mudar um obriga a revisar o outro.
> **É a definição detalhada** da persona resumida em
> [openspec/project.md](../../openspec/project.md) e em [contexto-negocio.md](contexto-negocio.md).
> Em caso de divergência sobre persona, **este documento prevalece**.

Classificação usada: **[FATO]** (confirmado no SDD) · **[HIPÓTESE]** (assumido, não medido) ·
**[INFERÊNCIA]** (derivado de fatos + análise) · **[VALIDAR]** (§ 12).

---

## 1. Calibragem do ICP — os parâmetros e o porquê de cada um

Os quatro parâmetros que definem quem é cliente da Blade, e a lógica econômica por trás deles.
Qualquer proposta de alargar o ICP precisa passar por esta tabela.

| Parâmetro | Faixa definida | Lógica |
|---|---|---|
| **Faturamento da casa** | **R$18-45k/mês** (bruto, antes de comissão) | a mensalidade de R$697 precisa ficar entre **1,5% e 4%** do faturamento para ser uma decisão fácil. Abaixo de ~R$15k ela vira ~5% ou mais e a conversa vira preço, não resultado. |
| **Tamanho** | **2-4 cadeiras, com ≥1 barbeiro além do dono** | é onde a demanda simultânea existe (mensagem chegando enquanto todas as cadeiras estão ocupadas) e onde o dono já tem a mentalidade de "pago alguém para produzir mais" — a mesma lógica que sustenta a nossa oferta. |
| **Idade** | **28-38 anos** (centro ~32) | maturidade suficiente para ter base de clientes e caixa; jovem o bastante para adotar tecnologia sem resistência ideológica. |
| **Papel do dono** | **ele ainda corta, todos os dias** | é a condição que **cria** a dor central. Sem ela, não há dor. É o critério mais importante dos quatro. |

**Ticket de referência** [FATO — confirmado pelos sócios, 2026-07-28]: **corte entre R$30 e
R$55**; corte + barba somando tipicamente **R$55-80**. Ticket médio de trabalho: **R$45**.
Todo cálculo de ROI, payback e argumento comercial usa essa base.

---

## 2. Rafael — retrato completo

### 2.1 Demográfico

| Atributo | Definição | Classificação |
|---|---|---|
| Idade | 28-38 anos (centro ~32) | [INFERÊNCIA] |
| Gênero | homem, na esmagadora maioria dos casos | [INFERÊNCIA de mercado] |
| Local | Brasília/DF — cidades-satélite e regiões administrativas (Taguatinga, Águas Claras, Ceilândia, Guará, Sudoeste, Asa Norte/Sul) | [FATO — fase 1 é DF] |
| Escolaridade | ensino médio completo; curso técnico de barbeiro; raramente superior | [HIPÓTESE] |
| Estado civil | casado ou em relação estável; frequentemente com filho pequeno | [HIPÓTESE] |
| Renda pessoal | R$5-10k/mês (mistura de comissão própria + lucro da casa, sem separação clara entre PF e PJ) | [HIPÓTESE — validar] |

### 2.2 Profissional e empresarial

- Começou cortando cabelo aos ~18-22 anos, muitas vezes na garagem/casa ou como funcionário
  de outra barbearia. Abriu a própria há **3-8 anos**. [HIPÓTESE]
- **Ele ainda corta** — 5-8 horas por dia, agenda própria cheia, é o barbeiro mais requisitado
  da casa. Isso é o traço definidor. Se ele parou de cortar, não é o ICP. [FATO — "dono presente"]
- **Estrutura:** 2-4 cadeiras. 1-3 barbeiros além dele, em geral **parceiros/comissionados**
  (40-50% do serviço), não CLT. Sem recepcionista. Talvez um menor/auxiliar de limpeza.
- **Faturamento da casa:** R$18-45k/mês bruto. **Corte R$30-55** [FATO]; corte+barba R$55-80;
  ticket médio de trabalho **R$45**. Isso implica **~400-1.000 atendimentos/mês** na casa —
  ou seja, volume alto de conversa entrando no zap todo dia. [modelo]
- **Estágio do negócio:** **sobreviveu e estabilizou, mas travou.** Não é abertura (não tem
  base) nem escala (não tem gestão). É o platô — o momento exato em que a dor da
  [dor-central.md](dor-central.md) fica insuportável, porque ele já tem demanda maior do que a
  própria capacidade de atender no zap.
- CNPJ MEI ou ME; contador terceirizado; controle financeiro em caderno, bloco de notas ou
  planilha simples. Não separa caixa da casa do bolso pessoal com rigor. [HIPÓTESE]

### 2.3 Maturidade digital

| Dimensão | Nível | Detalhe |
|---|---|---|
| WhatsApp | **alto uso, zero processo** | é o sistema operacional do negócio dele. Business ou pessoal, no celular dele, sem ninguém dedicado. [FATO] |
| Instagram | médio | 1-8k seguidores, posta corte/antes-e-depois, stories. Vê como vitrine. Não mede nada. [HIPÓTESE] |
| Agenda | papel, bloco de notas ou memória | [FATO — "papel/memória"] |
| Software de gestão | **nunca usou CRM** | [FATO] Pode ter testado um app de agendamento e abandonado. |
| Computador | quase não usa | tudo no celular. **Consequência de produto e de comunicação: tudo precisa funcionar e ser explicado no celular.** |
| IA / tecnologia | ouviu falar, usou ChatGPT uma ou duas vezes por curiosidade | [HIPÓTESE] Não tem opinião técnica. Não sabe (nem quer saber) a diferença entre bot, IA e automação. Palavra "robô" é neutra-negativa; "atendente" é positiva. |

### 2.4 Rotina real (contexto onde a comunicação vai encontrá-lo)

- Abre entre 9h e 10h; fecha entre 19h e 21h. Sábado é o dia mais forte, e o mais caótico.
  Segunda costuma ser folga.
- Fica **em pé o dia inteiro**, com as mãos ocupadas, música alta, conversando com o cliente.
- Olha o celular: entre um corte e outro, no almoço (quando come), e **à noite, em casa,
  no sofá** — é aí que ele responde mensagem acumulada, olha Instagram e pesquisa coisa de
  negócio. **É a janela real de atenção dele.** [INFERÊNCIA — relevante para mídia e horário]
- Domingo à noite / segunda de folga: momento de "pensar no negócio" e de maior abertura a
  soluções. Também o momento de maior frustração acumulada.

---

## 3. O que ele quer e o que ele teme

### 3.1 Objetivos profissionais

1. **Agenda cheia todo dia, sem buraco em horário nobre** — objetivo declarado #1.
2. Aumentar ticket médio (vender barba, hidratação, pigmentação junto com o corte).
3. Ter cliente fixo e previsível, não fluxo aleatório.
4. Contratar mais um barbeiro bom, e não perder os que já tem.
5. **Trabalhar menos horas sem faturar menos** — o objetivo que ele quase nunca diz em voz alta.

### 3.2 Objetivos pessoais e ambições

- Comprar/quitar carro; sair do aluguel; dar estrutura pra família.
- **Ser reconhecido como referência** — "a melhor barbearia da região", campeonato, cliente
  famoso na cadeira, Instagram forte. Status importa muito neste segmento. [INFERÊNCIA]
- Abrir a **segunda unidade** — ambição declarada quase universal.
- No fundo: **deixar de ser o gargalo**. Ter um negócio que funciona sem ele estar em pé nele.
  Ele raramente formula isso com essas palavras.

### 3.3 Medos

- Perder o barbeiro bom para o concorrente (ou para a barbearia que ele vai abrir).
- **Perder o número do WhatsApp.** É a lista de clientes dele. Perder o número = perder o
  negócio. [FATO — `project.md`: "o ativo mais valioso do barbeiro"]
- Cair no golpe/"enrolação" de novo — ele já foi queimado por alguém que prometeu marketing.
- Que a barbearia esvazie sem ele entender por quê (medo difuso, sem explicação — é
  exatamente a **perda invisível** da dor central).
- Ficar velho cortando cabelo, com dor nas costas e sem ter construído nada.
- **Parecer burro numa conversa técnica.** Não vai admitir que não entendeu. Vai só sumir.
  [INFERÊNCIA — implicação direta: qualquer jargão gera silêncio, não pergunta.]

### 3.4 Frustrações do dia a dia

- Cliente que marca e não aparece, sem avisar.
- Ter 40 mensagens não lidas e não conseguir responder.
- Ver a cadeira parada às 15h de quarta e lotar às 18h de sexta.
- Barbeiro parceiro reclamando de agenda vazia (e culpando a "divulgação").
- Fazer conta no fim do mês e não saber pra onde foi o dinheiro.
- Trabalhar mais que todo mundo e ganhar menos do que acha justo.

---

## 4. Dores explícitas × dores ocultas

| Dores **explícitas** (ele diz em voz alta) | Dores **ocultas** (ele sente e não nomeia) |
|---|---|
| "Tô perdendo horário com quem marca e não vem" | "Eu não faço ideia de quantos clientes eu perdi esse mês" |
| "Não consigo responder o zap enquanto corto" | "Eu virei refém do meu próprio negócio" |
| "O movimento tá fraco esse mês" | "Meu atendimento na cadeira é ótimo, mas o atendimento antes da cadeira é péssimo — e isso contradiz tudo que eu digo sobre mim" |
| "Preciso divulgar mais / preciso de tráfego" | "O problema não é chegar gente, é que a gente não dá conta da que chega" |
| "Meu cliente é fiel" | "Vários já não voltam e eu nem percebi" |
| "Não tenho tempo pra nada" | "Se eu parar uma semana, a barbearia trava" |

**[INFERÊNCIA de posicionamento]:** a coluna da esquerda é onde a conversa **começa**; a da
direita é onde ela **fecha**. A frase "preciso divulgar mais" é o principal desvio a corrigir —
é ela que o joga nos braços de uma agência de tráfego, que é o inimigo do nosso posicionamento.

---

## 5. Desejos, sonhos e o que ele realmente compra

**O que ele acha que está comprando:** um robô que responde o WhatsApp.

**O que ele realmente quer comprar:**

1. **Tranquilidade** — parar de sentir que está deixando dinheiro escapar enquanto trabalha.
2. **Controle sobre o invisível** — saber, pela primeira vez, o que acontece no canal dele.
3. **Um funcionário que não falta, não pede aumento e não leva cliente embora** — a versão
   viável da recepcionista que ele não pode pagar.
4. **A sensação de ser um dono de negócio, não um barbeiro autônomo com CNPJ.**
5. **Status** — "minha barbearia tem sistema". Ele quer poder mostrar isso pro colega. Este
   motivo é subestimado e é real. [INFERÊNCIA]

**O resultado que ele quer alcançar:** agenda cheia com clientes que voltam sozinhos, sem ele
precisar correr atrás nem ficar no celular.

**O inimigo que ele quer evitar:**

- a cadeira vazia no horário nobre;
- o cliente que foi cortar em outro lugar porque não foi respondido;
- ser "mais um" numa rua com cinco barbearias;
- **e o inimigo psicológico:** ser enrolado de novo por quem vende promessa e some.

---

## 6. Objeções de compra (ordenadas por frequência esperada)

| # | Objeção | O que está por trás | Classificação |
|---|---|---|---|
| 1 | **"Já tentei e não funcionou"** | queimado por agência de tráfego ou app abandonado. Descrença na categoria, não em nós. | [FATO — objeção listada no SDD] |
| 2 | **"Não tenho tempo de aprender mais uma coisa"** | ele acha que vai virar trabalho dele. É a objeção que a promessa "sem você operar nada" existe para matar. | [FATO] |
| 3 | **"Meu cliente é fiel, não preciso disso"** | orgulho profissional + desconhecimento da perda invisível. Atacar de frente ofende. | [FATO] |
| 4 | **"R$697 é caro"** / "quanto isso me dá de retorno?" | compara com o app de R$70/mês, não com a recepcionista de R$2.500. **Reancorar a comparação é a chave.** | [INFERÊNCIA] |
| 5 | **"Vocês vão mexer no meu número?"** | medo #1 dele. Custódia total da conexão pela agência [FATO] pode soar como perder o controle do ativo. Precisa de resposta preparada e honesta. | [INFERÊNCIA — risco alto] |
| 6 | **"Cliente vai perceber que é robô e não gostar"** | medo de descaracterizar o atendimento humano que é o orgulho dele. | [INFERÊNCIA] |
| 7 | **"E se eu quiser sair?"** | contrato/multa. O SDD já responde: primeiro mês com garantia, sem multa [FATO, `site/data.js` DIFFS]. | [FATO] |
| 8 | **"Vocês já fizeram isso pra quem?"** | pedido de prova social. Enquanto não houver caso público, a resposta se apoia em **demonstração ao vivo + diagnóstico do negócio dele + garantia de primeiro mês** — mostrar funcionando vale mais que citar nome de terceiro. | [INFERÊNCIA] |
| 9 | "Preciso falar com meu sócio / minha esposa" | decisão raramente é 100% solo. | [HIPÓTESE] |

---

## 7. Como ele decide

### 7.1 O que faz ele comprar

- **Prova concreta e específica sobre o negócio DELE** — número dele, não caso genérico.
  Diagnóstico > apresentação.
- **Ver funcionando**, na tela, em 2 minutos. Demonstração > explicação.
- **Risco baixo e reversível** — garantia no primeiro mês, sem multa.
- **Alguém com nome e rosto respondendo por aquilo** — accountability humana ("tem gente
  respondendo por isso, não um call center terceirizado") é um argumento forte com este público.
- **Indicação de outro barbeiro** que ele respeita. É o canal de maior conversão do segmento.
  [INFERÊNCIA]
- **Simplicidade da decisão**: preço fechado, prazo fechado ("72h"), sem letra miúda.

### 7.2 O que faz ele desconfiar ou rejeitar

- Jargão de marketing ("lead", "funil", "conversão", "CRM", "solução", "plataforma")
  [FATO — proibido em toda comunicação Blade].
- Promessa vaga e grande demais ("triplique seu faturamento").
- Reunião longa, PDF grande, contrato complicado.
- Ser tratado com condescendência ou como quem não entende de tecnologia.
- Vendedor que não conhece barbearia — ele detecta em 30 segundos, pelo vocabulário.
- Cobrança de setup alto sem entender o que é. **R$997 de setup precisa ter entregável visível.**

### 7.3 Quem influencia

| Influenciador | Peso | Como age |
|---|---|---|
| **Outro barbeiro-dono que ele respeita** | **altíssimo** | prova social par-a-par; uma indicação vale dez anúncios |
| Esposa/companheira (frequentemente cuida do Instagram/financeiro) | alto | é quem faz a pergunta "e isso custa quanto por mês?" |
| Barbeiro parceiro mais antigo da casa | médio-alto | reclama do problema, valida a solução |
| Sócio (quando existe) | alto | precisa concordar |
| "Guru de barbearia" do Instagram/YouTube | médio | forma o vocabulário e as expectativas dele |
| Fornecedor de produto (distribuidora) | baixo-médio | circula por muitas barbearias, espalha novidade |

### 7.4 Como pesquisa e onde está

- **Instagram** (reels de barbearia, gurus de gestão de barbearia) — principal.
- **YouTube** — vídeos de "como lotar a barbearia", "gestão de barbearia".
- **Grupos de WhatsApp** de barbeiros e de fornecedores.
- Google, pouco e mal — busca por termo genérico ("sistema pra barbearia").
- **Não lê blog, não baixa e-book, não entra em LinkedIn.**
- **Consequência para nós:** ele não vai pesquisar a categoria "atendimento automático para
  barbearia" — essa categoria não existe na cabeça dele. **Portanto o canal primário é
  outbound/prospecção ativa e indicação, não inbound.** O site serve para **dar credibilidade
  depois do contato**, não para gerar demanda espontânea. [INFERÊNCIA importante — VALIDAR]

---

## 8. Como ele fala (vocabulário obrigatório)

**Palavras dele** [FATO — `contexto-negocio.md` e `conventions.md`]:
"horário", "agenda", "cliente", "corte", "barba", "zap", "encaixe", "cadeira", "movimento",
"fluxo", "fiel", "quebrou" (no-show), "furou", "sumiu", "chefe", "meu parceiro", "a casa".

**Frases típicas dele** [INFERÊNCIA a partir do vocabulário confirmado]:

- "O movimento tá fraco essa semana."
- "O cara marcou e furou."
- "Manda no zap que eu te encaixo."
- "Meu cliente é fiel, tem gente que corta comigo há 6 anos."
- "Eu não paro, mano. Não tenho tempo nem de almoçar."
- "Tá tudo na minha cabeça."

**Proibido dizer para ele** [FATO — regra de convenções]:
"lead", "funil", "conversão", "churn", "CRM", "plataforma", "solução", "nossa ferramenta",
"engajamento", "onboarding", "dashboard", "ROI", "retenção" (a palavra técnica; o conceito
deve ser dito como "cliente que volta").

---

## 9. Cliente ideal × quem NÃO é cliente

### 9.1 Cliente ideal (mirar aqui)

**Critérios de qualificação — precisa bater em pelo menos 5 dos 7:**

1. Barbearia independente, **2-4 cadeiras**, no DF.
2. **Dono corta** e está presente todos os dias.
3. Faturamento da casa **R$18-45k/mês** (corte R$30-55, ~400-1.000 atendimentos/mês).
4. Pelo menos **1 barbeiro parceiro/comissionado** além do dono.
5. **Sem recepcionista dedicada** — o WhatsApp é respondido pelo dono ou por ninguém.
6. **Volume de mensagem relevante**: 10+ conversas novas de cliente por dia no zap.
7. Base existente de **150+ clientes conhecidos** (mesmo que só na memória e no histórico do zap).

**Sinais verdes adicionais:** já testou app de agendamento e abandonou; já pagou tráfego e se
frustrou; reclama de no-show espontaneamente; fala em abrir segunda unidade.

### 9.2 Quem NÃO é cliente ideal (não vender, não comunicar)

| Perfil | Por quê |
|---|---|
| **Franquia / rede** | [FATO — anti-ICP] decisão centralizada, processo de compra longo, exige integração. |
| **Barbearia de shopping com 10+ barbeiros** | [FATO] já tem recepção e sistema; nossa dor central não é a dor dela. |
| **Salão feminino / unissex** | [FATO] outra dinâmica de serviço, duração e agendamento. |
| **Dono que não corta / tem gestor ou sócio de marketing** | [FATO] a dor central (mãos ocupadas) não existe. Ele compara features e preço. |
| **Barbearia com recepcionista dedicada em tempo integral** | a dor já está resolvida por gente. Vender aqui vira "substitua sua funcionária" — venda difícil, emocionalmente carregada. **Alvo secundário futuro, não agora.** |
| **Barbeiro solo / cadeira alugada / atende em casa** | volume e caixa insuficientes; R$697 é proibitivo. Sofre a dor, não pode pagar a solução. |
| **Barbearia abaixo de ~R$15k/mês** | preço inviável (>4,5% do faturamento). |
| **Barbearia nova (< 6 meses)** | não tem base de clientes para reativar nem volume de mensagem. A dor dela é aquisição — que está **fora do nosso escopo** [FATO]. |
| **Quem quer tráfego pago / "mais seguidores"** | [FATO] "Não vendemos tráfego." Aceitar esse cliente destrói o posicionamento e gera churn por expectativa errada. |
| **Fora do DF (por ora)** | [FATO — fase 1 é DF]; o site já responde isso no FAQ. |

### 9.3 Para quem comunicar × para quem não comunicar

- **Comunicar para:** o dono descrito na § 9.1, no **celular**, à **noite** ou na **segunda de
  folga**, com linguagem de barbearia, prova numérica sobre o negócio dele e risco baixo.
- **Comunicar também (secundariamente, como influência):** outros barbeiros-donos da rede dele
  — a indicação é o canal mais forte; e a companheira/sócia que participa da decisão financeira.
- **NÃO comunicar para:** barbeiro empregado/comissionado (sofre, não decide, não paga),
  franquias, salões femininos, quem procura "mais clientes/divulgação", e o público de
  "empreendedorismo/tecnologia" em geral — não é onde o comprador está.

---

## 10. Por que esta persona é a melhor escolha estratégica

Ligação direta entre persona ↔ dor ↔ produto ↔ modelo de negócio:

| Dimensão | Encaixe |
|---|---|
| **Persona ↔ Dor** | A dor central ("o zap sem operador") **só existe** quando o dono é o operador e está ocupado produzindo. Esta persona é definida exatamente por essa condição. Fora dela, a dor evapora — daí o anti-ICP ser tão restritivo. |
| **Persona ↔ Produto** | O produto entrega o atendimento **dentro do WhatsApp que ele já usa**, com o número dele preservado (Evolution/dispositivo vinculado, [FATO]) e operado por nós (custódia total, [FATO]). É a única arquitetura compatível com um comprador que não opera nada e cujo cliente final não muda de canal. |
| **Persona ↔ Preço** | R$697/mês em casa de R$18-45k = **1,5-4% do faturamento**. Com ticket de R$45, o sistema se paga com **~16 atendimentos recuperados no mês** — ou "evitar 4 no-shows por semana". Sobre uma base de 400-1.000 atendimentos/mês, é uma barra baixa e fácil de argumentar. |
| **Persona ↔ Modelo de negócio** | Serviço gerenciado com custódia técnica gera lock-in [FATO — decisão estratégica registrada] e **exige um cliente que não queira autonomia técnica**. Rafael não só aceita como prefere. Um cliente sofisticado rejeitaria a custódia. |
| **Persona ↔ Capacidade da agência** | 2 sócios, 1 técnico. Onboarding-alvo < 4h por cliente [FATO]. Meta de 5 clientes em 90 dias [FATO]. Um ICP homogêneo e geograficamente concentrado (DF) permite preset reaproveitável, visita presencial e suporte por WhatsApp — o modelo não escalaria com clientes heterogêneos. |
| **Persona ↔ Aquisição** | Segmento denso e conectado: barbeiros-donos se conhecem, se visitam e se indicam. Um ICP estreito **acelera** a prospecção por indicação em vez de limitá-la. |
| **Persona ↔ Roadmap** | O produto já construído (agenda com barbeiros, comissão implícita, papéis dono/funcionário, fidelização) faz sentido para 2-4 cadeiras com parceiros — **não** para o barbeiro solo do ICP antigo. A correção do ICP alinha produto e mercado que já estavam desalinhados. |

**Tamanho de mercado** [ESTIMATIVA GROSSEIRA — VALIDAR]: o DF tem alguns milhares de barbearias
formais e informais; o recorte de 2-4 cadeiras / R$18-45k / dono cortando plausivelmente
representa algumas centenas de casas. Para uma meta de 5 clientes em 90 dias e algumas dezenas
no primeiro ano, o mercado é **largamente suficiente**. Estreitar o ICP não é risco de tamanho —
é ganho de precisão.

---

## 11. Tensões estratégicas a administrar

Pontos onde a persona e o modelo de negócio se atritam. Não são defeitos — são decisões que a
comunicação precisa endereçar de frente, em vez de contornar.

1. **Persona construída, ainda não observada.** Boa parte do perfil é [HIPÓTESE] e [INFERÊNCIA]
   estruturadas a partir do SDD e do segmento. É uma base sólida para começar a falar com o
   mercado — e deve ser corrigida por evidência de campo, não defendida. Ver § 12.
2. **Persona de entrada × persona de escala.** Para os 2-3 primeiros clientes, o perfil mais
   provável é o **cliente-piloto**: alguém com relação prévia de confiança com Vítor ou Matheus,
   disposto a entrar cedo em troca de condição diferenciada e de virar caso. Ele pode não bater
   100% do ICP — e tudo bem. O ICP da § 9.1 é o alvo de **escala**, não o do primeiro contrato.
3. **Custódia total do WhatsApp × o medo #1 dele (perder o número).** O modelo de serviço
   gerenciado exige que a Blade detenha a conexão; o maior medo dele é justamente perder o
   controle do ativo. A resposta correta é enquadrar a custódia como **responsabilidade assumida**
   ("se cair, o problema é nosso, não seu"), nunca omitir o tema — ele vai perguntar.
4. **Ele não pesquisa a categoria.** "Atendimento automático para barbearia" não existe na
   cabeça dele como categoria de compra. Logo, o motor de aquisição é **prospecção ativa +
   indicação**, e o site funciona como **credibilidade pós-contato**, não como gerador de demanda
   espontânea. Isso orienta onde investir esforço comercial.
5. **Vendemos resultado operado, não software.** Toda tentação de comunicar funcionalidade
   ("painel", "relatório", "agenda digital") desloca a conversa para comparação com apps baratos.
   O contrapeso é sempre voltar à dor central e ao resultado.

---

## 12. Hipóteses desta persona que precisam ser validadas

| # | Hipótese | Como validar | Quem |
|---|---|---|---|
| P1 | O perfil 2-4 cadeiras / R$18-45k é onde a dor + o bolso coexistem | mapear 15-20 barbearias do DF; registrar cadeiras, faturamento declarado, quem responde o zap | Matheus |
| P2 | Casas nessa faixa recebem 10+ conversas novas/dia no zap | contagem direta no WhatsApp de 5 donos (junto com H1 de dor-central) | Matheus |
| P3 | R$697 + R$997 é aceito nessa faixa (objeção de preço não é a primeira) | 5 propostas reais; classificar a **primeira** objeção de cada uma | Matheus |
| P4 | Indicação entre barbeiros-donos é o canal mais forte | rastrear a origem de cada reunião marcada nos primeiros 90 dias | Matheus |
| P5 | O site não gera demanda espontânea relevante (§ 7.4) | acompanhar o volume e a qualidade dos leads do formulário Netlify por 60 dias | Vítor |
| P6 | A custódia do número não é objeção fatal | levar o tema **proativamente** em 5 conversas e registrar a reação | Matheus |
| P7 | A companheira/sócia participa da decisão financeira | perguntar "quem mais decide isso com você?" em toda reunião | Matheus |
| P8 | Existe um "cliente-piloto" acessível por relação prévia | listar contatos diretos dos dois sócios no segmento | ambos |

**Regra de manutenção:** cada conversa real de prospecção deve gerar uma linha de evidência
nesta seção. A persona é **viva** — a versão que sobrevive a 20 conversas vale mais do que
qualquer análise, inclusive esta.

---

## Referências

- [docs/business/dor-central.md](dor-central.md) — **documento par: o que resolvemos**
- [openspec/project.md](../../openspec/project.md) — contexto oficial, ICP original, D1-D6
- [docs/business/contexto-negocio.md](contexto-negocio.md) — briefing, tom de voz, vocabulário
- [openspec/conventions.md](../../openspec/conventions.md) — vocabulário proibido na UI e na copy
- [site/data.js](../../site/data.js) — FAQs (objeções já respondidas publicamente) e diferenciais
- [CHANGELOG.md](../../CHANGELOG.md) — estado real do produto
