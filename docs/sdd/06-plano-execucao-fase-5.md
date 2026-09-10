# Plano de Execução — Fase 5 (canal WhatsApp + atendimento por IA)

> **Documento de execução**, escrito em 2026-09-07 por um agente arquiteto (Opus 5) para ser
> executado por outro agente. Não é uma spec e não substitui nenhuma: as specs de cada
> capability continuam nascendo pelo fluxo do [workflow.md](../../openspec/workflow.md).
> O que este documento faz é **congelar as decisões de arquitetura, os contratos externos e a
> barra de verificação** para que a execução não precise re-derivá-los.
>
> **Se você é o agente que vai executar: leia este arquivo inteiro antes da primeira ação.**

---

## 0. Como usar este documento

### Ordem de leitura obrigatória antes de qualquer tarefa

1. Este arquivo, inteiro.
2. [`CLAUDE.md`](../../CLAUDE.md) — regras invioláveis do repositório.
3. [`openspec/project.md`](../../openspec/project.md) — decisões estruturais D0–D6.
4. [`docs/business/dor-central.md`](../business/dor-central.md) → [`persona-icp.md`](../business/persona-icp.md) → [`guia-de-copy.md`](../business/guia-de-copy.md) — portão estratégico. Para a Fase 5 a § 13.9 do guia de copy é **normativa**, não sugestão: ela define as duas vozes (Blade→barbeiro e barbearia→cliente final).
5. [`openspec/workflow.md`](../../openspec/workflow.md) e [`conventions.md`](../../openspec/conventions.md).
6. A spec permanente da capability que você vai tocar, em `openspec/specs/`.

### As cinco regras que valem mais que qualquer pressa

1. **Nada de implementação sem `Status: Approved` no `proposal.md`.** Se te pedirem código antes disso, aponte o fluxo e ofereça conduzir a exploração. Isto é o D6 e não tem exceção.
2. **Nunca invente requisito.** O que não estiver confirmado é Premissa, Ponto em aberto ou Risco — classificado explicitamente, com essas palavras.
3. **Evidência real, não typecheck.** A cultura verificada deste repositório (Fases 1–4) é: teste automatizado *mais* fluxo HTTP real via `curl` *mais* boot real do processo. `pnpm typecheck` verde não é evidência de nada. Marcar `[x]` numa task sem evidência colada é violação de processo.
4. **Toda query escopada por `barbershop_id`** via camada de repositório (ADR-0007). Sem exceção, inclusive nas tabelas novas desta fase.
5. **Nunca logar conteúdo de mensagem de cliente final, telefone completo, token ou segredo.** Telefone mascarado como `***1234`. Isto já é regra do repositório e na Fase 5 fica crítico, porque pela primeira vez o produto processa mensagens reais de terceiros.

### Quando PARAR e perguntar ao Matheus

Pare — não decida sozinho — se:

- uma pergunta bloqueante do `exploration.md` não tiver resposta registrada;
- a implementação exigir mudar comportamento já descrito numa spec permanente;
- surgir um custo recorrente novo (Meta, Anthropic, infra) não previsto no D4;
- um texto que o cliente final vai receber não passar no checklist da § 14 do guia de copy;
- você precisar de um segredo, credencial, número de telefone ou acesso a console externo.

---

## 1. Estado verificado do repositório (2026-09-07)

Verificado por inspeção direta nesta data — não confie em memória, mas também não perca tempo re-verificando o que está aqui.

### O que já existe e está mergeado na `main`

| Fase | Change | Entregou |
|---|---|---|
| 1 | `add-crm-clientes` | `apps/web` (Next 15) + `packages/db` (Drizzle+Postgres); CRM, visitas, financeiro por visita, dashboard, auth por cookie HMAC |
| 2 | `add-agendamento` | `packages/core` (`AgendaService`, motor de disponibilidade, `agenda/tools.ts`), `apps/worker` (pg-boss), `packages/ai` (esqueleto); 7 tabelas; anti-double-booking por restrição de exclusão Postgres |
| — | `add-agenda-visao-semanal` | Grade semanal interativa; `GET /api/agenda/occupancy` |
| 3 | `add-relatorios` | `packages/core/relatorios`, `report_snapshots`, tela `/relatorios`, PDF real, job `relatorios.monthly-snapshot` |
| 4 | `add-fidelizacao-e-funcionarios` | `fidelizacao-clientes` + `auth-tenancy` (papéis `dono`/`funcionario`), retrofit de autorização em ~25 rotas |

Todas arquivadas em `openspec/changes/archive/`. Specs permanentes em `openspec/specs/`: `crm-clientes`, `agendamento`, `relatorios`, `fidelizacao-clientes`, `auth-tenancy`.

### Os quatro pontos de encaixe que a Fase 5 vai consumir

Estes já existem, foram construídos deliberadamente para esta fase, e **não devem ser reescritos**:

1. **`packages/core/src/agenda/tools.ts`** — contrato de 4 tools (`consultar_disponibilidade`, `criar_agendamento`, `remarcar_agendamento`, `cancelar_agendamento`). Cada uma tem `name`, `description`, `inputSchema` (Zod) e `handler(barbershopId, input)`. Toda escrita já vai com `source: "bot"`. **Este é o único caminho de escrita da agenda pelo bot** (ADR-0008) — não crie caminho paralelo.
2. **`packages/ai/src/tools/index.ts`** — traduz as tools para o formato tool-use da Claude API, com JSON Schema mantido **à mão**, espelhando o Zod. O próprio arquivo diz para reavaliar isso na Fase 5. Você vai reavaliar (ver § 4.3).
3. **`apps/worker/src/jobs/send-confirmation.ts`** — esqueleto honesto: `listAppointmentsNeedingConfirmation(now)` seleciona os agendamentos na janela de `confirmation_lead_hours` e apenas loga. Cron `0 * * * *`.
4. **`apps/worker/src/jobs/reactivation-sweep.ts`** — esqueleto honesto: usa `getDashboard(shop.id).clientsToReactivate` e apenas loga a contagem por barbearia. Cron `0 8 * * *`.

Também relevante: `packages/db/src/repositories/clients.ts` já exporta `findClientByPhone(...)` — é o gancho para casar uma mensagem recebida com um cliente do CRM.

### Estado do git nesta data

- Branch atual: `main`, sincronizada com `origin/main` (`1fd8207`).
- **5 arquivos modificados e NÃO commitados**, todos do mesmo tema (saída do Vítor da sociedade, atualização de 2026-09-07): `CLAUDE.md`, `README.md`, `apps/web/README.md`, `docs/operations/onboarding-produto.md`, `openspec/project.md`. Coerentes entre si. Resolver na Fase 0.
- Changes ativas em `openspec/changes/`: `add-agency-ops-panel` (Approved, só Fase 0 das 21 tasks) e `init-project-skeleton` (Draft, **órfã** — o monorepo que ela propunha já existe de fato, nasceu dentro de `add-crm-clientes`).
- `openspec/changes/README.md` tem a tabela "Índice de changes ativas" **vazia**, portanto desatualizada.
- Bloco "Estado atual e próximos passos" do `CLAUDE.md` está datado de 2026-07-06 e lista como próximo passo coisas já concluídas.

---

## 2. Decisões tomadas por Matheus em 2026-09-07

Estas três respostas foram dadas explicitamente e **não devem ser reabertas** sem ele. Registre-as nos artefatos SDD como Fato, citando esta data.

