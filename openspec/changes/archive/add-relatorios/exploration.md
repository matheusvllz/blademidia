# Exploração Crítica — Relatórios (Produto — Fase 3)

## Change ID
`add-relatorios`

## Ideia original

> Registrada por Vítor em 2026-07-15.

Construir a **Fase 3 do produto**: a capability `relatorios`, prevista no roadmap desde a
Fase 1 (`add-crm-clientes`) como "o relatório mensal que justifica a mensalidade" — clientes
reativados, no-shows evitados, R$ recuperado (ver `docs/business/contexto-negocio.md`, seção
"Relatório mensal").

## Contexto

O produto já entregou:

- **Fase 1 (`add-crm-clientes`, 2026-07-07)**: CRM de clientes, histórico de atendimentos
  (`visits`), registro financeiro por visita (`payments_log`), dashboard com ativos/inativos/
  ticket médio, detecção de inatividade configurável.
- **Fase 2 (`add-agendamento`, 2026-07-15)**: agenda operável (serviços, barbeiros, grade,
  disponibilidade, agendamentos com ciclo de vida completo incluindo `faltou`), camada de
  domínio `AgendaService`, **worker + pg-boss já rodando** (job real de no-show + esqueletos
  de confirmação/reativação que só logam), esqueleto de `packages/ai`.

O roadmap registrado na exploração da Fase 1 define a **Fase 3 = `relatorios`**
(`add-crm-clientes/exploration.md:317-321`). Esta exploração a realiza.

## Problema real

O produto acumula dados de valor (atendimentos, faturamento registrado, agendamentos, faltas,
catálogo) mas **não os transforma em leitura de resultado**. Dois problemas distintos:

1. **Gestão para o barbeiro** — o barbeiro-dono não tem como responder "quanto faturei este
   mês?", "quantos clientes atendi?", "qual meu índice de faltas?", "qual serviço rende mais?",
   "estou melhor ou pior que mês passado?". O dashboard atual (Fase 1/2) mostra o *agora*
   (ativos, inativos, agenda de hoje), não a *leitura do período*.
2. **Justificativa da mensalidade para a Blade** — a promessa comercial é um **relatório
   mensal de resultados** que sustente os R$697/mês na hora da renovação. Sem essa peça, a
   retenção do cliente da Blade fica sem prova numérica.

## O achado crítico (regra de parada avaliada)

O "relatório mensal" prometido no briefing (`contexto-negocio.md:44-50`) tem **4 métricas**:

| # | Métrica prometida | Fonte de dado necessária | Viável na Fase 3? |
|---|---|---|---|
| 1 | X clientes reativados **automaticamente** | Campanha de reativação via WhatsApp + rastreio de retorno | ❌ Fase 5 |
| 2 | Y no-shows **evitados por confirmação** | Confirmação automática 24h + causalidade (confirmou→veio) | ❌ Fase 5 |
| 3 | Z mensagens respondidas pelo bot | Bot de IA no canal WhatsApp | ❌ Fase 5 |
| 4 | R$ estimado recuperado | Derivado de (1) e (2) × ticket médio | ❌ depende de 1 e 2 |

**Conclusão:** as 4 métricas centrais do relatório *comercial* dependem estruturalmente da
**Fase 5** (`whatsapp-canal` + `atendimento-ia` + `confirmacao-agendamento` +
`reativacao-clientes`), que ainda não existe — hoje o worker só tem *esqueletos* que logam,
sem enviar nada. A própria exploração da Fase 2 já registrou isso
(`add-agendamento/exploration.md:55-56`). Entregar o relatório comercial completo na Fase 3
isolada é **impossível sem inventar dado**.

Isso foi levado a Vítor como decisão bloqueante (ver "Decisões da discussão"). A saída
acordada: a Fase 3 entrega o que os dados de hoje **realmente sustentam** (relatórios
operacionais) e deixa a **fundação de agregação/snapshot** pronta para as métricas de
mensageria da Fase 5 se plugarem sem retrabalho — a mesma estratégia com que a Fase 2 preparou
a fronteira do bot sem implementá-lo.

## O que os dados de hoje SUSTENTAM (inventário verificado contra o schema)

Fontes: `visits`, `payments_log`, `appointments`, `clients`, `barbers`, `services`,
`work_schedules` (para capacidade).

**Métricas viáveis agora (todas escopadas por `barbershop_id`, num intervalo de datas):**

