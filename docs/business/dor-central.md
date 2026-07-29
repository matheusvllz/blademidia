# Dor Central da Blade Mídia

> **Status:** Proposto — aguarda ratificação explícita de Vítor Machado e Matheus Vellozo
> (`openspec/project.md`, linha 5: alterações de contexto de negócio exigem aprovação dos sócios).
> **Origem:** análise crítica de todo o SDD em 2026-07-28 (site, `automation/`, `openspec/`,
> `docs/`, CHANGELOG, specs permanentes e changes arquivadas).
> **Escopo:** este documento define **o que estamos resolvendo**. O par dele é
> [persona-icp.md](persona-icp.md), que define **para quem**. Nenhuma copy, headline ou
> campanha foi escrita aqui — por decisão explícita, isso vem depois e a partir daqui.

---

## 0. Como ler este documento (classificação obrigatória)

Segundo [openspec/conventions.md](../../openspec/conventions.md) § "Classificação de afirmações",
nada aqui é apresentado como fato sem sê-lo. Marcadores usados:

| Marcador | Significa |
|---|---|
| **[FATO]** | Confirmado por documento do SDD ou por decisão registrada dos sócios. Tem rastro. |
| **[HIPÓTESE]** | Assumido para avançar. Não foi medido. Precisa de validação em campo. |
| **[INFERÊNCIA]** | Conclusão estratégica derivada de fatos do SDD + análise de mercado. Defensável, não comprovada. |
| **[VALIDAR]** | Ponto em aberto com método de validação sugerido na § 14. |

**Sobre os números deste documento:** todos os valores financeiros aqui são **de modelo** —
projeções construídas a partir do ticket e do volume típicos do segmento, não medições de
clientes em operação. Servem para dimensionar a dor e sustentar argumento, sempre com a âncora
do cálculo à vista. Substituí-los por números reais é a primeira prioridade assim que o primeiro
cliente completar 30 dias (ver § 14).

---

## 1. A dor central em uma frase

> **A barbearia só consegue vender quando o dono está com a mão livre — e a mão dele está
> ocupada na cabeça de um cliente das 9h às 20h. O único canal de venda do negócio (o WhatsApp)
> fica sem ninguém exatamente nas horas em que mais chega gente querendo marcar.**

Nome curto para uso interno: **"O zap sem operador"** — ou, na consequência: **"a perda invisível"**.

---

## 2. Definição completa da dor central

### 2.1 O que é

O barbeiro-dono é, ao mesmo tempo, o **produtor** (quem corta) e o **comercial** (quem responde,
agenda, confirma, recupera cliente). Essas duas funções são **fisicamente incompatíveis**: enquanto
ele executa uma, a outra para. Como a produção é o que gera receita imediata e presencial, a função
comercial é sempre a que cede.

O resultado é que a barbearia opera com um **canal de venda intermitente**: o WhatsApp — que é
onde 100% da demanda chega — só é atendido nos intervalos entre cortes, no fim do expediente, ou
quando o barbeiro consegue olhar o celular com a mão suja.

### 2.2 Por que esta é a dor *central* e não uma das três

A Blade trabalha com três problemas reconhecíveis pelo barbeiro: (01) zap sem resposta,
(02) no-show, (03) cliente sumido. **Eles não são três dores — são uma causa e duas
consequências**, e essa hierarquia é o que dá foco à comunicação:

```text
CAUSA ESTRUTURAL
└── O dono é o único operador do canal, e o canal roda no horário em que ele não pode operar
    ├── manifestação A (imediata)   → mensagem sem resposta → cliente marca em outro lugar
    ├── manifestação B (derivada)   → ninguém confirma o horário → no-show
    └── manifestação C (derivada)   → ninguém percebe nem chama quem sumiu → cliente perdido
```

B e C existem **porque** ninguém está operando o canal. Se houvesse alguém operando, B e C
desapareciam junto. O inverso não é verdade: resolver no-show isoladamente (ex.: cobrar sinal)
não resolve A nem C.

**Regra de comunicação derivada:** a marca ataca **uma** dor — a A —, com B e C entrando como
provas de extensão da mesma causa. Nunca três dores lado a lado com o mesmo peso: é isso que faz
uma mensagem soar como "mais uma agência que promete tudo".

### 2.3 O recorte específico e comprovável

Formulação que a Blade deve defender publicamente, porque é **específica, verificável e nossa**:

> Toda mensagem que chega no WhatsApp da barbearia entre 9h e 20h tem uma chance alta de esperar
> horas por resposta — e a maior parte do prejuízo disso é **invisível**, porque o cliente que
> desistiu nunca avisa que desistiu.

A palavra que sustenta o posicionamento é **invisível**. O barbeiro consegue contar os no-shows.
Ele **não consegue contar** os clientes que mandaram mensagem, não foram respondidos a tempo e
foram cortar em outro lugar. Ele não sabe o tamanho do buraco. Nós conseguimos medi-lo — tempo
de primeira resposta é métrica que o produto produz nativamente.

---

## 3. Quem sofre com essa dor

**Sofredor primário [FATO, `openspec/project.md` + `docs/business/contexto-negocio.md`]:**
o **barbeiro-dono que ainda corta**. Não o gestor de barbearia, não o investidor — o cara cuja
receita depende das próprias mãos e cuja gestão depende do mesmo par de mãos.

Detalhamento completo em [persona-icp.md](persona-icp.md). Recorte mínimo aqui:

- Dono presente, cortando 5-8 horas por dia [FATO — ICP diz "dono presente"].
- 2-4 cadeiras, com barbeiros parceiros/comissionados [correção proposta ao SDD — ver § 12.3].
- WhatsApp pessoal ou WhatsApp Business no próprio celular, sem ninguém dedicado a responder.

**Sofredores secundários** (importam para a comunicação, não são compradores):

- **O barbeiro parceiro/comissionado** — perde comissão quando a cadeira fica vazia por no-show,
  e não tem poder nenhum sobre o canal. É frequentemente quem **reclama** e quem influencia o dono.
- **O cliente final da barbearia** — manda mensagem e não é respondido. A dor dele é o combustível
  emocional da dor do dono ("meu atendimento é bom, mas meu zap é péssimo").
- **A esposa/sócia/familiar que "ajuda com o Instagram"** — costuma ser quem responde o zap de
  graça e mal, nas horas vagas. [HIPÓTESE, muito comum no segmento — validar em campo.]

---

## 4. Como a dor se manifesta no dia a dia (cenas concretas)

[HIPÓTESE estruturada a partir do ICP do SDD e do roteiro real em `site/data.js` `WA_SCRIPT`.
São cenas plausíveis e reconhecíveis, não observações de campo registradas.]

1. **14h02.** Chega "oi, tem horário pra amanhã?". O barbeiro está com a máquina na mão. Vê a
   notificação de canto de olho. Pensa "respondo daqui a pouco".
2. **14h50.** Termina o corte, atende o próximo que já está sentado. Não responde.
3. **17h30.** Lembra. Responde. O cliente já marcou no concorrente da esquina que respondeu em
   dois minutos — ou simplesmente não responde mais nunca.
4. **Fim do dia.** O barbeiro rola 14 conversas não lidas e responde tudo em bloco, cansado, no
   sofá, com respostas curtas. Alguns já se resolveram sozinhos. Ele não sabe quais.
5. **Domingo à noite.** Olha a agenda da semana no caderno e vê buracos. Não sabe explicar por quê.
   Culpa "o mês fraco", "o povo sem dinheiro", "a crise do bairro".
6. **Quarta, 15h.** Cliente marcado não aparece. Ninguém confirmou. A cadeira fica 40 minutos
   parada no melhor horário. Ele não cobra nada — cobrar sinal "afasta cliente".
7. **Um dia qualquer.** Passa na rua e vê o cliente que ele cortava há dois anos saindo de outra
   barbearia. Nunca soube que tinha perdido.

A cena 7 é a **manifestação emocional máxima** da dor central e o melhor material bruto que este
documento entrega para a etapa futura de posicionamento.

---

## 5. Por que essa dor existe (causa raiz, não sintoma)

1. **[FATO — `openspec/project.md`] O canal de venda do segmento é o WhatsApp, não a agenda
   online.** O cliente de barbearia não abre app, não preenche formulário: ele manda mensagem
   como manda para um amigo. Qualquer solução que exija que o cliente mude de canal está
   nadando contra a cultura do segmento.
2. **[FATO — ICP no SDD] O dono não tem processo.** Usa "Instagram + WhatsApp + papel/memória;
   nunca usou CRM". Não existe registro de quem escreveu, quem foi respondido, quem sumiu. O que
   não é registrado não é gerenciado — e sequer é percebido.