### D2 resolvida — provedor é **Meta Cloud API** (oficial)

Decidido sem a spike técnica que o ADR-0004 exigia. O ADR precisa ser atualizado para `Aceito` registrando honestamente que a decisão foi tomada por juízo dos sócios e não por dado de spike, com os riscos remanescentes listados. **Não reescreva a história do ADR** — a seção de contexto continua válida; acrescente uma seção de decisão final datada.

### Escopo — Fase 5 completa, 4 capabilities, em changes separadas e sequenciais

`whatsapp-canal` → `atendimento-ia` → `confirmacao-agendamento` → `reativacao-clientes`.

### Modelo de IA — `claude-haiku-4-5`, com portão de qualidade

Mantém o ADR-0005. Critério de saída definido na change `add-atendimento-ia`: bateria de conversas reais em PT-BR. Se reprovar, a troca é por variável de ambiente `AI_MODEL`, sem mexer em código.

### Segunda rodada de decisões — mesma data

Tomadas depois de o arquiteto apontar que "número atual + Meta Cloud API + barbeiro responde no WhatsApp" pareceria, no caminho clássico da Cloud API, uma combinação impossível (ver § 3.3). **Correção registrada na sessão seguinte: Matheus estava certo.** Existe um caminho oficial da Meta — coexistência — que permite exatamente o que ele descreveu. A pesquisa contra a documentação oficial confirmou isso em 2026-09-07 (§ 3.3, § 5.8). O trecho abaixo, mantido como histórico da negociação, está **superado** no ponto sobre a caixa de entrada; a versão vigente está em § 3.3 e § 6.

**O canal usa o número que a barbearia já usa.** Isto continua valendo. ~~O número sai do aplicativo do WhatsApp e passa a viver na Cloud API. O barbeiro perde o WhatsApp naquele número.~~ **Superado:** com coexistência, o número fica no app e na API ao mesmo tempo.

~~**Consequência aceita: o atendimento humano acontece dentro do produto.** A caixa de entrada no painel deixa de ser item desejável e vira escopo obrigatório.~~ **Superado:** a caixa de entrada volta a ser desejável — o barbeiro responde pelo app dele, como sempre fez. Ver § 3.3 e § 6 para o desenho vigente.

**Exclusão LGPD de cliente anonimiza as mensagens, não as apaga.** Isto continua valendo, sem mudança. Telefone vira `NULL` e o vínculo com o cliente cai; o conteúdo operacional fica. É exatamente o padrão que `crm-clientes` já usa em `clients.phone` — e a consistência com a spec já aprovada é o motivo de ser esse e não outro.

**Reativação por mensagem de marketing está autorizada** ("é só uma mensagem perguntando se ele vai voltar"). Autorização registrada, com três ressalvas que **não** foram dispensadas e continuam valendo como requisito: a Meta classifica esse envio como template de **categoria marketing** independentemente de quão curta seja a mensagem; opt-out é obrigatório; e o envio precisa ser escalonado no tempo (§ 9).

---

## 3. Consequências da escolha Meta Cloud API — leia antes de desenhar qualquer coisa

Esta seção existe porque a escolha de provedor não é um detalhe de adapter: ela reescreve duas das quatro capabilities.

### 3.1 A janela de 24 horas é a regra que organiza a fase inteira

A Cloud API separa dois mundos:

| Situação | O que pode ser enviado |
|---|---|
| Dentro de 24h da **última mensagem recebida do cliente** | Texto livre. É aqui que o bot de IA vive. |
| Fora dessa janela, ou primeira mensagem da barbearia | **Somente template pré-aprovado pela Meta.** |

Consequências diretas:

- **`atendimento-ia` é fácil**: o cliente sempre escreve primeiro, então a resposta livre é sempre legal.
- **`confirmacao-agendamento` e `reativacao-clientes` são difíceis**: as duas são iniciadas pela barbearia, quase sempre fora da janela. Elas **não podem** simplesmente renderizar o texto de um preset como a `automation/` faz hoje. Precisam de template aprovado, com nome, idioma (`pt_BR`), categoria e parâmetros posicionais.
- O sistema precisa **saber em que janela cada conversa está**. Isso é estado persistido (`last_inbound_at` por conversa), não algo que dá para inferir na hora do envio.

### 3.2 Templates são um ativo externo com prazo e risco de reprovação

- Precisam ser submetidos e aprovados pela Meta antes do primeiro envio. O prazo é da Meta, não seu.
- A categoria importa: confirmação de agendamento é *utility*; reativação de cliente inativo é *marketing* — e marketing tem regras de opt-out mais rígidas e custo diferente.
- Um template pode ser **reprovado** ou ter a qualidade rebaixada por reclamação de usuário.
- Por isso: **submeter os templates é uma tarefa operacional do Matheus que precisa começar cedo**, em paralelo à implementação — não no fim. Ela entra como pré-requisito das changes 3 e 4, com folga.

### 3.3 O número fica no celular do barbeiro — CONFIRMADO em 2026-09-07, com uma condição em aberto

Matheus estava certo: existe um caminho oficial da Meta em que **o número continua no celular, no WhatsApp Business App**, ao mesmo tempo em que fala com a Cloud API. Confirmado contra a documentação oficial da Meta for Developers nesta data (fontes em `docs/architecture/decisions/ADR-0004-whatsapp-provider-abstraido.md`, seção "Decisão final"). Isto substitui a versão anterior desta seção, que tratava isso como incerto.

**Primeiro, a ambiguidade do nome que causou a dúvida.** "WhatsApp Business" designa dois produtos diferentes:

| | O que é | Onde roda |
|---|---|---|
| **WhatsApp Business App** | O aplicativo gratuito que o barbeiro instala | Celular dele |
| **WhatsApp Business Platform / Cloud API** | A API da Meta — o que a D2 escolheu | Servidor. Não tem app sozinho. |

O caminho que faria o número sair do celular é o registro "clássico" direto na Cloud API, sem coexistência. **Não é esse o caminho que a Blade vai usar.**

**O caminho de coexistência — chamado oficialmente "Onboarding WhatsApp Business app users" — é real, está em produção desde 2024/2025, e funciona assim:**

- O número continua no app do celular (versão 2.24.17+) **e** passa a responder pela Cloud API ao mesmo tempo.
- Mensagens são **espelhadas nos dois sentidos, em tempo real**: o que chega ou sai pela API aparece no app do barbeiro, e o que ele digita no app chega ao produto pelo webhook, como qualquer outra mensagem. Isso significa que **o barbeiro pode responder direto pelo app**, sem nunca abrir o produto, e o sistema fica sabendo — porque a mensagem dele também chega pelo webhook.
- Histórico de até 180 dias sincroniza, mas só com consentimento explícito no onboarding.
- Chat em grupo não sincroniza; mensagens que desaparecem, visualização única e localização ao vivo são desligadas.
- **A Meta não arbitra quem responde primeiro.** Se o bot e o barbeiro respondem à mesma mensagem em paralelo, os dois saem — a app não impede. O `handover` continua sendo problema nosso a resolver, e precisa tratar como "resposta humana" **tanto** uma ação no painel **quanto** uma mensagem que chegou pelo webhook com a marca de ter sido enviada pelo próprio número do negócio (não pelo cliente) fora do fluxo do bot.

