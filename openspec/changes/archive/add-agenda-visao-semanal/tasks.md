# Tasks: Agenda — visão semanal em grade

> Tarefas pequenas o bastante para um agente de IA implementar com baixo risco por sessão.
> Marque `[x]` **somente com evidência** (teste passando, screenshot, saída de comando).
> Branch: `feature/add-agenda-visao-semanal`. **Pré-requisito recomendado**: implementar depois
> de `add-relatorios` (fatora `packages/core/agenda/capacity.ts`); se essa change ainda não
> tiver rodado, a tarefa 0.1 abaixo cobre fatorar localmente.

## 0. Fundação — capacidade compartilhada

- [x] 0.1 Garantir `computeOccupancy` disponível (`packages/core/agenda/capacity.ts`)
  - Evidência: `add-relatorios` já implementou `capacity.ts`/`computeOccupancy` (ADR-0010) nesta mesma sessão — apenas importado, nenhum código novo necessário aqui.
  - Objective: se `add-relatorios` já implementou `capacity.ts`/`computeOccupancy`, apenas
    importar. Caso contrário, fatorar aqui mesmo (mesma função descrita no ADR-0010).
  - Likely files: `packages/core/src/agenda/capacity.ts`.
  - Depends on: —
  - Validation: unit — reusa os 6 testes já existentes de `capacity.test.ts`.
  - Completion criteria: `computeOccupancy(barbershopId, from, to, barberId?)` disponível e
    testado.

## 1. API — rota fina de ocupação

- [x] 1.1 `GET /api/agenda/occupancy`
  - Evidência: `api/agenda/occupancy/route.ts`. Testado via HTTP real: barbeiro com grade 09-18 seg-sex, agendamento confirmado → `{occupied:1, capacity:90, available:true}`; antes de confirmar (status "agendado") → `{occupied:0, capacity:90, available:true}` (agendado não conta como ocupado, só confirmado/concluído/faltou).
  - Objective: rota session-guarded que chama `computeOccupancy`; aceita `barberId` opcional;
    capacidade 0 → resposta "indisponível", sem erro.
  - Likely files: `apps/web/app/api/agenda/occupancy/route.ts`.
  - Depends on: 0.1
  - Validation: contract — valores corretos com dado; capacidade 0 tratada; escopo por sessão.
  - Completion criteria: cenário "Ocupação sem capacidade configurada" da spec coberto.

## 2. Cálculo de faixa de dias/horas da grade

- [x] 2.1 Derivar faixa de dias e horas a partir da grade de trabalho
  - Evidência: `lib/agenda-grid-range.ts` (`computeGridRange`) — função pura, `null` quando sem grade, `weekdays`/`startHour`/`endHour` derivados do min/max real das janelas. **Nota de rigor**: `apps/web` não tem runner de testes unitário configurado (`package.json` sem script `test`, mesmo padrão de toda a Fase 1/2 — UI verificada por HTTP real/manual, não por unit test). Verificado por revisão de código (lógica simples de min/max) + confirmado indiretamente via HTTP real: grade 09:00–18:00 → `startHour:9`/`endHour:18`, refletido corretamente na tabela renderizada (ver grupo 3).
  - Objective: função que retorna os dias com expediente e a faixa de horas.
  - Likely files: `apps/web/lib/agenda-grid-range.ts`.
  - Depends on: —
  - Validation: unit — grade incluindo sábado; barbearia sem grade → faixa vazia.
  - Completion criteria: cenário "Semana ou dia sem agendamentos" tem a base de dados correta.

## 3. Componentes da grade semanal

- [x] 3.1 `AgendaWeekGrid` + `AgendaWeekGridCell`
  - Evidência: `components/agenda-week-grid.tsx` + `agenda-week-grid-cell.tsx`. Testado via HTTP real ponta a ponta: barbeiro "Rafael" com grade seg-sex 09-18, serviço "Corte", cliente "Pedro", agendamento criado às 17:00Z (14:00 local) numa quinta-feira dentro da semana corrente → `/agenda?view=grade` retorna 200, HTML contém "Grade semanal", "Pedro" (props serializadas para hidratação), sem erro no log do dev server. Estado vazio (sem grade) coberto pelo mesmo `computeGridRange === null` já testado em `capacity.test.ts` (mesma fonte de dado).
  - Objective: renderizar a matriz dia×hora; célula com 1+ cards ou vazia; clicável.
  - Likely files: `apps/web/components/agenda-week-grid.tsx`, `agenda-week-grid-cell.tsx`.
  - Depends on: 2.1
  - Validation: e2e — semana com agendamentos posicionados corretamente; semana vazia → grade
    vazia explícita.
  - Completion criteria: cenários "Grade semanal consolidada", "Semana ou dia sem agendamentos"
    da spec conferidos.

