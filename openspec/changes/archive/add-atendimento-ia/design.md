# Design: Atendimento por IA (loop de conversa no WhatsApp)

## Context
`add-whatsapp-canal` entregou o canal completo: webhook, persistência de conversas/mensagens,
`handover`, opt-out, janela de 24h e o job `apps/worker/src/jobs/process-inbound.ts`, que hoje
só atualiza estado — nunca responde. `packages/ai` e `packages/core/src/agenda/tools.ts` são
esqueletos escritos na Fase 2, nunca executados em runtime. Esta change liga os três: o job de
inbound passa a acionar um loop de conversa por IA que usa as tools da agenda para agir e
responde pelo `WhatsAppProvider` já existente.

## Goals and Constraints
### Goals
- Ver `proposal.md`.
### Constraints
- Orçamento D4 (custo por tenant monitorado desde o início — ADR-0005).
- Multi-tenancy (D5/ADR-0007) — toda leitura/escrita por `barbershopId` explícito.
- LGPD — mensagens do bot entram no mesmo regime de anonimização já implementado.
- `WhatsAppProvider` abstraído (D2/ADR-0004) — esta change consome, não modifica.
- Loop roda no worker, nunca no webhook (ADR-0011).
- Sem `ANTHROPIC_API_KEY` neste ambiente — toda a implementação precisa ser verificável com o
  SDK da Anthropic mockado por injeção de dependência (ver Decision 1).

## Proposed Architecture
```
apps/worker/src/jobs/process-inbound.ts   (ORQUESTRADOR — já existe, estendido)
  1. (já existia) atualiza last_inbound_at / opt-out / handover-por-app
  2. SE origem = cliente, sem opt-out, handover = bot:
     a. busca histórico (whatsapp-messages), barbearia, serviços, grade (packages/db)
     b. resolve AiClient (real ou dry-run) — packages/ai
     c. roda o turno de conversa (packages/ai/loop.ts) — puro, sem I/O de rede/banco além do
        que o AiClient injetado fizer
     d. aplica o resultado: registra uso (ai_usage_events), atualiza contador de
        "stall"/handover, envia resposta via WhatsAppProvider, persiste a mensagem de saída
  3. Erro do AiClient (rede/rate limit/API) → captura, marca handover=humano, loga sem
     conteúdo, NÃO derruba o job (mensagem do cliente já está persistida — não se perde)

packages/ai/                              (INTELIGÊNCIA DE CONVERSA — sem I/O de banco/canal)
  types.ts            AiClient, ConverseInput/Output, BotToolRuntime, TurnResult
  client.ts           resolveAiConfig (existente) + resolveAiClient(env)
  anthropic-client.ts adapter real — @anthropic-ai/sdk, toolRunner + betaZodTool
  dry-run-client.ts   adapter sem rede — resposta determinística, para dev/verificação sem chave
  prompts/
    system-prompt.ts  buildSystemPrompt(context) — persona, cardápio, horário, regras
    messages.ts        mapHistoryToMessages — histórico persistido → formato de mensagens
  tools/index.ts       getBotTools() + executeTool(barbershopId, name, input)
  loop.ts              runConversationTurn — o turno inteiro, puro dado o AiClient injetado
  escalation.ts        limite de "stall" (falhas de entendimento) e mensagem fixa de devolução

packages/core/src/clients/tools.ts        (NOVO) cadastrarClienteBasicoTool — reaproveita
  createClient de @blademidia/db, mesmo padrão das tools de agenda (ADR-0008 generalizado)

packages/db/
  schema: whatsapp_conversations ganha bot_stall_count; tabela nova ai_usage_events
  repositories: whatsapp-conversations.ts ganha incrementBotStallCount/resetBotStallCount;
    ai-usage.ts (novo) recordUsage/listUsageForBarbershop
```

## Technical Decisions