**Condição em aberto, não sobre "se existe" mas sobre "quem opera":** para ligar a coexistência, é preciso que alguém tenha status de **Meta Tech Provider** (ou usar um **BSP** que já tenha). Isto é um achado novo — não estava previsto quando a decisão pela Meta foi tomada. Ver § 5.9 — é a próxima pergunta bloqueante, e **decide se o cenário abaixo se confirma tal como descrito ou se ganha uma camada intermediária (BSP) com custo e prazo próprios.**

#### O que isso muda na Change 1 (assumindo Tech Provider/BSP resolvido a favor da coexistência)

- **A caixa de entrada no painel deixa de ser obrigatória e volta a ser desejável.** O barbeiro pode operar 100% pelo app que ele já conhece. A change 1 encolhe: o escopo mínimo vira ingestão + persistência + envio + `handover`, sem exigir UI de conversa pronta no dia 1.
- **O problema de notificação desaparece.** Ele continua recebendo push do WhatsApp Business App exatamente como hoje.
- **O runbook de onboarding fica bem mais simples** — não existe mais "avisar o que ele perde", porque ele não perde o app.
- **O que fica sendo obrigatório de qualquer forma:** persistir e mostrar em algum lugar (mesmo que rudimentar) o histórico das conversas que o bot conduziu, porque é dado do negócio e alimenta relatório e CRM — só a *UI de responder* deixa de ser obrigatória, não o registro.

#### Vale independente do resultado da § 5.9

**A resposta manual esbarra na janela de 24h**, inclusive pelo app: se o cliente mandou mensagem há 30 horas, nem o bot nem o barbeiro mandam texto livre — só template. Isso é regra da Meta, não do produto, e vale para qualquer um dos dois lados.

### 3.4 O onboarding prometido muda — isso toca a landing

O que a `automation/` faz hoje ("o barbeiro escaneia um QR e em minutos está no ar") não é o caminho Meta. O caminho Meta envolve conta Meta Business, verificação de negócio, WhatsApp Business Account e o registro do número descrito acima.

O runbook precisa cobrir o que hoje não existe: como o barbeiro remove o número do app com segurança, o que ele perde ao fazer isso (avisado **antes**, não depois), e como desfazer se ele desistir — dá para tirar o número da Cloud API e registrá-lo de novo no aplicativo, mas o histórico que ficou para trás não volta.

**Ação obrigatória:** ao final da change `add-whatsapp-canal`, reescrever [`docs/operations/onboarding-produto.md`](../operations/onboarding-produto.md) e conferir se a landing (`site/`) promete algo que o caminho Meta não entrega. Se prometer, é item para o Matheus decidir — não corrija a copy sozinho, porque o [guia de copy](../business/guia-de-copy.md) é fonte da verdade e mexer nele é decisão de negócio.

### 3.5 Custo por conversa — CONFIRMADO em 2026-09-07

Verificado contra a documentação oficial da Meta for Developers (detalhe completo no ADR-0004, seção "Decisão final"). Resumo por capability:

| Capability | Categoria Meta | Custo de mensageria |
|---|---|---|
| `atendimento-ia` | *service* (resposta dentro da janela de 24h aberta pelo cliente) | **Zero.** Todo texto livre trocado com o cliente que escreveu primeiro é gratuito, sem limite. O único custo variável desta capability é a Claude API (§ 4.2). |
| `confirmacao-agendamento` | *utility* | Barato, com desconto por volume; gratuito se cair dentro de uma janela aberta. |
| `reativacao-clientes` | *marketing* | **A única com custo real e sem desconto de volume.** Ordem de grandeza (fonte secundária, não a página oficial de rate card — tratar como estimativa): ~US$0,06 por mensagem entregue no Brasil. **Não comprometer preço ao cliente com este número sem confirmar no Business Manager real.** |

Nenhuma das três tem mensalidade de plataforma — cobrança é só por mensagem entregue.

**O que isso muda:** o medo original de custo pesado em `atendimento-ia` não se confirma — é grátis do lado Meta. O ponto de atenção real do orçamento é `reativacao-clientes`, que segue como tarefa obrigatória na change 4 (§ 9): fazer a conta contra o volume real de inativos de um cliente antes do primeiro envio. Não escreva número de preço neste repositório sem fonte e data ao lado — regra do guia de copy aplicada internamente.

### 3.6 O que morre e o que sobrevive da `automation/`

- **Sobrevive:** a `automation/` inteira como ferramenta operacional da agência (painéis, presets, CRM de barbearias). Continua no regime operacional, sem SDD.
- **Não é caminho para o produto:** `infra/evolution/`, `provision.mjs`, `lib/evolution.mjs`, o fluxo de QR. O canal do produto nasce Meta, do zero, em `packages/whatsapp`.
- **Serve de referência, não de código:** `automation/lib/engine.mjs` mostra o formato do preset e a lógica de escalação para humano; `webhook-server.mjs` mostra o padrão de mascaramento de telefone (`maskPhone`) e de não logar conteúdo. Leia os dois antes de desenhar — mas não importe nada.

---

## 4. Referência técnica congelada

Tudo nesta seção foi conferido contra fonte autoritativa em 2026-09-07. **Use exatamente estas formas.** Se algo aqui divergir do que você "lembra", este documento vence.

### 4.1 Claude API — modelo e parâmetros

- **Model ID exato:** `claude-haiku-4-5`. Sem sufixo de data. Contexto 200K, saída máxima 64K.
- **Thinking:** Haiku 4.5 **não** suporta `thinking: {type: "adaptive"}` nem o parâmetro `effort` — os dois dão erro. Ele usa o formato antigo `{type: "enabled", budget_tokens: N}`. **Para o bot de atendimento, omita `thinking` inteiramente**: agendar e tirar dúvida é tarefa rasa, e a spec vai exigir resposta em segundos.
- **`max_tokens`:** o padrão recomendado geral é ~16000, mas aqui há motivo concreto para ir bem abaixo — mensagem de WhatsApp é curta. Use **1024** e registre a justificativa no `design.md` ("saída deliberadamente curta"), senão vira mágica sem explicação.
- **Erros:** use as classes tipadas do SDK (`Anthropic.RateLimitError`, `Anthropic.APIConnectionError`, `Anthropic.APIError`), encadeadas da mais específica para a mais genérica. **Nunca** casar string de mensagem de erro.
- **`stop_reason`:** cheque antes de ler `content`.

### 4.2 Prompt caching — o achado que corrige o ADR-0005

O ADR-0005 afirma: *"Prompt caching obrigatório no system prompt (persona da barbearia, serviços, regras) para reduzir custo e latência"*, e estima o custo assumindo um system prompt de ~1,5k tokens cacheado.

**Isso não vai funcionar.** O prefixo mínimo cacheável depende do modelo, e no **Haiku 4.5 é de 4096 tokens**. Um system prompt de 1,5k fica silenciosamente abaixo do mínimo: nenhum erro, nenhum aviso, apenas `cache_creation_input_tokens: 0` e `cache_read_input_tokens: 0` para sempre.

A conta refeita, à vista, com os preços do Haiku 4.5 (US$1 por 1M de entrada / US$5 por 1M de saída):

```
por mensagem, sem cache:
  entrada  ~2.500 tokens (1.500 system + ~1.000 histórico) × US$1/1M  = US$0,0025
  saída      ~100 tokens                                   × US$5/1M  = US$0,0005
                                                            total     ≈ US$0,003  ≈ R$0,017

cenário do ADR (500 msgs/cliente/mês × 5 clientes = 2.500 msgs/mês):
  2.500 × US$0,003 ≈ US$7,50/mês ≈ R$42/mês
```

