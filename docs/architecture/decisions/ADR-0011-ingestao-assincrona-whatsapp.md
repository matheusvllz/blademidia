# ADR-0011: Ingestão assíncrona de mensagens do WhatsApp

## Status
Proposto (2026-09-07) — decisão de arquitetura pré-tomada para a Fase 5 (`whatsapp-canal` +
`atendimento-ia`), registrada em `docs/sdd/06-plano-execucao-fase-5.md` § 4.5 antes da change
`add-whatsapp-canal` nascer, porque nenhum design de webhook deveria ser escrito sem ela.

## Contexto
A Meta Cloud API (ADR-0004) entrega eventos de mensagem via webhook HTTP `POST`. Ela exige
resposta `200` em poucos segundos e **reentrega** a mesma mensagem se a resposta demorar,
falhar ou não vier. Ao mesmo tempo, a Fase 5 introduz um loop de conversa com a Claude API
(`atendimento-ia`, ADR-0005) que pode levar de 1 a alguns segundos por chamada, e potencialmente
mais de um turno de tool use antes de responder ao cliente (consultar disponibilidade, criar
agendamento). Processar o webhook e rodar o loop de IA na mesma requisição HTTP mistura dois
regimes de tempo incompatíveis.

O `apps/worker` com pg-boss já existe e está provado em produção de teste desde a Fase 2
(ADR-0009) — foi deixado pronto exatamente para este momento (ver ADR-0009, Contexto: "deixar a
plumbing assíncrona pronta para a mensageria da Fase 5").

## Decisão
1. A rota `POST /api/webhooks/whatsapp` (`apps/web`) faz apenas: ler o corpo cru da requisição,
   verificar a assinatura HMAC (`X-Hub-Signature-256`) contra o corpo cru, persistir a mensagem
   recebida com deduplicação por `wamid` (restrição de unicidade no banco), enfileirar um job no
   pg-boss, e responder `200` — tudo em milissegundos, sem chamar a Claude API nem o
   `AgendaService` nesse caminho.
2. O `apps/worker` consome o job: resolve tenant e conversa, roda o loop de IA quando aplicável
   (Fase 5.2), e envia a resposta pelo `WhatsAppProvider`.
3. Duas mensagens do mesmo cliente em sequência rápida não podem gerar dois processamentos em
   paralelo respondendo duas vezes — usar chave de singleton do pg-boss por conversa, ou lock
   por conversa no banco. Este é o cenário de concorrência mais provável da fase e precisa de
   teste dedicado, não só de revisão de código.
4. O mesmo padrão vale para o envio de saída: `confirmacao-agendamento` e `reativacao-clientes`
   (changes 3 e 4) continuam sendo jobs do worker, como os esqueletos já entregues na Fase 2
   (ADR-0009) — só o envio real muda, não onde ele roda.

## Justificativa
A Meta reentrega em caso de lentidão; o loop de IA é lento pelo padrão dela. Rodar inline
garante reentrega, resposta duplicada ao cliente final e timeout do webhook — o oposto do que a
"Regra de ouro" do repositório (nunca deixar o cliente sem resposta) pede. Separar ingestão de
processamento é o mesmo padrão que a Fase 2 já usou para no-show e que a Fase 3 usou para o
snapshot mensal: o worker processa, a rota HTTP só recebe e confirma.

## Vantagens
- Resposta ao webhook da Meta em milissegundos, sempre — elimina reentrega por timeout.
- Reusa infraestrutura já provada (pg-boss, `apps/worker`) — zero custo incremental de infra.
- Deduplicação por `wamid` no banco resolve reentrega de mensagem de forma estrutural, não por
  lógica de aplicação espalhada.
- O mesmo desenho serve tanto para mensagem recebida (esta ADR) quanto para envio automático
  (confirmação, reativação) — um único padrão para toda a Fase 5.

## Desvantagens / Trade-offs
- Um passo a mais de latência entre "cliente mandou mensagem" e "bot respondeu" (enfileirar +
  processar), imperceptível para o cliente final mas real. Aceitável: a spec de
  `atendimento-ia` vai fixar um teto observável (ex.: resposta em até alguns segundos, p95),
  não zero.
- Lock/singleton por conversa é mais uma peça de estado a acertar — mitigado por ser exatamente
  o problema que pg-boss resolve nativamente (fila com chave), não uma solução caseira.

## Custo
Zero incremental — reusa o `apps/worker` e o Postgres já orçados (ADR-0009, D4).

## Escalabilidade
O volume de mensagens de WhatsApp por barbearia é ordens de grandeza menor que o de linhas de
banco que o pg-boss já processa hoje (agenda, relatórios). Sem risco de gargalo no volume
previsto para a v1.

## Alternativas consideradas
- **Processar a IA inline no handler do webhook** — mais simples de escrever, mas quebra sob a
  exigência de resposta rápida da Meta; rejeitada.
- **Long-polling ou fila própria fora do pg-boss** — duplica infraestrutura que o ADR-0009 já
  resolveu; rejeitada por D4.
- **Responder 200 antes de persistir** — arriscaria perder mensagem em caso de falha entre a
  resposta e a escrita; rejeitada — a ordem correta é persistir (com dedupe) e só então
  responder.

## Consequências
- Toda rota de webhook da Fase 5 segue este padrão: verificar → persistir → enfileirar →
  responder. Nenhuma chamada de rede lenta (Claude API, envio ao provedor) acontece dentro do
  handler HTTP do webhook.
- O `tasks.md` de `add-whatsapp-canal` precisa de um cenário de teste específico para
  mensagens concorrentes da mesma conversa (ver Decisão, item 3).
- `apps/worker/src/jobs/` ganha um novo job de processamento de mensagem recebida, ao lado dos
  já existentes (`no-show-sweep`, `send-confirmation`, `reactivation-sweep`,
  `monthly-snapshot`).
