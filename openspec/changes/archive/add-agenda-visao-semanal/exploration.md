# Exploração Crítica — Agenda: visão semanal em grade

## Change ID
`add-agenda-visao-semanal`

## Ideia original

> Registrada por Vítor em 2026-07-15 (com referência visual — uma grade semanal estilo
> planner: colunas = dias, linhas = horários, cards de agendamento por célula, indicador de
> ocupação no rodapé "21/45 · 47% cheia" e navegação de semana ‹ ›).

Evoluir a **capability `agendamento`** (Fase 2, concluída) com uma **visão semanal em grade**:
os dias da semana como colunas, os horários como linhas, cada agendamento como um card
(cliente + serviço) na célula, e um indicador de ocupação da semana no rodapé.

## Contexto

A Fase 2 (`add-agendamento`) estabeleceu a agenda com o requisito "Visão da agenda"
(`openspec/specs/agendamento/spec.md:226`): "exibir a agenda por dia e por semana, organizada
por barbeiro". A visão semanal **já existe** conceitualmente — esta change **não cria** a
semana do zero; ela adiciona um **layout alternativo** (grade dias×horários, consolidável por
todos os barbeiros) e torna a grade um ponto de ação. Toda a fundação de domínio existe:
`AgendaService`, motor de disponibilidade, `appointments` com ciclo de vida, grade de trabalho
(`work_schedules`) e exceções.

## Problema real

A visão atual (por barbeiro) responde "o que este barbeiro tem?", mas não dá a leitura rápida
que o barbeiro-dono quer bater o olho e entender: **"como está minha semana? tá cheia ou tem
buraco?"**. Uma grade dias×horários com ocupação agregada comunica isso de imediato — e, se for
clicável, vira o ponto natural para preencher os buracos (criar agendamento no horário vazio)
sem navegar por outra tela.

## Atores / usuários impactados

- **Barbeiro-dono** — usuário primário: lê a semana e age sobre ela.
- **Barbeiro (recurso)** — filtrável na visão (modo "um barbeiro"); não acessa o sistema.
- **AgendaService (domínio)** — fonte única das leituras/escritas; nenhuma escrita paralela.

## Casos de uso principais

1. Barbeiro abre a agenda na visão semanal em grade e vê a semana inteira (dias × horários) com
   os agendamentos posicionados e a ocupação da semana no rodapé.
2. Alterna a grade entre **todos os barbeiros** (consolidado) e **um barbeiro** (com seletor).
3. Navega para a semana anterior/seguinte (‹ ›).
4. Clica numa **célula vazia** → inicia a criação de um agendamento já com o dia/horário
   preenchidos.
5. Clica num **card existente** → abre o agendamento (detalhe/ações da Fase 2).
6. Semana sem agendamentos → grade vazia explícita com a ocupação zerada, sem erro.

## Decisões da discussão (portão etapa 3 — respondidas por Vítor em 2026-07-15)

1. **Célula com múltiplos barbeiros** → *Ambas, com botão de alternar*: a grade alterna entre
   consolidada (todos os barbeiros, cards empilhados na célula) e um barbeiro por vez (com
   seletor).
2. **Relação com a visão atual** → *Adiciona como visão alternativa*: a grade convive com as
   visões existentes (dia e semana por barbeiro); o usuário escolhe.
3. **Interação** → *Interativa*: clicar célula vazia cria agendamento naquele horário; clicar
   card abre o agendamento.

## Regras de negócio

- Escopo por `barbershop_id` em toda leitura/ação (ADR-0007); a grade nunca mistura tenants.
- Fuso America/Sao_Paulo define o início/fim de cada dia e da semana exibida (consistente com a
  Fase 2).
- A criação a partir da célula reusa **integralmente** as regras da Fase 2 (disponibilidade,
  sem sobreposição, grade, passado, associação barbeiro–serviço) — a grade é só o ponto de
  entrada; nenhuma regra de agendamento nova é criada aqui.
- No modo consolidado, a célula pode conter mais de um agendamento (um por barbeiro); a
  ocupação agrega todos os barbeiros exibidos.
- **Ocupação = mesma definição da capability `relatorios`** (Fase 3): agendamentos atendidos/
  ativos sobre a capacidade da grade no período. As duas changes SHALL compartilhar uma única
  função de cálculo no `core`, para não divergirem. Ver fronteira abaixo.

## Riscos e mitigações

| Risco | Tipo | Impacto | Prob. | Mitigação |
|---|---|---|---|---|
| Criar agendamento no modo "todos os barbeiros" sem barbeiro definido | UX/correção | Médio | Alta | Ao clicar célula vazia no modo consolidado, exigir a escolha do barbeiro antes de gravar (ou permitir criar só no modo "um barbeiro") — decidir no design |
| Definição de ocupação divergir da usada em `relatorios` | Consistência | Médio | Média | Função única de capacidade/ocupação no `core`, consumida pelas duas changes |
| Grade pesada com muitos barbeiros/horários (render) | Performance | Baixo | Baixa | Volume pequeno por tenant; render por faixa de horário derivada da grade |
| Faixa de dias/horas exibida não bater com a realidade (ex.: sábado) | Produto | Médio | Média | Derivar dias/horas da grade de trabalho configurada, não fixo seg–sex (ver ponto em aberto) |
| Duplicar lógica de leitura da agenda em vez de reusar `AgendaService` | Arquitetura | Médio | Média | Nova visão consome a mesma camada de domínio; sem query paralela |

## Premissas

- A grade exibe os **dias com expediente** configurado na barbearia (tipicamente inclui
  sábado); domingo aparece se houver grade. Não fixa segunda–sexta.
- A faixa de horários (linhas) deriva do menor início e maior fim da grade de trabalho no
  período; passo conforme configuração da agenda (Fase 2).
- Nenhuma tabela nova; nenhuma mudança de dados. Change predominantemente de `apps/web`
  (+ possivelmente uma leitura agregada no `core`).

## Pontos em aberto (não bloqueiam; refinar no design)

- Criar no modo consolidado: exigir escolha de barbeiro no clique, ou habilitar criação só no
  modo "um barbeiro"? → design, recomendação = pedir o barbeiro no ato.
- Semana exibida: seg–sáb, seg–dom, ou dinâmica pela grade? → design, recomendação = dinâmica
  pela grade.
- Densidade visual quando muitos agendamentos caem na mesma célula (consolidado) → design.

## Fronteiras com outras capabilities

- **`agendamento`** — esta change MODIFICA o requisito "Visão da agenda" e ADICIONA
  ocupação/ação na grade. Reusa todo o comportamento de criação/detalhe da Fase 2 sem alterá-lo.
- **`relatorios` (Fase 3, change `add-relatorios`)** — compartilha a **definição de ocupação/
  capacidade**. Ordem de implementação sugerida: a função de capacidade nasce em uma das duas e
  a outra consome; registrar em ambas para evitar divergência. Não há dependência de escopo
  bloqueante — as changes podem ser aprovadas independentemente.

## Escopo desta change / Non-Goals

**In scope:** visão semanal em grade (dias×horários) como opção adicional; toggle todos/um
barbeiro; navegação de semana; ocupação da semana no rodapé; clicar-para-criar e clicar-para-
abrir reusando o fluxo da Fase 2.

**Non-Goals:** qualquer regra de agendamento nova; auto-agendamento pelo cliente final (Fase 5);
arrastar-e-soltar para remarcar (evolução futura, se pedido); mudança nas visões de dia e de
semana-por-barbeiro já existentes; nova tabela ou migração de dados.
