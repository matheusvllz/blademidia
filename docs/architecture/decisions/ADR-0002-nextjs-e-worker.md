# ADR-0002: Next.js (painel + API + webhooks) e worker Node separado

## Status
Proposto (2026-07-03)

## Contexto
O produto tem duas naturezas de carga: (a) painel web e endpoints HTTP (request/response curtos) e (b) trabalho assíncrono — processar mensagens, conversar com LLM (segundos), jobs agendados (confirmação 24h, reativação 21d, relatório mensal).

## Decisão
- **`apps/web`**: Next.js (App Router) serve o painel (React + shadcn/ui com tokens do Design System) e os endpoints HTTP, incluindo webhooks do WhatsApp — que apenas validam, enfileiram e respondem 200 imediatamente.
- **`apps/worker`**: processo Node de longa duração que consome as filas (pg-boss) e executa jobs agendados. É onde a IA conversa e as automações rodam.

## Justificativa
- Webhook precisa responder rápido (provedores reenviam/penalizam timeouts); conversa com LLM leva segundos — separar recepção de processamento é o desenho correto e barato.
- Next.js dá painel + API num framework só, com o melhor ecossistema de componentes (shadcn/ui) para aplicar o Design System rapidamente.
- Ambos os processos compartilham `packages/core` e `packages/db` — sem duplicação de domínio.

## Vantagens
Deploy simples (2 containers); reinício do worker não derruba o painel; jobs com retry/backoff nativos da fila; SSR/valores em tempo real no painel quando útil.

## Desvantagens / Trade-offs
- Next.js é mais framework do que o mínimo necessário para a API (aceitável: o painel paga o custo).
- Dois processos para orquestrar (mitigado: Docker Compose).

## Custo
Zero adicional; ambos no mesmo VPS.

## Escalabilidade
Worker escala por réplicas independentes do web. Se a API interna crescer além do Next, extrai-se um serviço Fastify usando os mesmos packages — mudança contida.

## Alternativas consideradas
- **Tudo em Next.js (jobs via cron/route handlers)** — frágil para jobs longos e retries; serverless-style não combina com conversas de IA multi-segundo. Rejeitada.
- **SPA Vite + Fastify + worker** — três apps, mais wiring manual (auth, rotas, build) sem ganho proporcional. Rejeitada.
- **SvelteKit/Remix** — ecossistema de componentes e suporte de agentes de IA menores que React/Next. Rejeitada.

## Consequências
Webhooks nunca processam de forma síncrona; todo efeito assíncrono passa pela fila; contrato entre web e worker é a fila + banco compartilhado.
