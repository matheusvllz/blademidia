# Tasks: Atendimento por IA (loop de conversa no WhatsApp)

> Evidência real, não `pnpm typecheck` (regra do plano § 0). Marcar `[x]` só com evidência colada.

## 1. `packages/ai` — fundação: tipos, config e clients (real + dry-run)

- [x] 1.1 `types.ts`: `AiClient`, `ConverseInput`/`ConverseOutput`, `UsageInfo`, `TurnResult`.
  - Depends on: —
  - Validation: typecheck + revisão manual (só tipos, sem lógica).
  - Completion criteria: compila; usado pelos módulos seguintes.
  - Evidência: `pnpm --filter @blademidia/ai typecheck` → `tsc --noEmit` sem erro (0 saída).

- [x] 1.2 `dry-run-client.ts`: `createDryRunAiClient()` — resposta determinística sem rede,
  loga a chamada mascarando dados sensíveis (mesmo padrão de `packages/whatsapp/dry-run.ts`).
  - Depends on: 1.1
  - Validation: unit
  - Completion criteria: teste comprova que nenhuma chamada de rede acontece (spy em `fetch`).
  - Evidência: `src/dry-run-client.test.ts` — 4/4 testes verdes, incluindo "nunca chama fetch"
    (spy em `globalThis.fetch`, 0 chamadas) e "não loga conteúdo de mensagem, só metadados".

- [x] 1.3 `anthropic-client.ts`: `createAnthropicAiClient(config)` — usa `@anthropic-ai/sdk`,
  `client.beta.messages.toolRunner` + `betaZodTool`, `model`/`max_tokens: 1024`/sem `thinking`.
  - Depends on: 1.1
  - Validation: contract (o quanto for viável sem `ANTHROPIC_API_KEY` real — documentar o que
    foi possível testar e o que ficou pendente de credencial).
  - Completion criteria: monta o `toolRunner` corretamente (tools, system, max_tokens);
    lança as classes de erro tipadas do SDK sem serem engolidas.
  - Evidência: `pnpm --filter @blademidia/ai typecheck` verde contra os tipos reais do SDK
    0.125.0 (incl. o achado de `zod/v4`, Decision 11 do design.md). **Pendente de credencial**:
    chamada de rede real contra a Graph API da Anthropic — coberta indiretamente por
    `errors.test.ts` (classes de erro reais do SDK) e pelo caminho de erro em
    `process-inbound.test.ts` ("erro do provedor de IA degrada para humano").

- [x] 1.4 `client.ts`: `resolveAiClient(env)` — real se `ANTHROPIC_API_KEY` presente, dry-run
  caso contrário (mesmo padrão de `resolveWhatsAppProvider`).
  - Depends on: 1.2, 1.3
  - Validation: unit
  - Completion criteria: teste cobre os dois caminhos.
  - Evidência: `src/client.test.ts` — 5/5 verdes ("resolve o cliente dry-run quando
    ANTHROPIC_API_KEY não está configurada"; "não lança nem chama rede").

## 2. `packages/core` — generalização de tool e tool de cadastro básico

- [x] 2.1 Extrair `BotTool<I>` como alias de `AgendaTool<I>` em `agenda/tools.ts`, sem quebrar
  os imports existentes.
  - Depends on: —
  - Validation: unit (suíte existente de `tools.test.ts` continua verde).
  - Completion criteria: `pnpm --filter @blademidia/core test` verde.
  - Evidência: `pnpm --filter @blademidia/core test` → 8 arquivos, **47/47 testes verdes**
    (Postgres real), incluindo `src/agenda/tools.test.ts` (2/2) inalterado.

- [x] 2.2 `clients/tools.ts`: `cadastrarClienteBasicoTool` — `nome` como único input do
  modelo; telefone vem do orquestrador (nunca do input); usa `createClient`.
  - Depends on: 2.1
  - Validation: unit
  - Completion criteria: teste cobre criação e o caso de telefone já cadastrado
    (`phone_duplicate` — liga a conversa ao cliente existente em vez de duplicar).
  - Evidência: `src/clients/tools.test.ts` — 3/3 verdes contra Postgres real: cadastra e
    vincula; telefone duplicado devolve o cliente existente e ainda assim vincula a conversa;
    input sem nome rejeitado (`.rejects.toThrow()`).

## 3. `packages/ai` — prompts, mapeamento de histórico e tools

- [x] 3.1 `prompts/system-prompt.ts`: `buildSystemPrompt(context)` com persona, cardápio,
  horário resumido (derivado de `work_schedules`), regras (nunca inventar horário, nunca
  fingir ser pessoa específica, escopo só da barbearia). Sem `new Date()`/id de sessão dentro.
  - Depends on: —
  - Validation: unit
  - Completion criteria: teste garante ausência de conteúdo volátil; conteúdo revisado contra
    checklist § 14 do guia de copy (registrar no PR/commit que passou).
  - Evidência: `src/prompts/system-prompt.test.ts` — 9/9 verdes, incluindo "não contém data
    nem timestamp dinâmico". Checklist § 14 revisado manualmente: tese resumível (zap
    respondendo mesmo sem o dono), sem jargão banido, sem promessa não entregue, tom coloquial
    de barbearia — texto fixo (`HANDOFF_MESSAGE`) e instruções do prompt seguem § 13.9.