### Decision 1: SDK da Anthropic sempre atrás de uma interface injetável (`AiClient`)
- Decision: `packages/ai` define `AiClient` (`converse(input): Promise<ConverseOutput>`);
  `anthropic-client.ts` é a única implementação real (usa
  `client.beta.messages.toolRunner` + `betaZodTool`); `dry-run-client.ts` é uma implementação
  sem rede. `resolveAiClient(env)` escolhe uma das duas pela presença de
  `ANTHROPIC_API_KEY` — **mesmo padrão de `resolveWhatsAppProvider`** em `packages/whatsapp`.
- Rationale: sem isto, não haveria como testar o loop nem verificar boot real do worker sem a
  chave — que não existe neste ambiente (ver Open Question herdada do exploration.md). Com a
  interface, todo o loop (prompts, tools, escalação, persistência) é testado e verificado de
  ponta a ponta agora; só a chamada de rede de fato fica pendente.
- Trade-offs: mais um nível de indireção sobre um SDK que já abstrai bem; aceito porque o ganho
  de testabilidade é o mesmo já provado em `packages/whatsapp` (Change 1).
- Consequences: quando `ANTHROPIC_API_KEY` existir, nada no código muda — só o ambiente.

### Decision 2: Tool de escalação é local ao loop, não passa por `executeTool`
- Decision: `escalar_para_humano(motivo)` é definida e tratada dentro de `loop.ts` (callback
  que só seta uma flag no `TurnResult`), não em `packages/core`. As tools de agenda e a de
  cadastro de cliente continuam passando por `executeTool`, que despacha para `AgendaService`/
  `createClient`.
- Rationale: escalação não é uma ação de domínio (não grava nada em `appointments`/`clients`) —
  é um sinal de controle da própria conversa. Colocá-la em `packages/core` obrigaria o core a
  saber sobre `handover`, que é conceito do canal, não da agenda/CRM.
- Trade-offs: duas formas de "tool" no mesmo `tools` array passado ao runner (uma delega a
  domínio, outra só sinaliza) — aceitável, documentado aqui para não confundir quem ler o
  código depois.
- Consequences: nenhuma escrita em banco decorre diretamente da tool de escalação; quem grava
  `handover = humano` é sempre o orquestrador (`process-inbound.ts`), lendo o `TurnResult`.

### Decision 3: Escalação por "N falhas de entendimento" é determinística, não auto-relatada pelo modelo
- Decision: `whatsapp_conversations.bot_stall_count` (novo, `integer default 0`) incrementa
  toda vez que um turno termina **sem nenhuma tool de domínio chamada** (agenda ou cadastro; a
  tool de escalação não conta como tool de domínio) e **sem** o modelo pedir escalação
  explícita; zera sempre que qualquer tool de domínio é chamada — inclusive quando a tool
  recusa por regra de negócio (ex.: horário ocupado), porque isso ainda é o bot agindo
  estruturadamente, não uma falha de entendimento. Ao
  atingir `STALL_THRESHOLD = 2` (proposto no exploration.md), o orquestrador força
  `handover = humano` **independente do texto do modelo**, com uma mensagem fixa de devolução
  (não gerada pelo modelo) que já passou pelo checklist da § 14 do guia de copy: *"acho melhor
  chamar alguém aqui pra te ajudar melhor, só um instante 🙏"*.
- Rationale: "o modelo se autoavalia como confuso" não é verificável nem testável de forma
  determinística (o plano é explícito: "nunca invente requisito"). Um contador persistido e
  incrementado por código é auditável e testável com um `AiClient` mockado, sem precisar do
  modelo real "se comportar direito" para provar o caminho.
- Trade-offs: 2 tentativas pode ser pouco ou muito na prática — é parâmetro de implementação,
  não de produto; ajustável por dado real depois do portão de qualidade (§ 7 do plano).
- Consequences: escalação por frustração/pedido explícito/fora de escopo continua sendo decisão
  do modelo (via `escalar_para_humano`); escalação por "não estar indo a lugar nenhum" é
  garantia de código, não de prompt.

