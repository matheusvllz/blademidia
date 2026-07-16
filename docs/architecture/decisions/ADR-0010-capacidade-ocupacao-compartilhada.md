# ADR-0010: Capacidade/ocupação da agenda como função única compartilhada

## Status
Proposto (2026-07-15) — introduzido pela change `add-relatorios` (Fase 3), consumido também
pela change `add-agenda-visao-semanal`.

## Contexto
Duas changes propostas na mesma janela precisam do mesmo número — "quanto da agenda está
ocupado num período": `relatorios` (indicador de ocupação no relatório) e
`add-agenda-visao-semanal` (indicador "21/45 · 47%" no rodapé da grade). Se cada uma calculasse
por conta própria, os números divergiriam entre a tela de relatórios e a tela de agenda — o
mesmo risco que o ADR-0008 já havia evitado para as regras de agendamento.

## Decisão
1. `packages/core/src/agenda/capacity.ts` expõe duas funções puras/orquestradoras:
   `computeCapacity(barbershopId, fromDate, toDate, barberId?)` — total de slots de
   `slot_step_min` minutos dentro da grade de trabalho, menos exceções (folga/bloqueio),
   **sem** subtrair agendamentos; e `computeOccupancy(barbershopId, fromDate, toDate,
   barberId?)` — `{ occupied, capacity }`, onde `occupied` é a contagem de agendamentos com
   status `confirmado`/`concluido`/`faltou` no período.
2. Ambas reusam os primitivos puros já existentes de `agenda/availability.ts`
   (`resolveOpenWindows`, `generateSlots`) — nenhuma lógica de enumeração de slots é duplicada.
3. Qualquer capability que precise de "ocupação da agenda" (hoje: `relatorios` e
   `add-agenda-visao-semanal`; no futuro, outras) chama esta função. Nenhuma reimplementa o
   cálculo.

## Justificativa
"Ocupação" é um número que dois lugares diferentes da UI mostram ao mesmo barbeiro. Se
divergirem, a credibilidade do produto cai (o barbeiro vê "47%" num lugar e outro valor no
outro). Uma função única, testada isoladamente, elimina esse risco por construção.

## Vantagens
- Um só lugar testado para o cálculo de ocupação; `relatorios` e a grade semanal nunca
  divergem.
- Reuso dos primitivos de `availability.ts` — zero duplicação da enumeração de slots (grade −
  exceções).
- `add-agenda-visao-semanal` não precisa recalcular nada, só consumir.

## Desvantagens / Trade-offs
- **Ocupação é uma aproximação por contagem de slot**, não por minuto exato: um serviço de
  90min conta como "1 agendamento ocupado", não "3 slots de 30min". Suficiente para a leitura
  de "cheia/vazia" que o produto precisa hoje; documentado como limitação conhecida.
- `capacity.ts` depende de `packages/db` (mesma dependência unidirecional já aceita pelo
  ADR-0008).

## Custo
Zero incremental — mesmo pacote, mesmo runtime, sem serviço novo.

## Escalabilidade
Se a precisão por minuto for necessária no futuro, a evolução acontece dentro de
`computeCapacity`/`computeOccupancy` sem mudar a interface pública nem os consumidores.

## Alternativas consideradas
- **Cada change calcula a sua própria ocupação**: risco de divergência entre telas —
  rejeitado.
- **Ocupação por minuto exato desde já**: mais preciso, mas a UI de referência da grade semanal
  já comunica em unidades discretas de horário; precisão por minuto é complexidade sem ganho
  percebido nesta fase — adiado (ver Escalabilidade).

## Consequências
- `packages/core/src/agenda/capacity.ts` nasce na change `add-relatorios`.
- `add-agenda-visao-semanal` consome esta função; se implementada antes de `add-relatorios`
  concluir, deve fatorar a mesma função localmente seguindo esta decisão (ver nota na tarefa
  0.1 do `tasks.md` daquela change) — a fonte única prevalece independentemente da ordem de
  entrega.