Ou seja: **cerca do dobro do que o ADR estimou, e ainda assim confortável dentro do D4.** A decisão não muda; a documentação sim.

**O que fazer:**

1. Na change `add-atendimento-ia`, corrigir o ADR-0005 numa seção datada: o caching não se aplica ao Haiku 4.5 neste tamanho de prompt, com a conta acima.
2. **Não inflar o system prompt artificialmente para atingir 4096 tokens.** Isso é otimizar a métrica, não o custo.
3. Ainda assim, **escreva o código como se o cache fosse ligar**: system prompt congelado, sem `new Date()` nem id de sessão dentro dele. Data de hoje e nome do cliente vão na mensagem, nunca no system. Se um dia o modelo mudar para Sonnet 5 (mínimo 1024 tokens), o cache passa a funcionar sem refatoração.
4. Instrumente `usage.cache_read_input_tokens` no log estruturado desde o começo, para que a afirmação acima seja verificável e não fé.

### 4.3 Tool use — como ligar as tools que já existem

O SDK é `@anthropic-ai/sdk` (TypeScript). Duas opções:

**Recomendado: tool runner com Zod.** As tools em `packages/core/src/agenda/tools.ts` **já são Zod**, então o encaixe é direto:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";

const tool = betaZodTool({
  name: "consultar_disponibilidade",
  description: "...",
  inputSchema: consultarDisponibilidadeInput, // o MESMO schema do core
  run: async (input) => { /* delega ao handler do core */ },
});

const finalMessage = await client.beta.messages.toolRunner({
  model: "claude-haiku-4-5",
  max_tokens: 1024,
  system: systemPrompt,
  tools: [/* ... */],
  messages,
});
```

Isto **elimina o JSON Schema mantido à mão** em `packages/ai/src/tools/index.ts` — que é exatamente o que o comentário daquele arquivo pede para reavaliar. É uma simplificação real, não uma reescrita gratuita: um espelho manual entre Zod e JSON Schema é uma fonte de divergência silenciosa.

Ressalvas que precisam entrar no `design.md`:
- O tool runner é **beta** (`client.beta.messages`). Aceitável, mas registre como dependência beta.
- O runner executa suas funções automaticamente. As 4 tools da agenda **escrevem no banco**. O `AgendaService` já valida tudo (tenant, conflito, passado, transição), então o risco é contido — mas isso precisa estar escrito como decisão consciente, não acidente.
- Ele resolve o loop **de um turno**. Uma mensagem recebida = um `toolRunner` até o fim = uma resposta enviada. Isso casa exatamente com o modelo de conversa por WhatsApp.

**Alternativa:** loop manual (`while stop_reason === "tool_use"`). Só justifique se o runner beta for recusado.

### 4.4 Meta Cloud API — as formas que o adapter precisa acertar

> **Nota pós-§5.9:** a Blade vai integrar via **BSP** (mensalidade fixa), não direto na Graph API da Meta (ver § 5.9). Muitos BSPs — 360dialog incluso — expõem a API de envio e o webhook de recebimento **como um espelho quase idêntico da Cloud API da própria Meta**, então o que está descrito abaixo tende a valer como referência de formato. Mas **"tende a valer" não é "confirmado"**: antes de implementar, confira a documentação do BSP escolhido para (a) o endpoint e formato de envio, (b) o header e o segredo usados na assinatura do webhook — muitas vezes é um segredo do próprio BSP, não o App Secret da Meta — e (c) se o `phone_number_id` de roteamento é o da Meta ou um identificador próprio do BSP. Trate esta seção como o formato-base a esperar, não como contrato fechado.

Estes são os pontos onde uma implementação errada falha silenciosamente. **Confirme a versão corrente da Graph API (ou o equivalente do BSP) na documentação oficial antes de fixar a URL** — não chute a versão.

**Verificação do webhook (GET).** A Meta chama seu endpoint com `hub.mode`, `hub.verify_token` e `hub.challenge`. Se o `verify_token` bater com o seu segredo, responda **200 com o valor de `hub.challenge` em texto puro** — não JSON, não envelopado. Errar isso impede o cadastro do webhook.

**Assinatura (POST).** Cada entrega vem com o header `X-Hub-Signature-256: sha256=<hmac>`, calculado com o **App Secret** sobre o **corpo bruto da requisição**.

> Armadilha: em Next.js é natural ler `await req.json()` e depois re-serializar para conferir. **Isso quebra a assinatura** — qualquer diferença de bytes (ordem de chaves, espaços) invalida o HMAC. Leia o corpo cru (`await req.text()`), verifique a assinatura sobre ele, e só então faça o parse. E compare com função de tempo constante (`crypto.timingSafeEqual`), nunca com `===`.

**Estrutura do payload recebido.** As mensagens chegam aninhadas em `entry[].changes[].value`, onde `value.messages[]` traz as mensagens recebidas, `value.statuses[]` traz confirmações de entrega/leitura, e `value.metadata.phone_number_id` identifica **qual número da sua conta** recebeu — é a chave de roteamento para o tenant.

**Responder rápido.** A Meta espera 200 em poucos segundos e **reentrega** se demorar ou falhar. Rodar o loop da IA dentro do handler do webhook é erro de arquitetura garantido — ver § 4.5.

**Idempotência.** Reentrega significa mensagem duplicada. Cada mensagem tem id próprio (prefixo `wamid.`). **Guarde e deduplique por esse id** — com restrição de unicidade no banco, não com checagem em memória.

**Envio.** `POST` para `/{PHONE_NUMBER_ID}/messages` na Graph API, com `Authorization: Bearer <token>`. Corpo de texto livre:

```json
{ "messaging_product": "whatsapp", "to": "<E.164>", "type": "text", "text": { "body": "..." } }
```

Corpo de template (para confirmação/reativação):

```json
{ "messaging_product": "whatsapp", "to": "<E.164>", "type": "template",
  "template": { "name": "<nome_aprovado>", "language": { "code": "pt_BR" },
                "components": [ { "type": "body", "parameters": [ {"type":"text","text":"..."} ] } ] } }
```

**Telefone.** Normalize para E.164 na fronteira de entrada. Brasil tem a armadilha do nono dígito em números antigos — trate isso no casamento com `findClientByPhone` e escreva teste para o caso, senão cliente cadastrado vira cliente desconhecido.

### 4.5 Decisão de arquitetura pré-tomada: ingestão assíncrona

**Esta decisão está tomada. Vira ADR-0011 na Fase 0.**

```
Meta → POST /api/webhooks/whatsapp  (apps/web)
         1. lê corpo cru
         2. verifica X-Hub-Signature-256
         3. persiste a mensagem (dedupe por wamid)
         4. enfileira job no pg-boss
         5. responde 200            ← em milissegundos, sempre
                    │
                    ▼
       apps/worker  →  processa o job
                       - resolve tenant e cliente
                       - roda o loop da IA (Fase 5.2)
                       - envia a resposta pelo WhatsAppProvider
