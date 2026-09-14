# Proposal: Atendimento por IA (loop de conversa no WhatsApp)

## Change ID
`add-atendimento-ia`

## Status
**Done** (2026-09-10) <!-- Aprovação: todas as decisões de arquitetura, modelo e voz desta
change foram tomadas por Matheus em 2026-09-07 e registradas em
docs/sdd/06-plano-execucao-fase-5.md §§ 4.1-4.3 e 7 (ver também exploration.md, seção
"Regras de negócio — Confirmadas"). Não há pergunta bloqueante de negócio em aberto. Em
2026-09-10 Matheus instruiu avançar ("pode começar a próxima etapa"), na sequência das 4
changes da Fase 5 definida por ele mesmo (whatsapp-canal → atendimento-ia →
confirmacao-agendamento → reativacao-clientes). Implementada e verificada de ponta a ponta na
mesma sessão (ver tasks.md): 210 testes automatizados no monorepo, curl real assinado contra
Postgres real, boot real do worker. Único ponto pendente, fora do escopo técnico desta change
(mesma natureza do BSP em add-whatsapp-canal, por instrução explícita "por último configurar
chaves, assinaturas, etc"): grupo 9 do tasks.md — `ANTHROPIC_API_KEY` real e o portão de
qualidade (bateria de conversas reais), que bloqueiam apenas a promoção final do ADR-0005 para
"Aceito" sem ressalva, não a implementação em si. -->

## Context
Ver [exploration.md](exploration.md) e
[`docs/sdd/06-plano-execucao-fase-5.md`](../../../docs/sdd/06-plano-execucao-fase-5.md) § 7.
Segunda das 4 changes da Fase 5; depende inteiramente de `add-whatsapp-canal` (canal, tools da
agenda e worker já existem e estão arquivados). As duas changes seguintes
(`confirmacao-agendamento`, `reativacao-clientes`) dependem desta.

## Problem
O canal de WhatsApp entregue na Change 1 recebe, persiste e exibe mensagens, mas não responde
nada — a tese central do produto ("o zap continua atendendo quando o dono não pode") ainda não
existe de fato sem um loop de conversa por IA conectado a ele.

## Goals
- Loop de conversa de um turno por mensagem, rodando no worker (nunca no webhook, ADR-0011),
  com `claude-haiku-4-5`, tool use sobre as 4 tools da agenda (`packages/core/agenda/tools.ts`)
  e uma tool nova de cadastro básico de cliente para o caso de telefone não cadastrado.
- Prompts versionados em `packages/ai/src/prompts/`, sem conteúdo volátil no system prompt
  (ADR-0005).
- Escalação para humano por gatilho (pedido explícito, frustração, N falhas de entendimento,
  assunto fora de escopo), gravando `handover = humano`.
- Degradação: falha da Anthropic API vira conversa humana, sem perder a mensagem do cliente.
- Registro de conversa e custo (`usage`) por tenant desde o primeiro dia.
- Reescrita de `packages/ai/src/tools/index.ts` com `betaZodTool`, eliminando o JSON Schema
  mantido à mão.
- Correção do ADR-0005 (thinking não suportado no Haiku 4.5; prompt caching não liga neste
  tamanho de prompt) com a conta refeita do plano § 4.2.

## Non-Goals
- Envio iniciado pela barbearia fora da janela de 24h — `add-confirmacao-agendamento` e
  `add-reativacao-clientes`.
- UI de responder pelo painel — o barbeiro responde pelo app (coexistência, `whatsapp-canal`).
- Suporte multilíngue.
- Rodar a bateria de conversas reais contra a Anthropic de fato e promover o ADR-0005 a
  "Aceito" sem ressalva — depende de `ANTHROPIC_API_KEY` real (ver Open Questions).

## Users / Actors Impacted
- Cliente final da barbearia (conversa com o bot).
- Barbeiro-dono / funcionário (recebe a devolução quando o bot escala).
- Operador Blade (Matheus) — custo por tenant, portão de qualidade.

## Scope
### In scope
- `packages/ai`: `prompts/` (system prompt + variações de contexto), `conversation.ts`
  (monta mensagens a partir do histórico persistido), `loop.ts` (toolRunner), `escalation.ts`
  (gatilhos), `tools/index.ts` reescrito, `cost.ts` (registro de `usage`).
- `packages/core`: tool nova `cadastrar_cliente_basico` (nome + telefone, reaproveitando
  `packages/db/repositories/clients.ts`), ao lado das 4 tools de agenda já existentes.
- `packages/db`: colunas/tabela necessárias para guardar mensagens do assistente e custo por
  conversa (a decidir no design: reaproveitar `whatsapp_messages` com `direction`/`type`
  próprios vs. tabela nova de custo).
- `apps/worker`: `process-inbound.ts` passa a disparar o loop quando `handover = bot` e a
  conversa não está em opt-out; envia a resposta via `WhatsAppProvider` já existente.

### Out of scope
- Tudo listado em Non-Goals.
- Qualquer mudança em `packages/whatsapp` ou no contrato do webhook — já fechados na Change 1.

## Business Rules
- Nenhum efeito colateral fora de tool — o modelo nunca escreve na agenda por texto livre.
- Todo horário ofertado ao cliente vem de `consultar_disponibilidade` — nunca inventado.
- `handover = humano` interrompe o bot imediatamente para aquela conversa.
- Conversa em opt-out nunca recebe mensagem do bot (nem qualquer outra).
- Todo texto que o cliente final recebe segue a voz "barbearia → cliente" (§ 13.9 do guia de
  copy) e passa pelo checklist da § 14 antes de ser fixado no prompt.
- Custo (`usage` de cada chamada) é registrado por tenant, sem exceção.

## Affected Capabilities
- `atendimento-ia` (nova)

## Expected Impact
### Code
- `packages/ai` (reescrita substancial — deixa de ser esqueleto).
- `packages/core/src/agenda/tools.ts` (tool nova de cadastro básico).
- `packages/db` (schema/migração para mensagens do assistente e custo, se necessário).
- `apps/worker/src/jobs/process-inbound.ts` (dispara o loop).

### Data
- Possível tabela nova para custo por conversa/tenant (a decidir no design); sem migração de
  dado existente.

### APIs / Contracts
- Nenhum endpoint HTTP novo — tudo roda no worker, consumindo o que a Change 1 já expõe.

### Integrations
- Anthropic Claude API (`@anthropic-ai/sdk`, `client.beta.messages.toolRunner`).

### Operations
- Nenhuma mudança de runbook de onboarding (é sobre o comportamento do bot, não sobre o
  cadastro do número).

### Security / Privacy (LGPD)
- Mensagens do assistente entram no mesmo regime de anonimização já implementado em
  `whatsapp-canal` (a confirmar/estender no design se a tabela mudar).
- Nenhum segredo (chave da Anthropic) em log; `usage`/custo não é dado pessoal, mas o texto da
  conversa é — mesma régua de mascaramento de log já em vigor.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Alucinação de horário | Cliente aparece em horário errado | Horário só sai de `consultar_disponibilidade`; teste dedicado |
| Anthropic fora do ar | Cliente sem resposta | Degradação para humano, mensagem preservada |
| Loop infinito de tool-use | Custo e latência | Limite de iterações no runner |
| Prompt injection pelo cliente final | Efeito indevido | Tools validam tudo no domínio; instrução de escopo; teste dedicado |
| Portão de qualidade não executável nesta sessão (sem `ANTHROPIC_API_KEY`) | ADR-0005 fica "Aceito, pendente" em vez de "Aceito" pleno | Implementação e testes completos com SDK mockado; tarefa de bateria real registrada como pendente, mesmo padrão do BSP na Change 1 |

## Success Criteria
- `pnpm --filter @blademidia/ai build`/typecheck sem erro.
- Testes automatizados (mock do SDK Anthropic) cobrindo: resposta simples, agendar do zero,
  remarcar, cancelar, escalação por gatilho, degradação sem IA, limite de iterações, injeção de
  instrução.
- Boot real do worker consumindo o job de inbound sem erro, com o loop mockado.
- Teste de isolamento de tenant para qualquer tabela nova.
- **Pendente de credencial** (não bloqueia o fechamento técnico, mas impede o "Done" pleno):
  bateria de conversas reais do § 7 do plano contra `claude-haiku-4-5` de verdade.

## Assumptions
- ADR-0001 a ADR-0011 aceitos sem mudança de conteúdo, exceto ADR-0005 (corrigido nesta change).
- O SDK `@anthropic-ai/sdk` expõe `client.beta.messages.toolRunner` e `betaZodTool` na versão
  a ser fixada no `package.json` — a confirmar/instalar durante a implementação.

## Open Questions
- Qual o valor final de `N` (falhas de entendimento antes de escalar) e do limite de iterações
  do tool runner — não bloqueia esta change (são parâmetros de implementação, propostos no
  exploration.md e fixados no design.md), ajustáveis depois com dado real.
- Quando `ANTHROPIC_API_KEY` existir (tarefa comercial/operacional do Matheus, deliberadamente
  por último): rodar o portão de qualidade do § 7 do plano e promover o ADR-0005 a "Aceito"
  sem ressalva.
