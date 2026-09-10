# Tasks: Atendimento por IA (loop de conversa no WhatsApp)

> Evidência real, não `pnpm typecheck` (regra do plano § 0). Marcar `[x]` só com evidência colada.

## 1. `packages/ai` — fundação: tipos, config e clients (real + dry-run)

- [ ] 1.1 `types.ts`: `AiClient`, `ConverseInput`/`ConverseOutput`, `UsageInfo`, `TurnResult`.
  - Depends on: —
  - Validation: typecheck + revisão manual (só tipos, sem lógica).
  - Completion criteria: compila; usado pelos módulos seguintes.

- [ ] 1.2 `dry-run-client.ts`: `createDryRunAiClient()` — resposta determinística sem rede,
  loga a chamada mascarando dados sensíveis (mesmo padrão de `packages/whatsapp/dry-run.ts`).
  - Depends on: 1.1
  - Validation: unit
  - Completion criteria: teste comprova que nenhuma chamada de rede acontece (spy em `fetch`).

- [ ] 1.3 `anthropic-client.ts`: `createAnthropicAiClient(config)` — usa `@anthropic-ai/sdk`,
  `client.beta.messages.toolRunner` + `betaZodTool`, `model`/`max_tokens: 1024`/sem `thinking`.
  - Depends on: 1.1
  - Validation: contract (o quanto for viável sem `ANTHROPIC_API_KEY` real — documentar o que
    foi possível testar e o que ficou pendente de credencial).
  - Completion criteria: monta o `toolRunner` corretamente (tools, system, max_tokens);
    lança as classes de erro tipadas do SDK sem serem engolidas.

- [ ] 1.4 `client.ts`: `resolveAiClient(env)` — real se `ANTHROPIC_API_KEY` presente, dry-run
  caso contrário (mesmo padrão de `resolveWhatsAppProvider`).
  - Depends on: 1.2, 1.3
  - Validation: unit
  - Completion criteria: teste cobre os dois caminhos.

## 2. `packages/core` — generalização de tool e tool de cadastro básico

- [ ] 2.1 Extrair `BotTool<I>` como alias de `AgendaTool<I>` em `agenda/tools.ts`, sem quebrar
  os imports existentes.
  - Depends on: —
  - Validation: unit (suíte existente de `tools.test.ts` continua verde).
  - Completion criteria: `pnpm --filter @blademidia/core test` verde.

- [ ] 2.2 `clients/tools.ts`: `cadastrarClienteBasicoTool` — `nome` como único input do
  modelo; telefone vem do orquestrador (nunca do input); usa `createClient`.
  - Depends on: 2.1
  - Validation: unit
  - Completion criteria: teste cobre criação e o caso de telefone já cadastrado
    (`phone_duplicate` — liga a conversa ao cliente existente em vez de duplicar).

## 3. `packages/ai` — prompts, mapeamento de histórico e tools

- [ ] 3.1 `prompts/system-prompt.ts`: `buildSystemPrompt(context)` com persona, cardápio,
  horário resumido (derivado de `work_schedules`), regras (nunca inventar horário, nunca
  fingir ser pessoa específica, escopo só da barbearia). Sem `new Date()`/id de sessão dentro.
  - Depends on: —
  - Validation: unit
  - Completion criteria: teste garante ausência de conteúdo volátil; conteúdo revisado contra
    checklist § 14 do guia de copy (registrar no PR/commit que passou).

- [ ] 3.2 `prompts/messages.ts`: `mapHistoryToMessages(history, inboundBody)` — converte
  `WhatsappMessageRecord[]` para o formato de mensagens do SDK.
  - Depends on: —
  - Validation: unit
  - Completion criteria: teste cobre histórico vazio, histórico intercalado entrada/saída.

- [ ] 3.3 `tools/index.ts` reescrito: `getBotTools()` agrega tools de agenda + cadastro +
  tool local de escalação; `executeTool(barbershopId, name, input)` despacha as de domínio.
  - Depends on: 2.1, 2.2
  - Validation: unit
  - Completion criteria: teste de smuggling de `barbershopId` no input (Decision 7) prova que é
    ignorado.

## 4. `packages/ai` — loop de conversa e escalação

- [ ] 4.1 `escalation.ts`: `STALL_THRESHOLD`, `shouldForceStallEscalation(count)`,
  `HANDOFF_MESSAGE` (texto fixo aprovado pelo checklist § 14).
  - Depends on: —
  - Validation: unit
  - Completion criteria: teste de limite (abaixo, igual, acima do threshold).

- [ ] 4.2 `loop.ts`: `runConversationTurn({ aiClient, systemPrompt, messages, barbershopId,
  maxToolIterations })` → `TurnResult` (texto final, tools executadas, uso, escalação).
  - Depends on: 1.1, 3.3, 4.1
  - Validation: unit (com `AiClient` fake roteirizado)
  - Completion criteria: cenários cobertos — resposta simples sem tool; agendar do zero
    (consultar → criar); remarcar; cancelar; cadastro + agendamento (cliente novo); escalação
    explícita; estagnação por N turnos; limite de iterações atingido; erro do `AiClient`
    propagado (não engolido) para o orquestrador tratar.