3. **[INFERÊNCIA] A estrutura de custo do negócio proíbe a solução óbvia.** A resposta natural
   seria contratar recepcionista. Numa casa de 2-4 cadeiras isso custa (salário + encargos)
   algo em torno de R$2.000-2.800/mês para cobrir um turno — comparável ao lucro líquido de uma
   cadeira inteira. Economicamente inviável. [VALIDAR o número com um dono real do DF.]
4. **[FATO — decorre do modelo do próprio negócio] O barbeiro é remunerado por hora ocupada,
   então a hora dele é sempre mais valiosa cortando.** Toda vez que ele escolhe cortar em vez
   de responder, ele está tomando a decisão **racional de curto prazo** — e é exatamente por
   isso que a dor nunca se resolve sozinha. Não é preguiça nem desorganização: é um dilema
   estrutural. Este é o ponto de empatia mais importante do posicionamento.
5. **[FATO — `docs/business/contexto-negocio.md`] A objeção "não tenho tempo de aprender mais
   uma coisa"** prova que ele já entendeu que a solução tradicional (um software para *ele*
   operar) é mais trabalho, não menos. Ou seja: a dor é agravada pelas próprias tentativas de
   solução do mercado.

---

## 6. Consequências de não resolver

### Financeiras

Modelo, não medição. [HIPÓTESE / cálculo do modelo.]

**Referência de ticket do segmento** [FATO — realidade de preço confirmada pelos sócios,
2026-07-28]: **corte entre R$30 e R$55**; corte + barba somando tipicamente **R$55-80**.
Ticket médio de referência para todo cálculo deste documento: **R$45**.

| Vazamento | Cálculo do modelo | Ordem de grandeza / mês |
|---|---|---|
| Cliente novo perdido por demora na resposta | 2-4 contatos perdidos/semana × R$45 | R$360-720 no primeiro mês |
| **Efeito composto** do mesmo cliente (o que realmente dói) | cliente recorrente vale, ao longo de um ano: mensal de corte ≈ 12 × R$45 = **R$540**; quinzenal de corte ≈ 24 × R$40 = **R$960**; quinzenal de corte+barba ≈ 24 × R$70 = **R$1.680** | perder 1 cliente recorrente = perder **R$540 a R$1.680 por ano** |
| No-show | ~8/semana × R$45 | ~R$1.440 |
| Base inativa não reativada | ~200 clientes parados, régua de 21 dias; recuperar ~1 em 4 | ~47 clientes × R$45 = ~R$2.100 no mês da reativação, e mais na recorrência |