### Decision 4: Registro de conversa reaproveita `whatsapp_messages`; não há tabela nova de transcript
- Decision: a resposta do bot é persistida como mais uma linha de `whatsapp_messages`
  (`direction: "saida"`, `type: "texto"`, `wamid` = o id devolvido pelo envio real ou um id
  sintético determinístico no caminho dry-run), exatamente como uma mensagem enviada pelo
  barbeiro seria. Não existe tabela separada de "transcript bruto do modelo" (texto intermediário,
  argumentos de tool call).
- Rationale: o histórico visível em `/conversas` (Change 1) já é a fonte de verdade do que foi
  dito; o efeito de cada tool call já fica auditável no domínio que ela tocou
  (`appointments.source = "bot"`, cliente criado com `notes` indicando origem — ver Decision 6).
  Guardar um segundo registro do "raciocínio" do modelo seria dado pessoal extra sem uso
  definido, na contramão do princípio de minimização de dados da LGPD.
- Trade-offs: se um dia for preciso depurar por que o bot tomou uma decisão específica, não há
  o "pensamento" salvo — só a mensagem final e a tool chamada (nome + input, em log estruturado
  de curto prazo, nunca no banco). Aceito pela mesma razão de minimização.
- Consequences: nenhuma migração de schema para mensagens; simplifica o escopo desta change
  (mesmo espírito da simplificação das rotas `/api/conversations/**` na Change 1).

### Decision 5: Custo por tenant em tabela própria, não em `whatsapp_messages`
- Decision: nova tabela `ai_usage_events` (`barbershop_id`, `conversation_id`, `model`,
  `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_creation_tokens`, `created_at`),
  uma linha por chamada ao `AiClient` (mesmo que um turno faça várias idas e vindas de tool use
  internamente no `toolRunner` — o runner expõe o uso agregado do turno, então é uma linha por
  turno de conversa, não por chamada HTTP individual ao modelo).
- Rationale: ADR-0005 exige custo monitorado por tenant desde a v1; misturar isso em
  `whatsapp_messages` (que é sobre conteúdo de mensagem, não sobre custo de processamento)
  quebraria a coesão da tabela e obrigaria toda leitura de mensagem a lidar com colunas
  irrelevantes na maior parte dos casos (envio manual futuro, mensagem do barbeiro pelo app).
- Trade-offs: mais uma tabela; aceito pelo baixo custo de manutenção e pelo ganho de clareza.
- Consequences: nenhuma UI de custo nesta change (fora de escopo) — só a captura, para que o
  relatório mensal (`add-relatorios`, já preparado para isso) possa consumir depois.

### Decision 6: Cliente sem cadastro que pede para agendar — tool de cadastro básico
- Decision: nova tool `cadastrar_cliente_basico(nome)` em `packages/core/src/clients/tools.ts`,
  usando o telefone já resolvido da conversa (nunca pedido ao modelo — vem do contexto do
  orquestrador, nunca de um argumento livre do modelo, ver Decision 8) e `createClient` de
  `@blademidia/db`. O system prompt instrui o modelo a chamar esta tool antes de
  `criar_agendamento` quando não houver `clientId` associado à conversa.
- Rationale: sem isso, `criar_agendamento` (que exige `clientId`) nunca funcionaria para quem
  escreve pela primeira vez — o caso de uso mais comum do produto. É a menor extensão de escopo
  possível, reaproveitando 100% do repositório de CRM já aprovado em `add-crm-clientes`.
- Trade-offs: nenhuma validação adicional de identidade (qualquer pessoa que escreva pelo
  número pode "virar" um cliente com o nome que disser) — mesmo risco que já existe hoje no
  cadastro manual pelo painel; não é amplificado por esta change.
- Consequences: `linkClientToConversation` (já existente, Change 1) é chamado logo após o
  cadastro, para a conversa passar a apontar para o cliente novo.