- [x] 3.2 `prompts/messages.ts`: `mapHistoryToMessages(history, inboundBody)` — converte
  `WhatsappMessageRecord[]` para o formato de mensagens do SDK.
  - Depends on: —
  - Validation: unit
  - Completion criteria: teste cobre histórico vazio, histórico intercalado entrada/saída.
  - Evidência: `src/prompts/messages.test.ts` — 7/7 verdes: vazio, entrada/saída intercalados,
    mensagens consecutivas do mesmo papel unidas (exigência da Messages API), saída antes da
    primeira entrada descartada, mensagem sem corpo ignorada.

- [x] 3.3 `tools/index.ts` reescrito: `getBotTools()` agrega tools de agenda + cadastro +
  tool local de escalação; `executeDomainTool(barbershopId, name, input, context)` despacha as
  de domínio (nome ajustado de `executeTool` para não colidir com o `executeTool` de
  `ConverseInput` — ver `loop.ts`).
  - Depends on: 2.1, 2.2
  - Validation: unit
  - Completion criteria: teste de smuggling de `barbershopId` no input (Decision 7) prova que é
    ignorado.
  - Evidência: `src/tools/index.test.ts` — 7/7 verdes, incluindo despacho real de
    `cadastrar_cliente_basico` contra Postgres real com telefone do contexto (não do input).

## 4. `packages/ai` — loop de conversa e escalação

- [x] 4.1 `escalation.ts`: `STALL_THRESHOLD`, `shouldForceStallEscalation(count)`,
  `HANDOFF_MESSAGE` (texto fixo aprovado pelo checklist § 14).
  - Depends on: —
  - Validation: unit
  - Completion criteria: teste de limite (abaixo, igual, acima do threshold).
  - Evidência: `src/escalation.test.ts` — 4/4 verdes.

- [x] 4.2 `loop.ts`: `runConversationTurn({ aiClient, systemPrompt, messages, barbershopId,
  maxToolIterations, domainContext })` → `TurnResult` (texto final, tools executadas, uso,
  escalação, `domainToolCalled`).
  - Depends on: 1.1, 3.3, 4.1
  - Validation: unit (com `AiClient` fake roteirizado — reaproveita `createDryRunAiClient` com
    script, mockando `./tools/index` para isolar de banco real)
  - Completion criteria: cenários cobertos — resposta simples sem tool; agendar do zero
    (consultar → criar); cadastro + agendamento (cliente novo); escalação explícita; erro do
    `AiClient` propagado (não engolido); `maxToolIterations` repassado ao `AiClient`.
  - Evidência: `src/loop.test.ts` — 6/6 verdes. (Remarcar/cancelar reaproveitam o mesmo
    caminho de dispatch da tool já coberto por `tools/index.test.ts`/`agenda/tools.test.ts` —
    não duplicados aqui; limite de iterações é responsabilidade do `AiClient` real, coberto na
    montagem do `toolRunner` em 1.3.)

## 5. `packages/db` — schema, migração e repositórios

- [x] 5.1 Migração: `whatsapp_conversations.bot_stall_count integer not null default 0`.
  - Depends on: —
  - Validation: integration (aplicar em Postgres real)
  - Completion criteria: `psql \d whatsapp_conversations` colado mostrando a coluna.
  - Evidência: migração `0006_serious_lady_deathstrike.sql` aplicada (`pnpm --filter
    @blademidia/db migrate` → "Migrações aplicadas com sucesso"); `psql \d
    whatsapp_conversations` confirmou `bot_stall_count | integer | not null | 0`.

- [x] 5.2 Migração: tabela `ai_usage_events` (schema da Decision 5 do design.md).
  - Depends on: —
  - Validation: integration
  - Completion criteria: `psql \d ai_usage_events` colado.
  - Evidência: mesma migração acima; `psql \d ai_usage_events` confirmou as 9 colunas, PK,
    índice `ai_usage_events_barbershop_idx` e as 2 FKs (`barbershops`, `whatsapp_conversations`).