- **Faturamento do período** — soma de `payments_log.amount_cents` por `paid_at`.
- **Atendimentos realizados** — contagem de `visits` por `occurred_at`.
- **Ticket médio** — faturamento ÷ atendimentos com valor informado.
- **Clientes novos** — `clients.created_at` no período.
- **Clientes atendidos / retornantes** — distintos em `visits`.
- **Ocupação da agenda** — agendamentos concluídos vs. capacidade da grade (ex.: "21/45 ·
  47%"), derivável do motor de disponibilidade (`AgendaService`) + `work_schedules`.
- **Faltas ocorridas (no-show real)** — `appointments.status = 'faltou'` ÷ total no período;
  e taxa de comparecimento.
- **Cancelamentos** — `appointments.status = 'cancelado'`.
- **Ranking de serviços** — por volume e por receita (via `visits.service_id` +
  `payments_log`).
- **Produção por barbeiro** — atendimentos e receita por `barber_id`.
- **Distribuição por forma de pagamento** — `payments_log.method`.
- **Comparação com o período anterior** — mesma janela deslocada (ex.: faturamento +12%).

> **Distinção honesta:** estas são métricas **operacionais** (o que aconteceu na barbearia).
> Elas **não são** as métricas *causais* do relatório comercial ("quanto o SISTEMA recuperou
> pra você"), que exigem mensageria automática (Fase 5). O relatório da Fase 3 é uma leitura
> de negócio real e útil — mas não deve ser vendido como "prova do valor do bot", porque o bot
> ainda não existe.

## Métricas que DEPENDEM da Fase 5 (fora do escopo desta change)

Reativados automaticamente · no-shows evitados por confirmação · mensagens do bot · R$
recuperado causal. A Fase 3 deixa **lugar reservado** para elas na estrutura de snapshot, sem
exibi-las como número real (nem como zero enganoso) até a Fase 5 alimentar.

## Atores / usuários impactados

- **Barbeiro-dono** — abre os relatórios no painel para gerir o próprio negócio (usuário
  primário da tela).
- **Operador Blade (Vítor/Matheus)** — usa o resumo apresentável / PDF como peça de retenção
  na renovação. (Nesta fase acessa a mesma tela do tenant; acesso multi-tenant de operador é
  de `auth-tenancy`, fora daqui.)
- **Worker (sistema)** — gera o snapshot mensal por cron (pg-boss já existe).
- **Bot de IA / canal WhatsApp (futuro)** — consumidores do snapshot na Fase 5 (envio
  automático + métricas causais).
- **Cliente final** — não é usuário; aparece apenas como agregado anonimizável (LGPD).

## Casos de uso principais

1. Barbeiro abre "Relatórios", escolhe um período (mês atual, mês passado, intervalo livre) e
   vê faturamento, atendimentos, ticket médio, ocupação, faltas, rankings e a variação vs. o
   período anterior.
2. Barbeiro/Blade gera um **PDF apresentável** do resumo do período com identidade Blade.
3. O worker fecha o mês automaticamente e **persiste um snapshot** dos agregados daquele mês
   por barbearia (base para o envio automático da Fase 5 e para histórico consultável).
4. Barbearia nova / período sem dados → estado vazio explícito, sem métrica quebrada.
5. Exclusão LGPD de um cliente não quebra relatórios já fechados (agregados preservados
   anonimizados).

## Regras de negócio

- Todo relatório é escopado por `barbershop_id` via camada de repositório (ADR-0007), com
  teste de isolamento.
- Fuso **America/Sao_Paulo** define as fronteiras de "dia"/"mês" do período (consistente com a
  Fase 2); armazenamento em `timestamptz`.
- Faturamento = o que está **registrado** em `payments_log`; o relatório é tão completo quanto
  o registro (ver Risco de qualidade de dado).
- Nenhum provedor externo é chamado nesta fase; nenhum envio automático (acoplado à Fase 5 por
  decisão de Vítor).
- UI no vocabulário do barbeiro: "faturamento", "atendimentos", "faltas", "ocupação" — proibido
  "churn", "no-show", "conversão", "funil".
- Métricas dependentes da Fase 5 SHALL NOT ser exibidas como número real nem como zero
  enganoso enquanto a fonte não existir.

## Riscos e mitigações

| Risco | Tipo | Impacto | Prob. | Mitigação |
|---|---|---|---|---|
| Relatório operacional ser confundido com a "prova do valor do bot" (que é Fase 5) | Produto/comercial | Alto | Média | Copy e exploração deixam a distinção explícita; snapshot separa métricas operacionais de causais; peça da Blade não afirma causalidade que não mede |
| Faturamento subestimado porque o barbeiro não registra o valor pago | Dados | Alto | Alta | Relatório sinaliza "N atendimentos sem valor informado"; não apresenta como faturamento total absoluto sem essa ressalva |
| Cálculo de ocupação errado (capacidade da grade, fuso, exceções) | Correção | Médio | Média | Reusar `AgendaService`/motor de disponibilidade da Fase 2; testes de unidade sobre a capacidade |
| Query de agregação pesada em intervalo grande | Performance | Baixo | Baixa | Volume pequeno por tenant; snapshot mensal materializa o mês fechado; índices por período |
| PDF acoplar dependência pesada/custosa (fora de D4) | Custo/infra | Médio | Média | Escolher geração leve (HTML→PDF já no runtime do worker/web), decidir no design; sem serviço externo pago |
| Divergência entre "faturamento" (payments_log) e realidade de caixa da barbearia | Produto | Médio | Média | Deixar claro que é "faturamento registrado no sistema", não fechamento contábil |

## Premissas

- Faturamento e ticket médio derivam de `payments_log` (registro), como na Fase 1 — não há
  fonte fiscal/contábil integrada.
- Volume por barbearia é pequeno → agregação sob demanda para consulta interativa; snapshot só
  para o mês fechado (histórico + base da Fase 5).
- Stack segue as ADRs vigentes; worker/pg-boss da Fase 2 hospeda o job de snapshot.
- "Período anterior" para comparação = janela de mesmo tamanho imediatamente anterior.

## Pontos em aberto (não bloqueiam esta fase; refinar no design ou depois)

- Definição fina de "ocupação": capacidade = soma dos blocos da grade no período, ou meta
  configurável? → design, com padrão = blocos da grade.
- Granularidade de receita por serviço quando um atendimento tem valor único (sem itemização):
  atribuir ao serviço da `visit`. Suficiente para v1.
- Retenção do snapshot histórico (quantos meses guardar) → operacional, decidir no design.
- Acesso do operador Blade cross-tenant à peça de retenção → pertence a `auth-tenancy`, não a
  esta change.

## Decisões da discussão (portão etapa 3 — respondidas por Vítor em 2026-07-15)

1. **Alvo da Fase 3** → *Operacional + fundação p/ Fase 5*. Entregar os relatórios que os
   dados de hoje sustentam e deixar a arquitetura de agregação/snapshot pronta para as métricas
   de mensageria da Fase 5, sem prometê-las agora.
2. **Público** → *Ambos, dos mesmos dados*: visão de gestão no painel (barbeiro) + resumo
   apresentável (Blade), partindo da mesma camada de agregação.
3. **Entrega** → *Tela + envio automático*, com o refinamento seguinte:
4. **Canal do envio automático** → *Acoplar à Fase 5 (só WhatsApp)*. A Fase 3 **não** integra
   canal nenhum; entrega a tela + o PDF + a **fundação de snapshot** pronta para ser enviada
   quando a Fase 5 existir. Envio automático **não é entregável da Fase 3**.
5. **PDF** → *Sim, tela + PDF apresentável* (peça de retenção da Blade, independente de canal).
6. **Período** → *Intervalo livre + presets* (mês atual, mês passado, semana, trimestre, e
   intervalo custom).

## Fronteiras com outras capabilities

- **`crm-clientes`** — fonte de `clients`/`visits`/`payments_log`; o relatório *lê*, não altera
  o comportamento do CRM. Exclusão LGPD (já especificada lá) deve preservar agregados — esta
  change apenas depende dessa garantia, não a redefine.
- **`agendamento`** — fonte de `appointments`/faltas/ocupação; reusa `AgendaService`/motor de
  disponibilidade para capacidade. Sem mudança de comportamento da agenda.
- **`whatsapp-canal` / `atendimento-ia` / `confirmacao-agendamento` / `reativacao-clientes`
  (Fase 5)** — consumidoras futuras do snapshot; preenchem as métricas causais e fazem o envio
  automático. Esta change prepara o lugar, não as implementa.

## Escopo desta change / Non-Goals

**In scope:** capability `relatorios` — agregações operacionais por período, tela de relatórios
no painel, resumo apresentável, exportação PDF, snapshot mensal persistido gerado por job cron
no worker, isolamento de tenant, tratamento LGPD de agregados.

**Non-Goals:** métricas causais da Fase 5 (reativados/no-show evitado/mensagens do bot/R$
recuperado); qualquer envio automático ou integração de canal; qualquer chamada externa;
fechamento contábil/fiscal; dashboards configuráveis pelo usuário; exportação além de PDF
(CSV/Excel fica para depois se fizer falta).