```

Racional: a Meta exige 200 rápido e reentrega em caso de lentidão; o loop da IA leva segundos. Fazer inline garante reentrega, resposta duplicada e timeout. O worker com pg-boss **já existe e está provado em produção de teste** (Fases 2 e 3), então isto não adiciona infraestrutura — usa a que está lá.

**Consequência que exige cuidado:** duas mensagens do mesmo cliente em sequência rápida não podem gerar dois loops paralelos respondendo duas vezes. Use a chave de singleton do pg-boss por conversa, ou um lock por conversa no banco. **Escreva teste para esse cenário** — é o bug mais provável desta fase inteira.

### 4.6 Armadilhas conhecidas deste repositório

Aprendidas nas Fases 1–4. Custam horas quando redescobertas.

| Armadilha | O que fazer |
|---|---|
| Next.js + pnpm | O `.npmrc` na raiz precisa de `node-linker=hoisted`. Sem isso o Tailwind compila CSS vazio e `next start` falha com "vendor-chunks not found". Já está configurado — **não remova**. |
| Docker Desktop | Precisa ser iniciado manualmente antes dos testes de integração. Os testes de `packages/db`, `packages/core` e `apps/worker` pulam sozinhos sem `DATABASE_URL`, então **suíte verde sem Docker não prova nada**. Confirme que o Postgres está de pé antes de reivindicar teste passando. |
| `.env` | Carregado da raiz do monorepo por `next.config.ts` e `packages/db/src/load-env.ts`, ambos via `<cwd>/../../.env`. Adicione toda variável nova ao `.env.example` também. |
| Matar processo no Windows | `pkill -f "next start"` não funciona de forma confiável no Git Bash. Use `netstat -ano \| grep :3000` para achar o PID e `taskkill //F //PID <pid>`. |
| SQL com data em template | `${now}` sem cast em template SQL do Drizzle causa `operator does not exist: timestamptz <= interval`. Use `${now}::timestamptz`. Já mordeu em `listNoShowCandidates`. |
| Vazamento de hash de senha | Na Fase 4, rotas e props de página vazaram `authSecretHash` no JSON/RSC. Ao devolver qualquer registro de usuário ou credencial, **mapeie explicitamente os campos seguros** antes de serializar. |
| Test runner | `packages/db`, `packages/core` e `apps/worker` usam Vitest com Postgres real. `apps/web` só ganhou Vitest na Fase 4 e cobre apenas lógica de autorização. |

---

## 5. Fase 0 — higiene e fundação (antes da primeira change)

Não é change: são tarefas de manutenção e de decisão registrada. **Faça tudo antes de abrir `add-whatsapp-canal`.**

### 5.1 Resolver a árvore de trabalho suja

Os 5 arquivos modificados (transição societária) precisam de destino. **Pergunte ao Matheus** se quer commitar — não decida. Se sim: branch `fix/atualiza-estrutura-societaria`, commit convencional, PR.

### 5.2 Atualizar o `CLAUDE.md`

Reescreva o bloco "Estado atual e próximos passos" (hoje datado de 2026-07-06). Ele lista como próximo passo o `init-project-skeleton` e a sequência `auth-tenancy → crm-clientes → agendamento` — tudo concluído. O bloco é descrito no próprio arquivo como "ponto de sincronização entre as IAs"; desatualizado, ele desinforma ativamente.

### 5.3 Encerrar formalmente a `init-project-skeleton`

Está `Draft` mas foi superada pelos fatos: o monorepo existe. Marque `Superseded` com o motivo (nasceu dentro de `add-crm-clientes`) e arquive. O workflow prevê exatamente isso.

### 5.4 Atualizar o índice de changes

`openspec/changes/README.md` tem a tabela "Índice de changes ativas" vazia. Preencha com a realidade e mantenha a partir daí.

### 5.5 ADR-0004 → Aceito ✅ FEITO em 2026-09-07

Seção "Decisão final" acrescentada com os achados de custo (§ 5.7) e coexistência (§ 5.8) confirmados contra a documentação oficial da Meta. Contexto original preservado intacto. Ver `docs/architecture/decisions/ADR-0004-whatsapp-provider-abstraido.md`.

### 5.6 ADR-0011 — ingestão assíncrona de mensagens ✅ FEITO em 2026-09-07

Criado em `docs/architecture/decisions/ADR-0011-ingestao-assincrona-whatsapp.md`, formato completo de `conventions.md`.

### 5.7 Verificar o custo real da Meta *(bloqueante)* ✅ FEITO em 2026-09-07

Ver § 3.5, atualizada com os números confirmados. Achado principal: `atendimento-ia` e `confirmacao-agendamento` são baratas ou grátis; `reativacao-clientes` (categoria marketing) é o único ponto de atenção real de orçamento, e segue como tarefa obrigatória de conta-antes-de-enviar na change 4.

### 5.8 Confirmar a coexistência do número *(bloqueante)* ✅ FEITO em 2026-09-07

Ver § 3.3, atualizada. **Confirmado: existe, é oficial, e é exatamente o que Matheus descreveu** — número continua no app, mensagens espelhadas nos dois sentidos, `handover` continua sendo responsabilidade do produto. A escolha de provedor não muda mais nada aqui — o que resta é a § 5.9, sobre **quem** opera a coexistência.

### 5.9 Tech Provider direto ou BSP terceiro? — DECIDIDO em 2026-09-07: **BSP com mensalidade fixa**

**Achado novo, não previsto quando a D2 foi decidida** — surgiu da pesquisa de 5.8: a documentação oficial da Meta exige que alguém tenha status de **Meta Tech Provider** (registro direto, sem linha de crédito) ou **Solution Partner** (com linha de crédito, processo mais longo), ou que se use um **BSP** (Business Solution Provider) já registrado como tal, para ativar a coexistência via Embedded Signup.

Apresentadas as três rotas com pesquisa de mercado (Tech Provider direto: verificação de negócio + App Review com vídeo, prazo fora do controle da Blade; BSP com markup por mensagem: sem custo fixo, mas cresce com volume; BSP com mensalidade fixa: onboarding mais rápido, custo previsível), **Matheus escolheu BSP com mensalidade fixa** — o exemplo de mercado citado na pesquisa foi o modelo do 360dialog (assinatura mensal fixa por número, sem markup em cima da tarifa-base da Meta), mas **o BSP específico ainda não foi escolhido** e o valor exato da mensalidade não foi confirmado.

**Consequências desta decisão para a change 1:**
- `packages/whatsapp` fala com a API do BSP escolhido, não diretamente com a Graph API da Meta. A interface `WhatsAppProvider` não muda; o nome do adapter concreto muda de `MetaCloudAdapter` para algo como `<NomeDoBsp>Adapter` — **não crave o nome antes de escolher o BSP** (tarefa a seguir).
- Onboarding do barbeiro passa pelo fluxo de Embedded Signup **do BSP**, não direto na Meta — o runbook (§ 6, grupo 11) documenta o fluxo do BSP escolhido.
- **Novo custo recorrente no D4**, ainda sem valor confirmado. Precisa ser cotado antes da change 1 fechar o proposal.

**Tarefa que falta antes de escrever `packages/whatsapp` (§ 5.10 abaixo cobre o provisionamento; esta é a escolha comercial):** cotar pelo menos 2-3 BSPs brasileiros ou com suporte a BRL que ofereçam mensalidade fixa sem markup (360dialog é o candidato natural pela pesquisa, mas confirme condição atual e concorrentes equivalentes antes de comprometer). **Isto é tarefa do Matheus** (é decisão comercial e vai envolver cadastro/contrato), não do agente de implementação — o agente só integra depois que o BSP estiver escolhido e a credencial existir.

### 5.10 Provisionamento via BSP *(operacional, Matheus)*