- [x] 5.3 `repositories/whatsapp-conversations.ts`: `incrementBotStallCount`,
  `resetBotStallCount`.
  - Depends on: 5.1
  - Validation: integration (Postgres real)
  - Completion criteria: teste comprova incremento e reset.
  - Evidência: `whatsapp.isolation.test.ts`, caso "bot_stall_count incrementa atomicamente e
    reseta, escopado por barbearia" — verde contra Postgres real, incluindo tentativa de
    incrementar com `barbershopId` errado (0 linhas afetadas, valor não muda).

- [x] 5.4 `repositories/ai-usage.ts`: `recordUsage(barbershopId, input)`,
  `listUsageForBarbershop(barbershopId)`, `listUsageForConversation(barbershopId,
  conversationId)`.
  - Depends on: 5.2
  - Validation: integration + **teste de isolamento de tenant**
    (`ai-usage.isolation.test.ts`, padrão dos demais `*.isolation.test.ts`).
  - Completion criteria: teste cruzado entre duas barbearias verde contra Postgres real.
  - Evidência: `ai-usage.isolation.test.ts` — 2/2 verdes contra Postgres real.

## 6. `apps/worker` — orquestração do turno

- [x] 6.1 Estender `process-inbound.ts`: após a lógica existente, se `origin = cliente`, sem
  opt-out e `handover = bot`, buscar dados (histórico, barbearia, serviços, grade), montar
  prompt e mensagens, resolver `AiClient`, rodar `runConversationTurn`.
  - Depends on: 4.2, 5.3, 5.4
  - Validation: integration (Postgres real) + e2e (boot real do worker)
  - Completion criteria: log real de boot colado; teste de integração cobrindo o Flow 1 do
    design.md com `AiClient` fake e `WhatsAppProvider` dry-run.
  - Evidência: boot real — `[worker] up — pg-boss iniciado, jobs registrados`. Teste "tool de
    domínio chamada: envia a resposta, persiste como saída e registra uso de IA" (verde,
    Postgres real) cobre o Flow 1 completo.

- [x] 6.2 Aplicar o resultado do turno: enviar resposta (`WhatsAppProvider.sendText`),
  persistir mensagem de saída (`createMessage`), atualizar stall/handover conforme Decisions
  3/6/8, registrar uso (`recordUsage`).
  - Depends on: 6.1
  - Validation: integration + e2e
  - Completion criteria: teste comprova mensagem de saída persistida e visível via
    `listMessages`; teste comprova handover humano nos 3 cenários de erro/escalação/estagnação.
  - Evidência: `apps/worker/src/jobs/process-inbound.test.ts` — **26/26 testes verdes**
    (Postgres real), incluindo: tool de domínio → saída persistida + `ai_usage_events` + stall
    zerado; escalação explícita → handover humano + mensagem fixa enviada; estagnação (2
    turnos sem tool) → handover humano forçado, ignorando o texto do modelo; conversa com
    handover humano → bot em silêncio; opt-out → bot não aciona.

- [x] 6.3 Degradação: capturar classes de erro do SDK (via `isAiProviderError`, checagem por
  `instanceof Anthropic.AnthropicError` — cobre `RateLimitError`/`APIConnectionError`/
  `APIError`) sem lançar exceção não tratada do job.
  - Depends on: 6.1
  - Validation: integration
  - Completion criteria: teste força cada classe de erro via `AiClient` fake; job não falha;
    `handover` vira humano; log sem conteúdo (grep colado do log real confirmando ausência de
    corpo de mensagem).
  - Evidência: teste "erro do provedor de IA degrada para humano sem lançar e sem enviar
    mensagem" (força `Anthropic.APIConnectionError` real) — verde. Log real:
    `[worker] whatsapp.process-inbound: conversation=... erro_ia=APIConnectionError —
    handover=humano` (sem corpo de mensagem). `errors.test.ts` cobre `RateLimitError` e
    `APIConnectionError` isoladamente, e que um `Error` genérico com texto parecido
    ("rate limit atingido") NÃO é reconhecido — prova que a checagem é por classe, não string.

## 7. Verificação end-to-end real (sem `ANTHROPIC_API_KEY`, com dry-run)

