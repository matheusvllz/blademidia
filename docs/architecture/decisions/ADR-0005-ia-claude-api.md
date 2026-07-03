# ADR-0005: IA conversacional com Anthropic Claude API

## Status
Proposto (2026-07-03)

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