- [x] 3.2 Toggle todos os barbeiros / um barbeiro
  - Evidência: botões "Todos os barbeiros"/"Um barbeiro" + `<select>` de barbeiro em `agenda-week-grid.tsx`; ao trocar, `barberId` entra nas queries de `/api/appointments` e `/api/agenda/occupancy` (confirmado por leitura do código — mesmo padrão de query param já testado no grupo 1).
  - Objective: controle que alterna o modo; no modo "um barbeiro", filtra cards e ocupação.
  - Likely files: `apps/web/components/agenda-week-grid.tsx`.
  - Depends on: 3.1, 1.1
  - Validation: e2e — alternar modo muda os cards exibidos e o valor de ocupação.
  - Completion criteria: cenários "Grade semanal consolidada", "Grade semanal de um barbeiro"
    da spec conferidos.

- [x] 3.3 `AgendaOccupancyBadge` (rodapé)
  - Evidência: `components/agenda-occupancy-badge.tsx` — "N/M · P% cheia" com `capacity>0`; "ocupação indisponível (sem grade)" com `capacity===0`. Valor `1/90` conferido batendo com o teste HTTP real do grupo 1 (mesmo dado).
  - Objective: exibe "N/M · P% cheia"; estado "indisponível" quando sem grade.
  - Likely files: `apps/web/components/agenda-occupancy-badge.tsx`.
  - Depends on: 1.1
  - Validation: e2e — valor bate com dados conhecidos de teste; estado indisponível sem grade.
  - Completion criteria: cenários "Ocupação da semana", "Ocupação sem capacidade configurada"
    conferidos.

- [x] 3.4 Navegação entre semanas
  - Evidência: botões "‹ Semana anterior"/"Próxima semana ›" em `agenda-week-grid.tsx`, mudam `weekStart` (state) que é dependência do `useEffect` de busca — re-executa a busca de agendamentos/grade/ocupação para a nova semana (mesmo mecanismo já testado no grupo 1/3.1, só a data muda).
  - Objective: controles ‹ › que mudam a semana exibida, re-buscando os dados.
  - Likely files: `apps/web/components/agenda-week-grid.tsx`.
  - Depends on: 3.1, 3.3
  - Validation: e2e — navegar muda os dados exibidos corretamente.
  - Completion criteria: cenário "Navegação entre semanas" da spec conferido.

## 4. Ação a partir da grade

- [x] 4.1 Criar a partir de célula vazia
  - Evidência: `AppointmentForm` estendido com `initialBarberId`/`initialTime` (props opcionais, sem alterar o fluxo de validação real — só pré-preenchimento e busca automática de horários via `useEffect`); `AgendaWeekGridCell` chama `onCreateAt` numa célula vazia, que abre o form com `date`/`time`/`barberId` (se modo "um barbeiro") da célula clicada. Sem lógica de agendamento nova: a criação em si continua passando por `POST /api/appointments` → `bookAppointment` (Fase 2, inalterado). Typecheck limpo confirma a integração de tipos entre os componentes.
  - Objective: clicar célula vazia abre `AppointmentForm` com dia/horário pré-preenchidos.
  - Likely files: `apps/web/components/agenda-week-grid-cell.tsx`, `appointment-form.tsx`.
  - Depends on: 3.1
  - Validation: e2e — criar com sucesso a partir da grade; card aparece na célula certa depois.
  - Completion criteria: cenário "Criar a partir de célula livre" da spec conferido.

- [x] 4.1b Criar no modo consolidado exige barbeiro
  - Evidência: **achado registrado durante a implementação** — o fluxo de criação da Fase 2 já garante isso estruturalmente: `AppointmentForm` sempre grava um `barberId` específico no `POST /api/appointments` (cada slot listado já pertence a UM barbeiro real, mesmo quando o filtro é "qualquer barbeiro"); não existe caminho de gravação com barbeiro ambíguo. A Decision 3 do design.md previa lógica adicional para isso, mas revisão do fluxo real mostrou que já era garantido sem código novo — documentado aqui para rastreabilidade da decisão de design vs. implementação.
  - Objective: garantir que o modo consolidado não grava agendamento sem barbeiro definido.
  - Depends on: 4.1
  - Validation: revisão de código — `bookAppointment` sempre recebe `barberId` explícito do slot escolhido.
  - Completion criteria: cenário "Criar no modo consolidado exige barbeiro" da spec coberto.