Com a decisão da § 5.9 (BSP com mensalidade fixa): escolher o BSP, cadastrar a conta da Blade, contratar, e conduzir o Embedded Signup do número da barbearia com consentimento de sincronização de histórico (180 dias). As credenciais que `packages/whatsapp` vai precisar variam por BSP — nomes finais só depois da escolha, mas o formato geral é equivalente a: identificador do canal/número, token de API, segredo para verificar webhook. Corre em paralelo com a change 1 — o adapter pode ser desenvolvido e testado em modo dry-run antes das credenciais existirem.

---

## 6. Change 1 — `add-whatsapp-canal`

> **Fundação. Tudo depende dela.** Não pule para a IA sem esta pronta e verificada.

### Capability
`whatsapp-canal` (nova; já listada como candidata em `openspec/specs/README.md`).

### Problema
O produto não tem canal de mensagem. Hoje ele só é operável pelo painel, e a tese central do negócio depende de atender o zap.

### Respostas já registradas (2026-09-07) — não reabra

| Pergunta | Resposta |
|---|---|
| Número por barbearia ou compartilhado? | **O número que a barbearia já usa**, um por barbearia. `phone_number_id` da Meta é a chave de roteamento para o tenant. |
| O barbeiro responde pelo painel? | **Não precisa — pode continuar respondendo pelo WhatsApp Business App dele.** Coexistência confirmada em § 3.3 / § 5.8: número fica no celular, mensagens espelhadas nos dois sentidos. A caixa de entrada no painel é **desejável, não obrigatória**, condicionado à § 5.9 (Tech Provider/BSP) se resolver a favor da coexistência — o que é o caminho esperado. |
| Exclusão LGPD apaga as mensagens? | **Não apaga: anonimiza.** Telefone → `NULL`, vínculo com o cliente cai, conteúdo operacional fica. Mesmo padrão de `clients.phone`. |

### Ponto que deixou de ser problema

A versão anterior deste plano trazia como bloqueante "como o barbeiro fica sabendo que chegou mensagem, sem o app do WhatsApp". **Isso não se aplica mais**: com a coexistência confirmada, o barbeiro continua com o WhatsApp Business App funcionando normalmente, push incluído, exatamente como hoje. Só reabra este ponto se a § 5.9 concluir, por algum motivo de custo ou prazo, que a coexistência não vai ser ativada — nesse caso, volte a tratá-lo como bloqueante nos moldes da versão anterior (arquivo de histórico do plano, se precisar consultar).

### Fronteira de escopo
- **Dentro:** interface `WhatsAppProvider`; `MetaCloudAdapter` (ou adapter do BSP escolhido em § 5.9); webhook com verificação de assinatura; persistência de conversas e mensagens (incluindo as que o barbeiro manda pelo app, espelhadas via webhook); deduplicação; enfileiramento; envio de texto e de template; controle da janela de 24h; opt-out; **estado de posse da conversa (`handover`)**, cobrindo tanto ação no painel quanto mensagem do barbeiro vinda do app; **anonimização das mensagens na exclusão LGPD**.
- **Desejável, não obrigatório neste recorte:** UI de caixa de entrada para responder pelo painel — o barbeiro já tem onde responder (o app). Pode entrar como change separada depois, se fizer sentido de produto (ex.: funcionário sem WhatsApp cadastrado no celular).
- **Fora:** qualquer IA (change 2); qualquer envio automático agendado (changes 3 e 4).

> **Nota de arquiteto:** a confirmação da coexistência **encolheu** esta change de volta a um tamanho razoável — provedor, webhook, persistência, `handover`, envio. Não é mais necessário cindir em duas changes como a versão anterior deste plano recomendava. Se a § 5.9 concluir pelo caminho sem coexistência (raro, dado o que foi confirmado), reavalie o escopo usando a nota de divisão que ficou registrada no histórico do plano.

### Espinha arquitetural (pré-decidida — não reabra)

```
packages/whatsapp/            ← pacote NOVO
  src/provider.ts             interface WhatsAppProvider
  src/<bsp-escolhido>/adapter.ts     adapter concreto — nome definido só após § 5.10
                                      (BSP com mensalidade fixa; NÃO fala direto com a
                                      Graph API da Meta — fala com a API do BSP escolhido)
  src/<bsp-escolhido>/signature.ts   verificação HMAC sobre corpo cru (mecanismo exato
                                      depende do BSP — confirmar na documentação dele,
                                      não assumir que é igual ao da Meta direta)
  src/<bsp-escolhido>/normalize.ts   payload do BSP → evento interno normalizado
  src/dry-run.ts               adapter que loga em vez de enviar (dev sem credencial)

packages/db/src/schema/
  whatsapp-conversations.ts   barbershop_id · client_id NULLABLE · phone · wa_phone_number_id
                              last_inbound_at · handover ('bot'|'humano') · opted_out_at
  whatsapp-messages.ts        barbershop_id · conversation_id · wamid ÚNICO · direction
                              type · body · status · timestamps

apps/web/
  app/api/webhooks/whatsapp/route.ts   GET (challenge) + POST (assinatura → persiste → enfileira → 200)
  app/conversas/page.tsx               lista de conversas (histórico, leitura — não é caixa de entrada completa)
  app/api/conversations/**             leitura do histórico

apps/worker/src/jobs/process-inbound.ts   consumidor (nesta change só registra; a IA entra na change 2)
```

> A UI de `/conversas` nesta change é **de leitura** (o dono/funcionário vê o que o bot conversou, para contexto e auditoria) — não é onde o barbeiro responde no dia a dia, porque ele responde pelo próprio app (§ 3.3). Se um dia a Blade quiser resposta pelo painel (ex.: funcionário sem WhatsApp cadastrado), isso é change futura.

Regras que a spec precisa fixar como requisito verificável:

- Nenhum código fora de `packages/whatsapp` importa nada específico da Meta (ADR-0004, consequência 1).
- Toda tabela nova tem `barbershop_id` e é acessada por repositório escopado (ADR-0007).
- `wamid` com restrição de unicidade — deduplicação garantida pelo **banco**, como o anti-double-booking da Fase 2, não por lógica de aplicação.
- **`client_id` é nullable**: quem manda mensagem pode não estar no CRM. A conversa existe mesmo assim, identificada pelo telefone. Cadastrar depois é outro fluxo — não bloqueie o registro por falta de cadastro.
- **`handover`** define quem é o dono da conversa e precisa mudar para "humano" tanto por ação explícita **quanto** ao detectar, no webhook, uma mensagem saindo do número do negócio que não foi originada pelo nosso próprio envio (ou seja: o barbeiro respondeu pelo app). Enquanto `handover = humano`, o bot não responde àquela conversa.
- Nenhum envio de texto livre acontece fora da janela de 24h — a checagem é no `WhatsAppProvider`, não só na UI (a UI nem é obrigatória nesta change).
- Log estruturado com `tenant_id`; telefone mascarado (`***1234`); **conteúdo de mensagem nunca em log**.

### Grupos de tarefa sugeridos para o `tasks.md`