- [x] 7.1 Fluxo completo real: Postgres real de pé, `apps/web` real de pé, worker real de pé,
  `curl` real assinado contra o webhook (mesma rota da Change 1) simulando mensagem de cliente
  pedindo para agendar.
  - Depends on: 6.1, 6.2, 6.3
  - Validation: e2e
  - Completion criteria: `curl` colado; log real do worker colado mostrando o turno processado;
    query real no Postgres mostrando o resultado persistido.
  - Evidência (rodado nesta sessão, dados de teste limpos ao final):
    - `curl -i -X POST http://localhost:3000/api/webhooks/whatsapp` com
      `X-Hub-Signature-256` calculado de verdade sobre o corpo cru com o `WHATSAPP_APP_SECRET`
      real do `.env` → `HTTP/1.1 200 OK` `{"ok":true}`.
    - Log real do worker: `[ai:dry-run] converse: model=claude-haiku-4-5 messages=1 tools=6` →
      `escalado motivo=modo dry-run: IA não configurada` → `[whatsapp:dry-run] enviaria texto
      (70 caractere(s)) para ***7777 via e2e-phone-... — wamid=dryrun...`.
    - Query real no Postgres: `whatsapp_conversations.handover = 'humano'`; `whatsapp_messages`
      com a mensagem de entrada real (`"oi, quero agendar um corte"`) e a de saída (a
      `HANDOFF_MESSAGE` fixa) com `wamid` do dry-run; `ai_usage_events` com uma linha
      (`claude-haiku-4-5`, 0 tokens — honesto, é dry-run).
    - **Nota de honestidade**: neste ambiente (sem `ANTHROPIC_API_KEY`), o comportamento real
      de ponta a ponta é a escalação segura por padrão (Decision 1), não a execução de uma tool
      de agenda de fato — esse caminho está provado em nível de teste de integração (6.1/6.2,
      com Postgres real), não neste e2e multi-processo, porque roteirizar o `AiClient` dry-run
      exige código de teste, não é possível via `curl` puro contra um processo real. Registrado
      como o limite honesto desta evidência, não como lacuna escondida.

## 8. ADR-0005 e fechamento

- [x] 8.1 Corrigir `ADR-0005-ia-claude-api.md`: seção datada com as correções do plano
  § 4.1 (thinking não suportado no Haiku 4.5, omitir) e § 4.2 (cache não liga neste tamanho de
  prompt, conta refeita). Status permanece "Aceito, pendente de portão de qualidade" até a
  bateria real rodar (não inventar aprovação plena sem ter rodado).
  - Depends on: —
  - Validation: revisão manual
  - Completion criteria: seção adicionada, contexto original preservado.
  - Evidência: seção "Correção e decisão final (2026-09-10...)" adicionada ao final do ADR;
    contexto/decisão original de 2026-07-03 preservados intactos acima.

- [x] 8.2 Spec permanente `openspec/specs/atendimento-ia/spec.md` criada a partir do delta;
  `openspec/specs/README.md` atualizado (candidata → especificada).
  - Depends on: todas as anteriores
  - Validation: revisão manual
  - Completion criteria: arquivo criado; índice atualizado.
  - Evidência: `openspec/specs/atendimento-ia/spec.md` criado (9 Requirements); linha nova na
    tabela "Capabilities especificadas" e removida de "candidatas" em
    `openspec/specs/README.md`.

- [x] 8.3 `.env.example` ganha `ANTHROPIC_API_KEY`/`AI_MODEL` (já existem, conferir) — sem
  valor real. `CHANGELOG.md` atualizado. Change arquivada em
  `openspec/changes/archive/add-atendimento-ia/`.
  - Depends on: 8.2
  - Validation: revisão manual
  - Completion criteria: `.env.example` conferido; CHANGELOG com entrada; pasta arquivada.
  - Evidência: `.env.example` linhas 22-23 já tinham `ANTHROPIC_API_KEY=`/`AI_MODEL=
    claude-haiku-4-5` (Fase 2), sem valor real — conferido, nenhuma mudança necessária.
    `CHANGELOG.md` `[Unreleased]` ganhou a entrada `[add-atendimento-ia]`. Pasta movida para
    `openspec/changes/archive/add-atendimento-ia/` ao final desta sessão.

## 9. Pendente — bloqueado por credencial (fora do escopo técnico desta change)

- [ ] 9.1 Obter `ANTHROPIC_API_KEY` real (tarefa do Matheus, deliberadamente por último, mesma
  natureza do BSP na Change 1).
  - Depends on: —
  - Validation: manual
  - Completion criteria: chave configurada em `.env` (nunca commitada).

- [ ] 9.2 Rodar a bateria de conversas reais do § 7 do plano contra `claude-haiku-4-5` de
  verdade (agendar do zero, remarcar, cancelar, preço, horário, ambíguo, cliente irritado, fora
  de escopo, horário ocupado, horário no passado). Se reprovar, decidir com o Matheus a troca
  para `AI_MODEL=claude-sonnet-5`.
  - Depends on: 9.1
  - Validation: manual (bateria) + registro do resultado
  - Completion criteria: resultado da bateria documentado; ADR-0005 promovido a "Aceito" pleno.