## 5. `packages/db` — schema, migração e repositórios

- [ ] 5.1 Migração: `whatsapp_conversations.bot_stall_count integer not null default 0`.
  - Depends on: —
  - Validation: integration (aplicar em Postgres real)
  - Completion criteria: `psql \d whatsapp_conversations` colado mostrando a coluna.

- [ ] 5.2 Migração: tabela `ai_usage_events` (schema da Decision 5 do design.md).
  - Depends on: —
  - Validation: integration
  - Completion criteria: `psql \d ai_usage_events` colado.

- [ ] 5.3 `repositories/whatsapp-conversations.ts`: `incrementBotStallCount`,
  `resetBotStallCount`.
  - Depends on: 5.1
  - Validation: integration (Postgres real)
  - Completion criteria: teste comprova incremento e reset.

- [ ] 5.4 `repositories/ai-usage.ts`: `recordUsage(barbershopId, input)`,
  `listUsageForBarbershop(barbershopId)`.
  - Depends on: 5.2
  - Validation: integration + **teste de isolamento de tenant**
    (`ai-usage.isolation.test.ts`, padrão dos demais `*.isolation.test.ts`).
  - Completion criteria: teste cruzado entre duas barbearias verde contra Postgres real.

## 6. `apps/worker` — orquestração do turno

- [ ] 6.1 Estender `process-inbound.ts`: após a lógica existente, se `origin = cliente`, sem
  opt-out e `handover = bot`, buscar dados (histórico, barbearia, serviços, grade), montar
  prompt e mensagens, resolver `AiClient`, rodar `runConversationTurn`.
  - Depends on: 4.2, 5.3, 5.4
  - Validation: integration (Postgres real) + e2e (boot real do worker)
  - Completion criteria: log real de boot colado; teste de integração cobrindo o Flow 1 do
    design.md com `AiClient` fake e `WhatsAppProvider` dry-run.

- [ ] 6.2 Aplicar o resultado do turno: enviar resposta (`WhatsAppProvider.sendText`),
  persistir mensagem de saída (`createMessage`), atualizar stall/handover conforme Decisions
  3/6/8, registrar uso (`recordUsage`).
  - Depends on: 6.1
  - Validation: integration + e2e
  - Completion criteria: teste comprova mensagem de saída persistida e visível via
    `listMessages`; teste comprova handover humano nos 3 cenários de erro/escalação/estagnação.

- [ ] 6.3 Degradação: capturar classes de erro do SDK (`RateLimitError`, `APIConnectionError`,
  `APIError`) sem lançar exceção não tratada do job.
  - Depends on: 6.1
  - Validation: integration
  - Completion criteria: teste força cada classe de erro via `AiClient` fake; job não falha;
    `handover` vira humano; log sem conteúdo (grep colado do log real confirmando ausência de
    corpo de mensagem).

## 7. Verificação end-to-end real (sem `ANTHROPIC_API_KEY`, com dry-run)

- [ ] 7.1 Fluxo completo real: Postgres real de pé, worker real de pé, `curl` real no webhook
  (mesma rota da Change 1) simulando mensagem de cliente pedindo para agendar, `AiClient`
  dry-run configurado para retornar um roteiro de tool calls determinístico, `WhatsAppProvider`
  dry-run.
  - Depends on: 6.1, 6.2, 6.3
  - Validation: e2e
  - Completion criteria: `curl` colado; log real do worker colado mostrando o turno processado;
    query real no Postgres mostrando o agendamento criado com `source = bot` e a mensagem de
    saída persistida.

## 8. ADR-0005 e fechamento

- [ ] 8.1 Corrigir `ADR-0005-ia-claude-api.md`: seção datada com as correções do plano
  § 4.1 (thinking não suportado no Haiku 4.5, omitir) e § 4.2 (cache não liga neste tamanho de
  prompt, conta refeita). Status permanece "Aceito, pendente de portão de qualidade" até a
  bateria real rodar (não inventar aprovação plena sem ter rodado).
  - Depends on: —
  - Validation: revisão manual
  - Completion criteria: seção adicionada, contexto original preservado.

- [ ] 8.2 Spec permanente `openspec/specs/atendimento-ia/spec.md` criada a partir do delta;
  `openspec/specs/README.md` atualizado (candidata → especificada).
  - Depends on: todas as anteriores
  - Validation: revisão manual
  - Completion criteria: arquivo criado; índice atualizado.

- [ ] 8.3 `.env.example` ganha `ANTHROPIC_API_KEY`/`AI_MODEL` (já existem, conferir) — sem
  valor real. `CHANGELOG.md` atualizado. Change arquivada em
  `openspec/changes/archive/add-atendimento-ia/`.
  - Depends on: 8.2
  - Validation: revisão manual
  - Completion criteria: `.env.example` conferido; CHANGELOG com entrada; pasta arquivada.

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