| # | Grupo | Evidência exigida |
|---|---|---|
| 0 | Pacote `packages/whatsapp` + interface + adapter dry-run | Pacote compila; teste unitário do dry-run |
| 1 | Schema + migração + repositórios escopados | Migração aplicada em Postgres real; **teste de isolamento de tenant** no padrão dos `*.isolation.test.ts` |
| 2 | Verificação de assinatura | Teste com payload e assinatura conhecidos; **e caso negativo** (assinatura errada → 401) |
| 3 | Rota do webhook (GET + POST) | `curl` real: challenge em texto puro; POST assinado persiste e devolve 200; não assinado devolve 401; duplicado não cria segunda linha |
| 4 | Normalização + resolução de tenant e cliente | Payload real da Meta; caso do nono dígito coberto; **caso do remetente não cadastrado** cria conversa mesmo assim |
| 5 | `MetaCloudAdapter` — envio de texto e de template | Com credencial: envio real para número de teste (via coexistência), conferido no **aparelho do barbeiro**, mensagem aparecendo no app dele. Sem credencial: dry-run + teste de contrato do corpo montado. **Diga qual dos dois foi feito.** |
| 6 | Janela de 24h + opt-out | Fora da janela, texto livre é recusado antes de sair; `PARE`/`SAIR` marca opt-out e interrompe envios |
| 7 | Enfileiramento + job consumidor | Boot real do worker; fila visível em `pgboss.queue`; **teste de duas mensagens em sequência não gerando dois processamentos** |
| 8 | Detecção de resposta humana via app + `handover` | Teste real: responder pelo WhatsApp Business App do celular de teste, confirmar que a mensagem chega pelo webhook e que `handover` muda para humano; bot para de responder até devolução |
| 9 | Tela `/conversas` — leitura | Fluxo real no navegador, escopado por papel (`dono`/`funcionario`); é histórico, não caixa de entrada — deixe isso explícito na spec |
| 10 | Anonimização LGPD das mensagens | Excluir cliente → telefone `NULL` e vínculo removido nas conversas; conteúdo preservado; **delta na spec de `crm-clientes`** |
| 11 | Runbook de onboarding reescrito | `docs/operations/onboarding-produto.md` cobrindo o fluxo de Embedded Signup com coexistência (via caminho decidido em § 5.9), incluindo consentimento de sincronização de histórico |
| 12 | Fechamento | Spec permanente criada; ADRs atualizados; `CHANGELOG.md`; change arquivada |

---

## 7. Change 2 — `add-atendimento-ia`

> É aqui que a tese do negócio passa a existir.

### Capability
`atendimento-ia`. Depende inteiramente da change 1.

### Espinha arquitetural

O loop roda **no worker**, nunca no webhook (§ 4.5). `packages/ai` deixa de ser esqueleto:

```
packages/ai/src/
  client.ts        já existe — resolveAiConfig()
  prompts/         system prompt versionado (ADR-0005 exige prompts versionados no repo)
  conversation.ts  monta as mensagens a partir do histórico persistido
  loop.ts          toolRunner com as 4 tools da agenda
  escalation.ts    gatilhos de passagem para humano
  tools/index.ts   REESCRITO: betaZodTool, sem espelho manual de JSON Schema
```

### Decisões pré-tomadas

1. **Modelo:** `claude-haiku-4-5`, sem `thinking`, `max_tokens: 1024`. Justificativa no `design.md`.
2. **System prompt sem nada volátil.** Persona da barbearia, catálogo de serviços, regras. Data de hoje, nome do cliente e histórico vão nas mensagens. (Ver § 4.2 — o cache não vai ligar no Haiku, mas a estrutura precisa estar certa.)
3. **Tools são o único caminho de ação.** O modelo nunca "decide" um efeito colateral em texto livre — isso é o ADR-0005 e o ADR-0008.
4. **Escalação para humano** por gatilho explícito: pedido direto do cliente, frustração detectada, N falhas de entendimento, ou qualquer assunto fora do escopo da barbearia. O `automation/lib/engine.mjs` já tem essa regra em preset — leia o formato antes de desenhar.
5. **Registro completo da conversa** e do custo por tenant (`usage` de cada chamada). O ADR-0005 exige custo monitorado por tenant desde a v1, e a Fase 3 já provou que métrica não instrumentada na hora não volta depois.

### O que a copy exige (§ 13.9 do guia — normativo)

A voz é **a barbearia falando com o cliente dela**, não a Blade. Informal, direto, no máximo um emoji. Nunca "Olá, tudo bem?" nem "Prezado cliente". Nunca se identifica como robô, mas **nunca finge ser uma pessoa específica** se perguntado direto. Sempre oferece horários concretos e reais — nunca "qual seu melhor horário?". Nunca cita valor fora do cardápio configurado. Ao sair do script: passa para o humano sem drama.

Isso não é decoração: **vira requisito verificável na spec**, com cenários GIVEN/WHEN/THEN.

### Portão de qualidade *(critério de saída, decisão do Matheus)*

Monte uma bateria de conversas reais em PT-BR — no mínimo: agendar do zero, remarcar, cancelar, perguntar preço, perguntar horário de funcionamento, mensagem ambígua, cliente irritado, assunto fora do escopo, tentativa de agendar horário ocupado, tentativa de agendar no passado. Rode contra o `claude-haiku-4-5`.

**Se reprovar, a troca é `AI_MODEL=claude-sonnet-5` no `.env`** — sem mudança de código. Mas registre a reprovação e leve ao Matheus, porque triplica o custo por mensagem e encosta no teto do D4.

### Riscos a registrar explicitamente

- **Alucinação de horário.** Mitigado por design: horário só sai de `consultar_disponibilidade`. A spec precisa de cenário provando que o bot não inventa horário.
- **Anthropic fora do ar.** O ADR-0005 já prevê degradação: sem IA, cai para atendimento humano com aviso ao barbeiro. Implemente — não deixe como intenção.
- **Loop infinito de tools.** Limite de iterações no runner.
- **Prompt injection pelo cliente final.** O cliente escreve texto arbitrário que entra no contexto. As tools são a defesa (nada acontece sem passar pelo `AgendaService`, que valida tenant), mas o system prompt precisa de instrução de escopo, e isso merece cenário de teste.

---

## 8. Change 3 — `add-confirmacao-agendamento`

### O que muda em relação ao esqueleto
`apps/worker/src/jobs/send-confirmation.ts` já **seleciona** corretamente. Falta enviar. Mas com Meta Cloud API, "enviar" significa **template aprovado** (§ 3.1) — não texto livre.

### Pré-requisito operacional *(Matheus, começar cedo)*
Template de confirmação submetido e **aprovado** pela Meta, categoria *utility*, idioma `pt_BR`, com parâmetros para nome do cliente, dia e horário. O texto passa pelo checklist da § 14 do guia de copy **antes** de ser submetido — template aprovado é caro de mudar.

### Escopo
- Enviar o template na janela de `confirmation_lead_hours` (já configurável por barbearia em `agenda_settings`).
- **Processar a resposta do cliente**: confirmar → `confirmAppointment`; pedir remarcação → entra na conversa da change 2. Ambos passam pelo `AgendaService`.
- Idempotência: nunca confirmar duas vezes o mesmo agendamento, mesmo com reentrega da Meta.
- Registrar o envio, para o relatório mensal poder contá-lo.

### Ligação com `relatorios` — não esqueça
A change `add-relatorios` (Fase 3) deixou explícito que 3 das 4 métricas comerciais dependiam estruturalmente da Fase 5, e entregou a fundação de snapshot sem exibir zero enganoso. **Esta change habilita "no-show evitado".** Ao concluir, avalie se a spec de `relatorios` precisa de delta para passar a exibir a métrica. Se precisar, é delta na change — não edite a spec permanente direto.