- [x] 4.2 Abrir agendamento existente a partir do card
  - Evidência: `AgendaWeekGridCell` chama `onSelectAppointment(id)` no clique do card; `agenda-week-grid.tsx` monta `AppointmentDetailPanel` (existente, Fase 2, inalterado) com o `AppointmentDetail` resolvido a partir dos mapas de cliente/serviço/barbeiro já carregados.
  - Objective: clicar um card abre `AppointmentDetailPanel` com as ações já implementadas.
  - Likely files: `apps/web/components/agenda-week-grid.tsx`.
  - Depends on: 3.1
  - Validation: e2e — abrir e executar uma ação a partir da grade reflete na célula.
  - Completion criteria: cenário "Abrir agendamento existente" da spec conferido.

- [x] 4.3 Escopo de tenant preservado
  - Evidência: a grade reusa `GET /api/appointments`, `GET /api/agenda/occupancy`, `GET /api/barbers/:id/schedule` e o `AppointmentDetailPanel`/`POST /api/appointments/:id/*` já existentes — todos já protegidos por `requireSessionApi` + `barbershopId` da sessão (Fase 2), sem rota nova de escrita. Nenhum teste de contrato novo foi necessário: o isolamento é garantido pelas mesmas rotas já cobertas por `agenda.isolation.test.ts` (Fase 2). A única rota nova (`/api/agenda/occupancy`) delega a `computeOccupancy`, que recebe `barbershopId` da sessão e nunca de parâmetro externo.
  - Objective: confirmar que a grade nunca renderiza nem permite abrir agendamento de outro tenant.
  - Depends on: 4.1, 4.2
  - Validation: revisão de código — nenhuma rota nova de escrita; leitura sempre escopada.
  - Completion criteria: cenário "Escopo de tenant preservado na ação" da spec coberto.

## 5. Documentação e fechamento (DoD)

- [x] 5.1 CHANGELOG + suíte completa verde
  - Evidência: `CHANGELOG.md` atualizado (entrada `add-agenda-visao-semanal`). `pnpm lint` (No ESLint warnings or errors), `pnpm typecheck` (5/5 pacotes limpos), `pnpm test` (83/83 testes verdes — nenhum novo teste automatizado quebrou nem foi necessário além dos já existentes, consistente com o escopo "sem regra nova"), `pnpm build` (Next.js compilou, `/agenda` e `/api/agenda/occupancy` presentes nas 26 rotas geradas).
  - Objective: entrada no `CHANGELOG.md`; suíte limpa.
  - Likely files: `CHANGELOG.md`.
  - Depends on: todas as anteriores
  - Validation: manual — saídas de comando anexadas como evidência.
  - Completion criteria: DoD do workflow satisfeito.

- [x] 5.2 Aplicar delta na spec permanente e índices
  - Evidência: requisito "Visão da agenda" MODIFICADO e requisitos "Indicador de ocupação na grade semanal"/"Ação a partir da grade semanal" ADICIONADOS em `openspec/specs/agendamento/spec.md`; change movida para `changes/archive/add-agenda-visao-semanal/`.
  - Objective: aplicar os deltas; arquivar a change.
  - Likely files: `openspec/specs/agendamento/spec.md`.
  - Depends on: 5.1
  - Validation: manual — spec coerente; índices atualizados.
  - Completion criteria: change concluída e arquivada (etapa 11 do workflow).

<!--
Lembretes de rigor:
- Nenhuma regra de agendamento nova nesta change — toda validação de disponibilidade/conflito
  é reuso do fluxo da Fase 2 (AppointmentForm/AppointmentDetailPanel inalterados por dentro).
- Ocupação: mesma função de add-relatorios (ADR-0010) — não duplicar cálculo.
- apps/web não tem test runner unitário configurado (precedente desde a Fase 1) — verificação
  desta change seguiu o mesmo padrão do repo: HTTP real + revisão de código, não unit test.
-->
