# ADR-0005: IA conversacional com Anthropic Claude API

## Status
Aceito, pendente de portão de qualidade (2026-09-10) <!-- Ver seção "Correção e decisão final"
abaixo. A arquitetura e o modelo estão implementados e verificados de ponta a ponta (change
`add-atendimento-ia`) com o SDK da Anthropic mockado por injeção de dependência — falta rodar a
bateria de conversas reais do plano de execução § 7 contra `claude-haiku-4-5` de verdade, o que
depende de `ANTHROPIC_API_KEY` (não configurada neste ambiente). Não promover para "Aceito"
sem ressalva antes disso rodar. --> · Proposto (2026-07-03)

## Contexto
Decisão D3: IA conversacional desde a v1 — o LLM responde os clientes das barbearias no WhatsApp. Restrições: custo por mensagem compatível com R$697/mês de mensalidade e orçamento D4; respostas em PT-BR no tom da marca; **ações críticas (agendar, confirmar, cancelar) não podem depender de texto livre do modelo**.

## Decisão
1. **Anthropic Claude API** como provedor de LLM, atrás de `packages/ai` (cliente próprio + prompts versionados) — trocável como o WhatsApp.
2. **Arquitetura híbrida**: a IA conduz a conversa livre (dúvidas, preços, horários) e usa **tool use** para ações estruturadas — consultar disponibilidade, criar/alterar agendamento, registrar cliente. As tools executam regras de negócio determinísticas no domínio; o modelo nunca "decide sozinho" um efeito colateral.
3. **Modelo configurável por env** (`AI_MODEL`). Recomendação inicial: **`claude-haiku-4-5`** para as conversas de atendimento; modelos superiores (Sonnet/Opus) reservados para tarefas internas de maior valor (ex.: geração do relatório mensal) se necessário.
4. **Prompt caching** obrigatório no system prompt (persona da barbearia, serviços, regras) para reduzir custo e latência.
5. Salvaguardas: escalação para humano (barbeiro/operador) por gatilhos (frustração, pedido explícito, 3 falhas de entendimento); registro completo das conversas; instrução de escopo (só assuntos da barbearia).

## Justificativa e custo
Preços vigentes (por 1M tokens): Haiku 4.5 $1/$5 · Sonnet 4.6 $3/$15 · Opus 4.8 $5/$25.

Estimativa por mensagem de atendimento (system prompt ~1,5k tokens cacheado + histórico ~1k + resposta ~100 tokens), com cache: **Haiku ≈ US$0,001-0,002 (~R$0,01)**. A 500 mensagens/cliente/mês e 5 clientes: **~R$25-50/mês** — confortável em D4. Sonnet triplicaria; Opus ~5×. Atendimento de barbearia (agendar, tirar dúvida, confirmar) é tarefa simples e bem delimitada — perfil ideal do Haiku; a qualidade é validável com dados reais e o upgrade é uma variável de ambiente.

## Vantagens
SDK TS de primeira classe; tool use maduro (essencial ao desenho híbrido); prompt caching nativo; qualidade forte em PT-BR.

## Desvantagens / Trade-offs
- Dependência de API externa (mitigada pela abstração e por fluxo degradado: sem IA, mensagens caem para atendimento humano com notificação).
- Custo variável com volume (mitigado: caching, modelo econômico, monitoramento de custo por tenant).
- Risco de resposta inadequada (mitigado: tools para ações, escopo por prompt, escalação, logs).

## Escalabilidade
Custo cresce linearmente com mensagens — e a mensalidade cresce junto (por cliente). Rate limits da Anthropic comportam o volume previsto com folga.

## Alternativas consideradas
- **OpenAI** — equivalente em capacidade; ecossistema/tooling similar. Segunda opção válida; a abstração mantém a porta aberta.
- **Modelos abertos self-hosted** — inviável no orçamento D4 (GPU) e na operação de 1 pessoa. Rejeitada.
- **Só fluxos determinísticos (sem LLM)** — contraria a decisão D3 e o posicionamento do produto. Rejeitada.

## Consequências
Prompts versionados no repo (`packages/ai/prompts/`); testes de conversa fazem parte da estratégia de testes das changes de `atendimento-ia`; custo por tenant monitorado desde a v1 (insumo do relatório mensal e do pricing).

## Correção e decisão final (2026-09-10, durante `add-atendimento-ia`)

Duas afirmações deste ADR não se confirmaram ao implementar de verdade contra a documentação
atual do modelo (`docs/sdd/06-plano-execucao-fase-5.md` §§ 4.1-4.2, verificado nesta data). O
contexto original acima permanece intacto como registro da decisão à época; esta seção é o que
vale para implementação.

1. **`thinking` não é usado.** O texto original não especificava o formato; na prática,
   `claude-haiku-4-5` **não suporta** `thinking: {type: "adaptive"}` nem o parâmetro `effort`
   — ambos retornam erro. O único formato aceito por modelos que suportam thinking é o antigo
   `{type: "enabled", budget_tokens: N}`, e mesmo esse é **omitido de propósito** para o bot de
   atendimento: agendar e tirar dúvida é tarefa rasa, e a latência de responder no WhatsApp em
   segundos importa mais do que raciocínio estendido.
2. **Prompt caching não liga nesta fase.** O prefixo mínimo cacheável do Haiku 4.5 é
   **4096 tokens**; o system prompt do atendimento (persona, cardápio, regras) fica bem abaixo
   disso (`packages/ai/src/prompts/system-prompt.ts`, ~poucas centenas de tokens). Sem erro,
   sem aviso — apenas `cache_read_input_tokens`/`cache_creation_input_tokens` sempre zero. A
   decisão de arquitetura **não muda**: o system prompt continua escrito como se o cache fosse
   ligar (nada volátil dentro dele — data e nome do cliente vão na mensagem, nunca no system),
   para que um upgrade futuro de modelo (ex.: Sonnet 5, mínimo 1024 tokens) ligue o cache sem
   refatoração. **Não infle o prompt artificialmente para atingir o mínimo** — isso otimizaria
   a métrica, não o custo real.

   Custo recalculado, sem cache, com os preços vigentes do Haiku 4.5 (US$1/1M entrada,
   US$5/1M saída): ~US$0,003 por mensagem (system ~1,5k + histórico ~1k tokens de entrada,
   ~100 de saída) — a 2.500 mensagens/mês (500/cliente × 5 clientes), **~US$7,50/mês
   (~R$42/mês)**, o dobro da estimativa original deste ADR e ainda assim confortável dentro do
   D4.

3. **Implementação (`packages/ai`):** `AiClient` injetável (real via
   `client.beta.messages.toolRunner` + `betaZodTool`, dry-run sem rede) — mesmo padrão de
   `WhatsAppProvider`/ADR-0004, o que permitiu implementar e testar o loop inteiro antes de
   existir `ANTHROPIC_API_KEY` neste ambiente. Ver `openspec/changes/archive/add-atendimento-ia/
   design.md` para as decisões técnicas completas (escalação, estagnação, custo por tenant,
   degradação sem IA).

**Status permanece "pendente de portão de qualidade"** até a bateria de conversas reais do
plano § 7 rodar contra o modelo de verdade — tarefa registrada e bloqueada por credencial, não
decisão em aberto.
