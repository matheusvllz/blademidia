# ADR-0008: Camada de domínio compartilhada (`packages/core`) e contrato de tools do bot

## Status
Proposto (2026-07-14) — introduzido pela change `add-agendamento` (Fase 2).

## Contexto
A Fase 1 colocou a lógica do produto dentro de `apps/web` (ex.: auth em `apps/web/lib`). A
Fase 2 traz a agenda, cuja lógica precisa ser consumida por **três** consumidores distintos:
o painel (`apps/web`), o worker assíncrono (`apps/worker`, ADR-0009) e — na Fase 5 — o bot de
IA (`packages/ai`, D3/ADR-0005) via *tool use*. Se cada consumidor reimplementasse as regras
(disponibilidade, conflito, transições de estado), elas divergiriam — e o bot, em especial,
"decidiria sozinho" efeitos colaterais, o que o ADR-0005 proíbe.

## Decisão
1. Criar `packages/core` (`@blademidia/core`) como **fronteira única** de regras de negócio do
   produto. A agenda expõe um `AgendaService` com todas as operações
   (`getAvailability`, `bookAppointment`, `rescheduleAppointment`, `cancelAppointment`,
   `confirmAppointment`, `completeAppointment`, `markNoShow`).
2. Todo caminho de leitura/escrita de agenda passa por `packages/core`; `apps/web`,
   `apps/worker` e `packages/ai` são **adaptadores finos**. Nenhuma regra de agenda vive nos
   apps.
3. `packages/core` recebe `barbershopId` explícito em toda operação (ADR-0007) e não importa
   Next, pg-boss nem SDK de provedor.
4. O **contrato de tools** do bot (schemas + handlers que chamam o `AgendaService` com
   `source='bot'`) é definido em `packages/core` e apenas re-exposto por `packages/ai` — as
   tools da IA são adaptadores sobre o mesmo domínio, não um caminho de escrita paralelo.

## Justificativa
"Preparar a estrutura para o bot" só é real se painel e bot compartilharem a MESMA lógica.
Centralizar em um pacote elimina duplicação entre web e worker e garante que a IA execute
regras determinísticas (o modelo nunca decide um efeito colateral — ADR-0005).

## Vantagens
- Uma só implementação das regras; testável isoladamente (o motor de disponibilidade é puro).
- Bot e worker plugam sem reescrever regra; a Fase 5 só conecta o loop de conversa.
- Fronteira clara para evoluir o produto (novas capabilities colocam domínio aqui).

## Desvantagens / Trade-offs
- Um pacote a mais no monorepo e a disciplina de não colocar regra em `apps/*`.
- `packages/core` depende de `packages/db` (repositórios) — dependência unidirecional aceita.

## Custo
Zero incremental (mesmo monorepo, mesmo runtime). Não adiciona serviço.

## Escalabilidade
O domínio isolado facilita extrair um serviço no futuro, se necessário, sem tocar os apps
(princípio do monolito modular, ADR-0001).

## Alternativas consideradas
- **Manter a lógica em `apps/web/lib`** (como a Fase 1): o worker precisaria importar o app
  Next, e o bot reimplementaria regras — rejeitado.
- **Duplicar regras por consumidor**: divergência garantida — rejeitado.

## Consequências
- `packages/core` nasce nesta change; `apps/worker` e `packages/ai` o consomem.
- O `.npmrc` `node-linker=hoisted` (aprendizado da Fase 1) permanece necessário para os apps
  importarem o pacote.