### Decision 7: Tools recebem `barbershopId` do orquestrador, nunca de um argumento do modelo
- Decision: `executeTool(barbershopId, name, input)` — `barbershopId` é sempre passado pelo
  código do worker (a partir da conversa que dispara o turno), nunca lido de um campo dentro do
  `input` do tool call, mesmo que o modelo tente incluir um. O schema Zod de cada tool não tem
  (e não pode ganhar) um campo `barbershopId` ou `tenantId`.
- Rationale: é a defesa estrutural contra prompt injection citada no plano (§ 7, Riscos) — o
  cliente final escreve texto arbitrário que vira contexto do modelo, mas nenhuma tool aceita
  tenant como parâmetro livre, então não há como uma instrução injetada fazer uma tool agir
  fora do tenant da própria conversa.
- Trade-offs: nenhum.
- Consequences: cenário de teste dedicado (tasks.md) tenta smuggling de `barbershopId` no input
  da tool e confirma que é ignorado/rejeitado pelo schema Zod (`z.object` sem essa chave falha
  em `strict()` ou simplesmente ignora o campo extra — a spec exige o comportamento explícito).

### Decision 8: Degradação sem IA é silêncio + handover, sem canal de notificação novo
- Decision: erro do `AiClient` (`RateLimitError`, `APIConnectionError`, `APIError` — classes
  tipadas do SDK, nunca comparação de string) → captura no orquestrador, `markHandover(...,
  "humano")`, log estruturado do tipo de erro (sem conteúdo de mensagem), e o job termina sem
  lançar (a mensagem do cliente já está persistida desde o webhook — Change 1 — então nada se
  perde). Nenhum canal de notificação novo é criado: o barbeiro já vê a mensagem do cliente no
  próprio WhatsApp Business App (coexistência), exatamente como veria qualquer mensagem que o
  bot não tivesse respondido.
- Rationale: registrado como Inferida no exploration.md — o ADR-0005 pede "aviso ao barbeiro"
  sem especificar canal, e este produto não tem push/e-mail fora do WhatsApp dele mesmo nesta
  fase.
- Trade-offs: se o barbeiro não olhar o app a tempo, não há alerta ativo adicional — aceitável
  para o MVP; melhoria de UX é change futura se necessário.
- Consequences: cenário de teste força o `AiClient` a lançar cada uma das 3 classes de erro e
  confirma o mesmo resultado (handover humano, sem exceção não tratada, sem chamada ao
  `WhatsAppProvider`).

### Decision 9: Limite de iterações do tool runner
- Decision: `maxToolIterations = 6` (proposto no exploration.md), configurado no
  `anthropic-client.ts` ao montar o `toolRunner`. Se o limite for atingido sem resposta final,
  o turno é tratado como "stall" (Decision 3) — incrementa o contador, não força handover
  imediato na primeira vez.
- Rationale: cobre o caminho feliz mais longo (consultar → cadastrar cliente → criar
  agendamento = 3 chamadas) com folga para idas e vindas de esclarecimento, sem permitir loop
  descontrolado de custo.
- Trade-offs: nenhum relevante.
- Consequences: nenhuma.

### Decision 10: `packages/ai` não depende de `@blademidia/whatsapp`
- Decision: `packages/ai` recebe o histórico da conversa como dado já carregado (array), não
  busca no banco; e devolve a resposta como texto, não envia nada. Buscar dados e enviar a
  resposta é responsabilidade do orquestrador (`apps/worker`), que já tem as duas dependências.
- Rationale: mantém `packages/ai` testável sem mock de banco nem de canal — só o `AiClient` e
  dados simples de entrada. Fica mais parecido com uma função pura (input determinístico dado o
  `AiClient` injetado) do que o esqueleto original de arquivo por arquivo do plano sugeria
  ("`conversation.ts` monta as mensagens a partir do histórico persistido" — aqui "persistido" é
  passado como parâmetro pelo chamador, não buscado internamente). Divergência pequena e
  documentada, no mesmo espírito da simplificação das rotas de API na Change 1.