---

## 9. Change 4 — `add-reativacao-clientes`

> **A change de maior risco da fase.** Trate como tal.

### Por que é diferente da change 3
Confirmação é transacional e 1:1, para quem já tem horário marcado. Reativação é **envio em lote para gente que não pediu nada** — perto de marketing. Muda tudo: categoria de template, regras de opt-out, custo, e a probabilidade de reclamação do usuário final, que a Meta usa para rebaixar a qualidade do número.

### Pré-requisito operacional *(Matheus)*
Template de reativação aprovado, **categoria marketing**. Regras de opt-out mais rígidas.

### Escopo
- Reaproveitar a seleção que já existe (`getDashboard().clientsToReactivate`, regra de inatividade configurável da Fase 1).
- **Throttling obrigatório.** Não despeje a lista inteira de uma vez. Escalonar no tempo.
- **Opt-out respeitado sem exceção** — inclusive opt-out registrado na change 1.
- Registrar envio e resultado, para a métrica de "cliente reativado" no relatório.

### Autorização registrada (2026-09-07)

Matheus autorizou o envio de reativação, caracterizando-o como "só uma mensagem pro cliente perguntando se ele vai voltar pra barbearia". A autorização vale. **As três ressalvas abaixo não foram dispensadas** e continuam sendo requisito — registre-as no `exploration.md` como Risco, não como observação:

1. **A Meta classifica por intenção, não por tamanho.** Uma mensagem curta e simpática enviada para uma lista de clientes inativos é template de **categoria marketing**. Isso significa aprovação mais rigorosa, custo diferente do de utility, e contabilização na qualidade do número.
2. **Opt-out não é opcional** em marketing — nem para a Meta, nem para a LGPD.
3. **Base legal precisa de nome.** "Não muda nada de mais" não é base legal. O cliente tem relação prévia com a barbearia, então há argumento de legítimo interesse — mas isso precisa estar **escrito** no `design.md`, com o opt-out como salvaguarda, para que exista resposta caso alguém pergunte. Se a dúvida for jurídica de verdade, é consulta a advogado, não decisão de agente.

### Grupo de tarefa que não pode faltar

Antes de qualquer envio real: rodar a seleção contra a base de um cliente real e **fazer a conta do custo** (nº de inativos × preço do template marketing). Uma barbearia com 400 clientes e 180 inativos é um volume muito diferente do que a intuição sugere. Se estourar a margem, pare e leve ao Matheus.

### Riscos a registrar
- Rebaixamento de qualidade do número por reclamação.
- Custo de marketing multiplicado pelo tamanho da base inativa — faça a conta antes, com a base real de um cliente.
- Percepção de spam pelo cliente final da barbearia, que respinga na barbearia, não na Blade.

---

## 10. Definition of Done — vale para cada uma das 4 changes

Copiado do [workflow.md](../../openspec/workflow.md) e endurecido com o que a Fase 5 acrescenta:

- [ ] Coerência estratégica verificada contra os 3 guias; todo texto exibido passou pelo checklist da § 14 do guia de copy
- [ ] **Todo texto enviado ao cliente final passou pela § 13.9** (voz da barbearia, não da Blade)
- [ ] Todas as tarefas do `tasks.md` concluídas ou canceladas explicitamente, **cada uma com evidência colada**
- [ ] Checklist do avaliador ([04-checklist-avaliador.md](04-checklist-avaliador.md)) aprovado
- [ ] Testes automatizados passando **com Postgres real de pé** (suíte verde sem banco não conta)
- [ ] Fluxo HTTP real verificado via `curl`, com saída colada
- [ ] Boot real do worker verificado quando a change tocar jobs
- [ ] **Teste de isolamento de tenant** para toda tabela nova
- [ ] Nenhum comportamento fora da spec adicionado sem justificativa registrada
- [ ] Deltas aplicados às specs permanentes em `openspec/specs/<capability>/spec.md`
- [ ] Migração reversível ou com mitigação documentada
- [ ] **Nenhum conteúdo de mensagem, telefone completo, token ou segredo em log** — conferido lendo a saída real, não por inspeção de código
- [ ] `.env.example` atualizado com toda variável nova
- [ ] `CHANGELOG.md` atualizado
- [ ] Change arquivada em `openspec/changes/archive/<change-id>/`

---

## 11. Sequência de portões humanos

Cada `▸` é um ponto onde a execução **para** e espera o Matheus.

```
Fase 0  (higiene, ADRs, custo Meta, provisionamento)
        ✅ transição societária commitada (2026-09-07)
        ✅ custo Meta confirmado (§ 3.5 / § 5.7) — atendimento-ia e confirmação são
          baratos/grátis; reativação é o único ponto de atenção, com conta a fazer na change 4
        ✅ coexistência confirmada (§ 3.3 / § 5.8) — número fica no celular, como
          Matheus previu; produto oficial da Meta, não invenção
        ✅ BSP com mensalidade fixa escolhido como caminho (§ 5.9) — falta cotar
          o BSP específico e confirmar valor antes de fechar o proposal da change 1
        ▸ BSP específico escolhido e contratado, credenciais em mãos (§ 5.10)

Change 1  add-whatsapp-canal
        ▸ proposal → Approved
        ▸ tasks → aprovadas
        ▸ antes de ativar a coexistência num número real: consentimento de
          sincronização de histórico decidido (180 dias) e barbeiro avisado do fluxo
        ▸ PR + checklist do avaliador

Change 2  add-atendimento-ia
        ▸ proposal → Approved
        ▸ portão de qualidade: Haiku 4.5 aprovado ou troca para Sonnet 5?
        ▸ PR + checklist

Change 3  add-confirmacao-agendamento
        ▸ template utility aprovado pela Meta (pré-requisito externo)
        ▸ proposal → Approved
        ▸ PR + checklist

Change 4  add-reativacao-clientes
        ▸ template marketing aprovado pela Meta
        ▸ conta do custo feita contra a base real de um cliente
        ▸ proposal → Approved
        ▸ PR + checklist
```

---

## 12. Anti-padrões — o que NÃO fazer nesta fase

1. **Não rode a IA dentro do handler do webhook.** Ver § 4.5. Isso quebra por timeout e reentrega.
2. **Não re-serialize o corpo do webhook antes de verificar a assinatura.** Ver § 4.4.
3. **Não crie caminho de escrita da agenda paralelo ao `AgendaService`.** As tools existem exatamente para isso (ADR-0008).
4. **Não importe nada da `automation/`.** Leia como referência; escreva do zero em `packages/whatsapp`.
5. **Não infle o system prompt para atingir o mínimo de cache.** Ver § 4.2.
6. **Não deduplique mensagem em memória.** Restrição de unicidade no banco.
7. **Não marque tarefa como feita com `pnpm typecheck` verde.** A barra deste repositório é mais alta e está documentada nas 4 changes arquivadas — leia o `tasks.md` de `add-fidelizacao-e-funcionarios` para calibrar o que conta como evidência.
8. **Não edite spec permanente diretamente.** Toda mudança passa por delta numa change.
9. **Não invente número de custo, preço da Meta ou prazo de aprovação de template.** Consulte, cite a fonte e a data — ou marque como Ponto em aberto.
10. **Não mude o texto da landing ou do guia de copy por conta própria**, mesmo notando que a promessa de onboarding ficou desalinhada com o caminho Meta. Reporte ao Matheus.