**Regra de uso destes números:** sempre com a âncora do cálculo à vista ("cliente de corte+barba,
quinzenal, ao longo de um ano"), **nunca soltos**. Número sem âncora soa como conversa de
vendedor e derruba a credibilidade — que é o ativo mais caro que a Blade tem hoje.

**Âncora de payback (a conta que fecha a venda):** com ticket de R$45, a mensalidade de R$697
se paga com **~16 atendimentos recuperados no mês** — ou, dito do jeito dele: **evitar 4 no-shows
por semana já paga o sistema inteiro**, sobrando o resto.

### Operacionais

- Agenda cheia de buraco em horário nobre e lotada em horário morto — sem ninguém redistribuindo.
- Encaixe manual e caótico ("dá pra me encaixar?" no meio do corte).
- O dono trabalha 10-12h e a parte comercial acontece de graça, à noite, no sofá — jornada
  invisível que não vira faturamento.
- Nenhum dado: ele não consegue responder "quantos clientes eu tenho?", "quantos sumiram?".

### Emocionais (o motor real da compra)

- **Sensação de estar sempre correndo atrás e nunca à frente.** Culpa por não responder.
- **Impotência:** ele sabe que perde cliente, mas não sabe quanto nem quem. Perda sem rosto.
- **Frustração com o próprio negócio:** ele é excelente no ofício e sente que o negócio não
  corresponde ao talento — e não sabe apontar o que está errado.
- **Medo de parar de crescer.** A barbearia depende dele; se ele parar, tudo para. Ele não está
  construindo um negócio, está comprando um emprego caro.
- **Vergonha discreta:** deixar cliente no vácuo contradiz a autoimagem dele ("meu atendimento é
  meu diferencial").

---

## 7. Como o cliente tenta resolver hoje — e por que falha

| Tentativa atual | Por que ele faz | Por que falha |
|---|---|---|
| **Responder nos intervalos / no fim do dia** | é grátis e "dá pra levar" | a janela de decisão do cliente é de minutos; resposta tardia chega depois da decisão. E é jornada não paga. |
| **Mensagem automática do WhatsApp Business** ("Olá, retornarei em breve") | fácil, nativo | não agenda nada, não mostra horário, não conversa. Sinaliza ausência em vez de resolver — em alguns casos piora a percepção. |
| **Respostas rápidas / catálogo do WhatsApp Business** | organiza um pouco | ainda exige que **ele** dispare. Zero automação real. |
| **Colocar a esposa/um parceiro/estagiário para responder** [HIPÓTESE] | custo baixo | inconsistente, sem processo, sem histórico, e some quando a pessoa tem outra coisa pra fazer. |
| **App de agendamento do setor** (categoria Trinks / AppBarber / Booksy / Agendo) [INFERÊNCIA de mercado — pesquisa em `add-crm-clientes/exploration.md` cita Fresha/Booksy/Zenoti] | é o que aparece no Instagram e no Google | **falha no ponto crítico: exige que o CLIENTE FINAL mude de canal.** O cliente continua mandando zap. O app vira agenda digital que só o dono usa, e a mensagem continua sem resposta. Além disso, exige que ele opere e mantenha. |
| **Contratar recepcionista** | resolve de verdade | custo incompatível com 2-4 cadeiras; cobre um turno só; falta, adoece, pede demissão, leva o conhecimento embora. |
| **Agência de tráfego pago** | promessa de "mais clientes" | joga **mais** demanda num canal que já não é atendido. Aumenta o vazamento em vez de tapá-lo. É o "inimigo" natural do nosso posicionamento — e o SDD já registra isso: *"Não vendemos tráfego. Vendemos processo."* [FATO] |
| **Cobrar sinal/depósito para reduzir no-show** | ataca a dor visível | trata sintoma B, não a causa; e o segmento resiste ("afasta cliente"). |

**Padrão único de falha (esta é a formulação que sustenta o diferencial):**
todas as soluções atuais são **ferramentas que alguém precisa operar** ou **exigem que o cliente
final mude de comportamento**. As duas premissas são falsas no mundo do barbeiro. Ele não tem
operador e o cliente dele não muda de canal.

**A Blade é a única categoria que assume as duas verdades:** ninguém opera do lado do barbeiro, e
o cliente final continua fazendo exatamente o que já faz — mandando mensagem no zap.

---

## 8. Por que a Blade Mídia está em posição de resolver

| Ativo | Evidência no SDD | Por que importa |
|---|---|---|
| **Foco exclusivo em barbearia** | [FATO] `project.md` — "especializada exclusivamente em barbearias" | permite roteiro, vocabulário e regras específicos ("encaixe", "corte+barba", régua de 21 dias) que nenhuma ferramenta genérica tem. |
| **Entrega como serviço gerenciado, não como software** | [FATO] promessa "sistema instalado, funcionando, sem você operar nada" | ataca diretamente o padrão de falha da § 7. |
| **Custódia total da conexão WhatsApp** | [FATO] decisão de Vítor, 2026-07-06, em `add-agency-ops-panel/exploration.md` | o barbeiro não instala, não configura, não mantém. E cria lock-in deliberado. |
| **Atendimento no canal que já existe** (Evolution API, dispositivo vinculado) | [FATO] decisão de 2026-07-06 | o número continua sendo o dele, ele continua usando o app normalmente, o cliente final não percebe mudança nenhuma. Este é o encaixe técnico exato com a dor. |
| **Base de dados própria já construída** | [FATO] clientes, histórico, agenda com garantia anti-double-booking, relatórios, fidelização e papéis já implementados | a automação de atendimento age sobre uma base estruturada — sabe quem é o cliente, o que ele consome, quando veio pela última vez. É o que separa um "robô de respostas" de um atendimento com contexto. |
| **Dois sócios com papéis reais** (técnico + comercial) | [FATO] `README.md` | serviço gerenciado exige alguém respondendo por incidente; a Blade assumiu isso formalmente (responsabilidade integral por queda/ban). |
| **Métrica que ninguém do segmento mostra** | tempo de primeira resposta é produzido nativamente pelo produto | permite tornar **visível** a perda invisível — que é o núcleo da dor. |

**Nota de sequenciamento:** a entrega da Blade é **gerenciada** — o que o cliente compra é o
resultado (o zap atendido), não o acesso a um software. Isso é uma escolha, não um contorno: a
agência opera o que for preciso operar, com a automação assumindo progressivamente. O painel do
produto é uma **conveniência** para o barbeiro que quiser olhar, nunca um requisito de uso. Toda
comunicação deve refletir isso: vendemos o resultado e a operação, não a ferramenta.

---

## 9. Hierarquia de dores — o que atacar e o que subordinar

| Nível | Dor | Papel na comunicação |
|---|---|---|
| **CENTRAL** | O WhatsApp da barbearia fica sem operador no horário comercial; a demanda que já chega vaza em silêncio | **É a única dor que a marca ataca de frente.** Todo posicionamento parte daqui. |
| Secundária 1 | No-show / cadeira vazia em horário nobre | **Prova**, não tese. Entra como consequência ("ninguém confirmou porque ninguém estava lá"). É a dor mais *visível* — ver § 10. |
| Secundária 2 | Cliente antigo que sumiu e nunca foi chamado | **Prova de extensão**: "o mesmo motivo que não responde quem chega, não chama quem sumiu". |
| Derivada | Falta de dados / não saber os números do próprio negócio | benefício de segunda ordem. Nunca abre a conversa (o barbeiro não compra relatório). |
| Derivada | Desorganização de agenda / caderno | funcionalidade, não dor. Não vender isso. |
| Derivada | Fidelização / recompensa por visita | retenção de segunda ordem. Fase 4. Não é argumento de entrada. |
| **NÃO É NOSSA DOR** | Falta de clientes novos / marketing / tráfego | [FATO] fora de escopo. Confundir isso com a nossa dor destrói o posicionamento e nos joga na vala comum das agências. |

**Regra de disciplina de marca derivada desta tabela:** uma peça de comunicação pode citar
secundárias, mas **nunca pode ter duas teses**. Se a peça não puder ser resumida em "seu zap fica
sem ninguém e você perde cliente sem saber", ela está fora do posicionamento.

---

## 10. Tensão estratégica que precisa de decisão dos sócios

**[INFERÊNCIA — a mais importante deste documento.]**

Existe um descompasso entre **a dor mais cara** e **a dor mais consciente**:

| | Dor mais cara | Dor mais consciente |
|---|---|---|
| Qual é | mensagem não respondida (perda invisível) | no-show (cadeira vazia que ele vê) |
| Ele percebe? | **Não.** Nunca vê o cliente que desistiu | **Sim.** Dói na hora, com hora marcada |
| Ele reclama disso? | raramente, e sem nomear | sempre |
| Tamanho do prejuízo | maior (composto, contínuo, sobre aquisição *e* retenção) | menor, mas concentrado e datado |

Vender a dor mais cara exige **primeiro fazer o cliente enxergá-la** — é uma venda de
"educação de problema", mais lenta, mais dependente de diagnóstico e de prova.
Vender a dor mais consciente é mais rápido, mas nos coloca a competir com apps de agendamento
baratos, num terreno onde nosso diferencial é menor.

**Recomendação deste documento:** manter a **perda invisível como dor central e tese da marca**
(é ela que justifica R$697/mês e nos tira da comparação com app de R$70/mês), e usar o **no-show
como porta de entrada de conversa e prova concreta** — nunca como tese. O formulário de
diagnóstico do site (já capturando leads no Netlify Forms, [FATO]) é exatamente a ferramenta certa
para converter a dor inconsciente em consciente: ele deve medir e devolver o tamanho do buraco.

**[VALIDAR]** Esta é uma escolha comercial, não técnica — cabe a Matheus ratificar ou reverter.

---

## 11. Eixo de posicionamento: capacidade de atendimento

A dor central define o eixo em que a Blade compete. Não é "retenção" no sentido técnico, nem
"aquisição": é **capacidade de atendimento** — *a barbearia continua atendendo quando o dono não
pode*.

| O eixo | O que significa | Por que importa |
|---|---|---|
| **Capacidade de atendimento** | a demanda que já chega é atendida em segundos, sempre, sem depender das mãos do dono | cobre as três manifestações (resposta, confirmação, reativação) sob uma única promessa |
| **Não é tráfego/divulgação** | não geramos demanda nova — tapamos o vazamento da que já existe | [FATO] "Não vendemos tráfego. Vendemos processo." Manter essa fronteira é o que protege o posicionamento |
| **Não é software** | o cliente compra resultado operado, não acesso a uma ferramenta | é o que responde a objeção "não tenho tempo de aprender mais uma coisa" |

**Teste de coerência para qualquer peça futura:** se a peça não puder ser resumida em
*"seu zap fica sem ninguém e você perde cliente sem saber"*, ela está fora do posicionamento.

---

## 12. O que este documento NÃO faz

- Não escreve copy, headline, slogan, anúncio ou campanha (proibido nesta etapa).
- Não altera produto, protótipo, spec ou código.
- Não fecha o preço da taxa de gestão (pendência de Matheus, `add-agency-ops-panel`).
- Não substitui `openspec/project.md` — o complementa e é referenciado por ele.

---

## 13. Formulação canônica (para uso em todas as etapas seguintes)

Estas quatro linhas são o contrato de posicionamento. Toda peça futura de branding, copy ou
produto deve ser checável contra elas.

- **Dor:** o WhatsApp da barbearia fica sem ninguém no horário em que a demanda chega, e o
  prejuízo disso é invisível para o dono.
- **Quem:** o barbeiro-dono que corta o dia inteiro numa casa de 2-4 cadeiras — ver
  [persona-icp.md](persona-icp.md).
- **Por que ninguém resolveu:** todas as alternativas exigem que alguém opere, ou que o cliente
  final mude de canal. Nenhuma das duas coisas acontece numa barbearia.
- **O que a Blade faz:** coloca um atendente que não sai da cadeira — dentro do zap que já existe,
  operado por nós, sem o barbeiro tocar em nada.

---

## 14. Hipóteses que precisam ser validadas (e como)

Ordenadas por risco: uma hipótese falsa no topo derruba tudo abaixo.

| # | Hipótese | Como validar | Quem | Custo |
|---|---|---|---|---|
| H1 | O barbeiro-dono realmente perde clientes por demora na resposta, em volume relevante | Pedir a 5-8 donos do DF para abrirem o WhatsApp e contar, numa semana: quantas conversas iniciadas por cliente ficaram >1h sem resposta e quantas morreram sem agendamento | Matheus | 1 semana, R$0 |
| H2 | Ele **não sabe** que perde (a perda é de fato invisível) | Na mesma conversa, perguntar *antes* de abrir o zap: "quantos clientes você acha que perdeu por demora esse mês?" e comparar com o número real contado | Matheus | junto com H1 |
| H3 | Ver o número medido gera intenção de compra (a dor vira consciente e dói) | Observar a reação e propor a oferta na mesma reunião; medir taxa de avanço para proposta | Matheus | junto com H1 |
| H4 | O ticket R$697 + R$997 é aceito por casas de 2-4 cadeiras | 5 propostas reais; medir objeção de preço vs objeção de confiança | Matheus | ~30 dias |
| H5 | O cliente final aceita ser atendido por resposta automática sem estranhar | Parear um número real de teste e rodar conversas reais (é o **próximo passo 1** do `CLAUDE.md`) | Vítor | dias |
| H6 | A dor mais cara (invisível) vende melhor que a dor mais consciente (no-show) — ver § 10 | Testar as duas abordagens de abertura em prospecção, 10 contatos cada, medir taxa de reunião | Matheus | ~2 semanas |
| H7 | Recepcionista custa ~R$2.000-2.800/mês e é a alternativa mentalmente comparável | Perguntar diretamente em 3 conversas: "já pensou em contratar alguém pro zap? por que não?" | Matheus | junto com H1 |
| H8 | O piso de faturamento proposto (§ 11.3) está correto | Correlacionar, nas conversas, faturamento declarado × volume de mensagem × reação ao preço | Matheus | ~30 dias |

**Critério de revisão deste documento:** se H1 ou H2 forem falsas, a dor central muda e este
documento deve ser reescrito, não emendado.

---

## Referências

- [openspec/project.md](../../openspec/project.md) — contexto oficial e decisões D1-D6
- [docs/business/contexto-negocio.md](contexto-negocio.md) — briefing, tom de voz, design system
- [docs/business/persona-icp.md](persona-icp.md) — **documento par: para quem resolvemos**
- [site/data.js](../../site/data.js) — problemas, métricas e FAQs publicados hoje
- [openspec/changes/add-agency-ops-panel/exploration.md](../../openspec/changes/add-agency-ops-panel/exploration.md) — modelo de serviço gerenciado, custódia e responsabilidade
- [openspec/changes/archive/add-crm-clientes/exploration.md](../../openspec/changes/archive/add-crm-clientes/exploration.md) — pesquisa de mercado e roadmap de 5 fases
- [CHANGELOG.md](../../CHANGELOG.md) — o que existe de fato em produto hoje