- Trade-offs: nenhum — só reduz a superfície de dependência do pacote.
- Consequences: `packages/ai` ganha dependência de `@blademidia/db` só para gravar
  `ai_usage_events` (Decision 5) — avaliado e aceito porque é a mesma tabela que o próprio
  pacote produz o dado para popular; o orquestrador ainda decide *quando* chamar.

### Decision 11: Schemas das tools usam `zod/v4`, não a raiz `zod` (achado durante a implementação)
- Decision: `packages/core/src/agenda/tools.ts` e `packages/core/src/clients/tools.ts` importam
  `{ z } from "zod/v4"` em vez de `{ z } from "zod"`. `anthropic-client.ts` tipa o cast de
  schema como `z.ZodType` do mesmo `zod/v4`.
- Rationale (achado, não estava no plano): `betaZodTool` do `@anthropic-ai/sdk` 0.125.0 espera
  um `ZodType` cujos internos são os de `zod/v4` (`_zod.def`), não os de `zod` v3 clássico
  (`_def`) — apesar de o pacote instalado ser um único `zod@3.25.76`, essa versão empacota as
  duas APIs lado a lado (`.` = v3 clássico; `./v4` = v4) exatamente para permitir essa migração
  gradual. Passar um schema v3 clássico para `betaZodTool` falha em tempo de compilação (tipos
  incompatíveis) e falharia em runtime (conversão para JSON Schema espera o formato v4). A
  correção é trocar o import só nos DOIS arquivos que definem schemas consumidos por
  `betaZodTool` — o resto do monorepo (`apps/web`, outros usos de `zod` em `packages/core`)
  continua em v3 clássico sem necessidade de mudança, já que `.parse()`/`.describe()`/
  `.optional()`/`z.infer` se comportam de forma equivalente nas duas APIs para os casos usados
  aqui.
- Trade-offs: duas "famílias" de zod convivendo no mesmo monorepo (v3 clássico na maioria do
  código, v4 nos schemas de tool) — documentado aqui e nos comentários dos dois arquivos para
  não confundir quem for mexer depois.
- Consequences: `pnpm --filter @blademidia/core typecheck` e a suíte de testes de `core`
  (47/47) e `ai` (42/42) passam com a migração; nenhum outro arquivo precisou mudar.

## Alternatives Considered
### Alternative 1: Detectar "falha de entendimento" analisando o texto do modelo
- Description: heurística de palavras-chave ("não entendi", "?", etc.) no texto de resposta.
- Why not chosen: frágil, não determinístico, contraria a regra "nunca invente requisito" — um
  contador de tool-não-executada é objetivo e testável.

### Alternative 2: Tabela de transcript bruto do modelo
- Description: gravar cada mensagem intermediária e argumento de tool call.
- Why not chosen: dado pessoal extra sem uso definido (ver Decision 4); complexidade sem
  benefício comprovado nesta fase.

## Affected Components
| Component | Change | Reason |
|---|---|---|
| `packages/ai` | Reescrita quase total | Deixa de ser esqueleto |
| `packages/core/src/agenda/tools.ts` | Tipo `BotTool<I>` extraído (alias de `AgendaTool<I>`) | Generalizar para tools não-agenda sem quebrar import existente |
| `packages/core/src/clients/tools.ts` | Novo | Tool de cadastro básico |
| `packages/db/src/schema/whatsapp-conversations.ts` | + `bot_stall_count` | Decision 3 |
| `packages/db/src/schema/ai-usage-events.ts` | Novo | Decision 5 |
| `packages/db/src/repositories/whatsapp-conversations.ts` | + increment/reset stall | Decision 3 |
| `packages/db/src/repositories/ai-usage.ts` | Novo | Decision 5 |
| `apps/worker/src/jobs/process-inbound.ts` | Estendido | Orquestração do turno |
| `docs/architecture/decisions/ADR-0005-ia-claude-api.md` | Seção de correção datada | § 4.1/4.2 do plano |

## Main Flows
### Flow 1: Mensagem do cliente, dentro do escopo, resolve com tool
1. Webhook (Change 1) persiste e enfileira `process-inbound` com `singletonKey = conversationId`.
2. Worker: `origin = cliente`, sem opt-out → atualiza `last_inbound_at` (já existia).
3. Lê conversa fresca: `handover = bot` → segue.
4. Busca histórico (`listMessages`), barbearia (`getBarbershop`), serviços (`listServices`),
   grade (`listWorkSchedules`).
5. `buildSystemPrompt` monta o prompt (persona, cardápio, regras, sem nada volátil).
6. `mapHistoryToMessages` + a mensagem nova → `messages`.
7. `resolveAiClient(env)` → real ou dry-run.
8. `runConversationTurn` → o `toolRunner` chama `consultar_disponibilidade`,
   depois `criar_agendamento` (ambas via `executeTool`, `barbershopId` do orquestrador) →
   resposta final de texto.
9. Nenhuma tool de escalação chamada, tool de domínio teve sucesso → `resetBotStallCount`.
10. `recordUsage` grava tokens do turno.
11. `WhatsAppProvider.sendText` envia a resposta (dentro da janela, que acabou de abrir).
12. `createMessage` persiste a saída (`direction: saida`).

### Flow 2: Escalação explícita (frustração/pedido/fora de escopo)
1-7. Iguais ao Flow 1.
8. Modelo chama `escalar_para_humano({ motivo })` em vez de resolver.
9. `TurnResult.escalate = { requested: true, reason }`.
10. Orquestrador: `markHandover(humano)`, envia a mensagem fixa de devolução (não o texto do
    modelo, se houver — a mensagem de handoff é sempre a mesma, aprovada pelo checklist), grava
    log estruturado com o motivo (sem conteúdo do cliente).

### Flow 3: Stall — N turnos sem resolver
1-7. Iguais.
8. Turno termina sem tool de domínio executada e sem escalação explícita.
9. `incrementBotStallCount` → se atingir `STALL_THRESHOLD`, força handover humano + mensagem
   fixa de devolução, IGNORANDO o texto do modelo para esse turno.
10. Abaixo do limite: envia a resposta do modelo normalmente (ex.: pedido de esclarecimento).

## Error Flows
### Error Flow 1: Anthropic indisponível
1. `AiClient.converse` lança `Anthropic.APIConnectionError` (ou `RateLimitError`/`APIError`).
2. Orquestrador captura pela classe (nunca por string), `markHandover(humano)`, loga
   `{ tenant_id, conversation_id, error_type }` sem corpo de mensagem.
3. Job termina sem exceção não tratada; nenhuma chamada ao `WhatsAppProvider`.

### Error Flow 2: Limite de iterações do tool runner atingido
1. `runConversationTurn` retorna sem resposta final de texto após `maxToolIterations`.
2. Tratado como Flow 3 (stall) — não é erro fatal, é sinal de "não convergiu".

### Error Flow 3: Tool de domínio recusa (ex.: horário ocupado, no passado)
1. `AgendaService` devolve erro estruturado (já validado nas Fases 2/4).
2. `executeTool` propaga o resultado (não uma exceção) ao modelo, que tenta nova ação ou
   explica ao cliente — comportamento normal do loop, não é falha de sistema.

### Error Flow 4: `WhatsAppProvider.sendText` recusa (janela fechada/opt-out)
1. Teoricamente não deveria acontecer (o turno só roda porque uma mensagem do cliente acabou de
   abrir a janela), mas o envio ainda checa — defesa em profundidade.
2. Se recusado, loga o motivo (`janela_fechada`/`opt_out`) e não tenta de novo nesta execução;
   a mensagem do bot não é persistida (nunca foi enviada).

## API / Contract Design
Nenhum endpoint HTTP novo — tudo roda no worker.

## Data Model and Persistence
```sql
ALTER TABLE whatsapp_conversations
  ADD COLUMN bot_stall_count integer NOT NULL DEFAULT 0;

CREATE TABLE ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES barbershops(id),
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id),
  model text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  cache_creation_tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_events_barbershop_idx ON ai_usage_events (barbershop_id, created_at);
```
Toda leitura/escrita das duas por repositório escopado por `barbershopId` (ADR-0007).

## Authentication and Authorization
Sem mudança — o worker já roda fora do contexto de sessão HTTP; a autorização relevante é o
escopo por `barbershopId`, garantido pelas Decisions 3, 5 e 7.

## Security and Privacy
- Nenhum conteúdo de mensagem em log (Decision 8, Error Flow 1).
- `ANTHROPIC_API_KEY` nunca logada; erro tratado por classe, não por corpo de resposta.
- Tools nunca recebem tenant como argumento livre (Decision 7) — defesa contra prompt injection.
- `ai_usage_events` não guarda conteúdo, só contagem de tokens — não é dado pessoal sensível.

## Observability
### Logs
- Por turno: `tenant_id`, `conversation_id`, resultado (`respondido` | `escalado` | `stall` |
  `erro_ia`), nunca corpo de mensagem.
### Metrics
- `ai_usage_events` é a métrica de custo por tenant (consumível pelo relatório mensal depois).
### Alerts
- Fora de escopo nesta change (sem canal de alerta novo — Decision 8).

## Testing Strategy
- Unit: `loop.ts` (com `AiClient` fake controlado por teste — respostas roteirizadas),
  `escalation.ts` (contador puro), `prompts/*.ts` (conteúdo do prompt, sem chamada de rede),
  tool de cadastro básico, extração de `BotTool`.
- Integration: `ai-usage` e `whatsapp-conversations` (stall count) contra Postgres real,
  isolamento de tenant.
- Contract: `anthropic-client.ts` contra um fake HTTP do SDK — SÓ SE viável sem
  `ANTHROPIC_API_KEY` (o SDK exige uma chave para instanciar; usar uma chave fake local e
  interceptar a chamada de rede, ou testar só a montagem do `toolRunner`/tools sem
  disparar rede de fato — decidir na implementação e registrar o que foi possível).
- E2E: boot real do worker + `curl` real no webhook (Change 1) + `AiClient` dry-run → mensagem
  de saída real aparece na tela `/conversas` e (se end-to-end de canal) no dry-run log.
- Manual: nenhum possível sem credencial real (bateria de qualidade do § 7 do plano —
  registrada como pendente).

## Migration Strategy
Duas migrações aditivas (`ALTER TABLE ... ADD COLUMN DEFAULT`, `CREATE TABLE`) — sem dado
existente para migrar, sem risco de lock longo (tabelas pequenas nesta fase do produto).

## Rollback Plan
Reverter para a versão anterior do worker (sem chamar o loop) é seguro: as colunas/tabela
novas ficam órfãs mas inofensivas. Não há necessidade de `DOWN` migration além do padrão já
usado no projeto (migrações não têm rollback automático — mitigação: aditivas apenas).

## Compatibility
Nenhuma mudança de contrato observável em `whatsapp-canal` — o job de inbound continua
respondendo 200 e persistindo do mesmo jeito; só passa a, adicionalmente, gerar uma mensagem de
saída quando aplicável.

## Remaining Risks
| Risk | Impact | Mitigation | Owner/Decision |
|---|---|---|---|
| Bateria de qualidade real não executada nesta sessão | ADR-0005 fica "Aceito, pendente" | Implementação testada com mock; tarefa registrada, bloqueada por credencial | Matheus (mesma natureza do BSP) |
| `STALL_THRESHOLD = 2` pode não ser o ideal | Escalação cedo/tarde demais | Ajustável por configuração após dado real | Matheus, pós-portão de qualidade |
| SDK real pode divergir do comportamento do `toolRunner` mockado nos testes | Retrabalho pequeno ao ligar a chave real | Interface `AiClient` isola a diferença ao arquivo `anthropic-client.ts` | — |

## Open Questions
- Nenhuma pergunta bloqueante de negócio. Pendência técnica única: `ANTHROPIC_API_KEY` para o
  portão de qualidade (ver proposal.md, Open Questions).
