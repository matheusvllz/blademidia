# Exploração Crítica: Agenda Integrada (Produto — Fase 2)

> Etapas 1-3 do fluxo (Ideia → Refinamento → Discussão). Esta change entrega a **Fase 2**
> do roadmap do produto, mapeada na exploração de `add-crm-clientes`
> ([archive/add-crm-clientes/exploration.md](../archive/add-crm-clientes/exploration.md),
> seção "Roadmap de fases"): capability nova `agendamento` + evolução de `crm-clientes` +
> a fundação técnica que as fases seguintes (mensageria/IA) vão consumir.

## Ideia original

Evoluir o produto — hoje um CRM básico (Fase 1) — para uma plataforma de gestão
operacional muito mais robusta e profissional, cujo núcleo desta fase é uma **agenda
completa** de clientes e agendamentos. A arquitetura deve ficar **preparada para o bot de
IA** do projeto (sem necessariamente implementá-lo agora), evoluir o CRM para suportar os
novos módulos, manter integralmente a identidade visual da Blade Mídia e sustentar as
próximas fases. Planejamento apenas — nenhuma implementação antes da aprovação.

## Entendimento atual

Isto é a capability `agendamento`, já registrada como candidata em
[openspec/specs/README.md](../../specs/README.md) ("Fase 2 do roadmap do CRM") e antecipada
no código: o comentário em [packages/db/src/schema/visits.ts](../../../packages/db/src/schema/visits.ts)
declara que "`agendamento` (Fase 2) introduz entidades próprias de serviço e barbeiro; esta
tabela ganha as FKs correspondentes quando ela existir". O preset operacional
[automation/presets/barbearia-default.json](../../../automation/presets/barbearia-default.json)
já modela `servicos[]` (com `duracao_min`), `barbeiros[]` e `horario_funcionamento` — a
Fase 2 traz esses conceitos para o produto como dados de primeira classe.

**Fato (project.md):** este é o **produto SaaS**, não a operação da agência. A agenda do
produto é a fonte da verdade do produto; o preset da automação continua sendo cópia própria
do tooling interno. São sistemas distintos (ver `add-crm-clientes` para a mesma fronteira).

**Fato (conventions.md):** na UI o barbeiro vê "Agenda", "horário", "agendamento",
"cliente" — nunca "booking", "slot", "lead", "funil", "CRM", "conversão".

**Sobre "o bot de IA que já existe":** hoje o único bot é o motor **determinístico** da
agência ([automation/lib/engine.mjs](../../../automation/lib/engine.mjs), sem LLM, tooling
operacional). O bot de IA do **produto** (`atendimento-ia`, D3/ADR-0005, com Claude API +
*tool use*) é Fase 5 e ainda não existe. Portanto "preparar a estrutura para o bot" nesta
change = **expor a lógica de agenda como camada de domínio tenant-scoped** (disponibilidade,
criar/remarcar/cancelar) que as *tools* da IA plugam depois — não implementar conversa nem
WhatsApp agora.

## Problema real

Comprovado por `project.md` e `docs/business/contexto-negocio.md`: o gargalo do ICP (Rafael)
é operacional — cliente que não recebe resposta, que não agenda, que agenda e não aparece
(no-show), que some e não é recontatado. A Fase 1 organizou **quem é o cliente e o histórico
passado**; falta o **presente e o futuro**: quando cada cliente vem, com qual barbeiro, qual
serviço, quanto dura, o que está livre. Sem agenda estruturada:

- não há como o produto oferecer "confirmação 24h antes" nem "reativação" de verdade (Fase 5
  precisa do dado que a agenda produz);
- o "próximo agendamento" prometido no perfil do cliente (hoje inexistente) não existe;
- o **relatório mensal** que justifica a mensalidade (R$697) não consegue medir no-show
  evitado, ocupação de agenda nem recorrência real;
- o bot de IA (Fase 5) não tem **em que agir** — agendar exige uma agenda consultável e
  gravável por baixo.

A agenda é a peça que transforma o CRM de "cadastro histórico" em "sistema operacional da
barbearia" e é pré-requisito de tudo que vem depois (D3 IA, confirmação, reativação,
relatório).

## Objetivos

- Dar ao barbeiro uma agenda completa: ver o dia/semana, criar, remarcar, cancelar e concluir
  agendamentos, por barbeiro e por serviço.
- Modelar serviços (com duração e preço de tabela) e barbeiros (recurso, sem login) como
  dados de primeira classe do produto.
- Calcular disponibilidade de horários automaticamente a partir da grade de trabalho de cada
  barbeiro, folgas/exceções e agendamentos já existentes — sem sobreposição (sem "double
  booking").
- Unificar agenda e CRM: concluir um agendamento gera o atendimento (`visit`) e seu registro
  financeiro; o perfil do cliente passa a mostrar o próximo horário e os agendamentos.
- Registrar no-show (falta) como estado explícito, insumo do relatório mensal (Fase 3) e da
  reativação (Fase 5).
- **Preparar a arquitetura para o bot de IA e para automações**: uma camada de domínio única
  (`AgendaService`) que o painel, o worker e as futuras *tools* do bot chamam, com o contrato
  das tools especificado; subir a plumbing assíncrona (worker + pg-boss) que as fases de
  mensageria vão usar.
- Manter 100% da identidade visual Blade (mesmos tokens/telas da Fase 1) e o escopo por
  tenant (ADR-0007) em toda tabela e consulta nova.

## Fora de escopo inicial (desta change / Fase 2)

- **Auto-agendamento pelo cliente final** (link público sem login) — decidido fora
  (ver "Decisões da discussão", Q2). A agenda é operada internamente; o cliente final agenda
  via bot/WhatsApp só na Fase 5.
- **Envio de mensagem** (confirmação 24h, reativação, lembrete) — depende de `whatsapp-canal`
  (Fase 5, provedor ainda em aberto por D2/ADR-0004). Fase 2 produz o dado e deixa os jobs
  do worker como esqueleto que **registra** o que enviaria, sem enviar.
- **Conversa de IA** (`atendimento-ia`) — Fase 5. Fase 2 entrega só o contrato de *tools*
  mapeado no `AgendaService` e o esqueleto de `packages/ai` (cliente Claude), sem conectar a
  nenhum canal.
- **Processamento de pagamento / gateway** — non-goal do produto v1 (`project.md`). O
  financeiro continua sendo registro (herda a regra da Fase 1).
- **Papel/login de funcionário** (barbeiro que acessa o sistema) — Fase 4. Barbeiro nesta
  fase é **recurso** da agenda, não usuário; login segue único ("dono").
- **Fidelização, relatório mensal completo, multi-unidade** — fases posteriores / anti-ICP.

## Atores e stakeholders

- **Barbeiro-dono** (Rafael, ICP) — opera a agenda no painel (cria, conclui, remarca).
- **Barbeiro (recurso)** — a pessoa que executa o serviço; tem grade de horário e folgas, mas
  **não** acessa o sistema nesta fase.
- **Cliente final da barbearia** — sujeito do agendamento; nunca usuário direto nesta fase.
- **Operador Blade** (Vítor/Matheus) — suporte/onboarding; mesmo acesso do dono por ora.
- **Bot de IA (futuro, Fase 5)** — consumidor da camada de domínio via *tools*; não existe
  ainda, mas a fronteira é desenhada agora.
- **Worker / jobs (sistema)** — processo assíncrono que varre no-shows e, no futuro, dispara
  confirmação/reativação.

## Capabilities afetadas ou candidatas

- `agendamento` — **nova**, núcleo desta change (serviços, barbeiros, grade, disponibilidade,
  agendamentos, estados).
- `crm-clientes` — **evolui** (MODIFIED): `visits` referencia serviço/barbeiro do catálogo;
  perfil do cliente mostra próximo agendamento; exclusão LGPD passa a abranger agendamentos
  futuros; dashboard ganha "agenda de hoje".
- `painel-web` — novas telas (Agenda; Serviços; Barbeiros & Horários; regras da Agenda).
- Tocadas por preparação, **não implementadas aqui**: `atendimento-ia` (contrato de tools),
  `whatsapp-canal`/`confirmacao-agendamento`/`reativacao-clientes` (esqueleto de jobs no
  worker), `relatorios` (no-show e ocupação viram insumo futuro).

## Casos de uso principais

- Cadastrar/editar/desativar um serviço (nome, duração, preço de tabela).
- Cadastrar/editar/desativar um barbeiro e definir sua grade semanal de trabalho e folgas.
- Definir quais serviços cada barbeiro executa.
- Consultar horários livres de um serviço num dia (por barbeiro ou em qualquer barbeiro).
- Criar um agendamento (cliente + serviço + barbeiro + horário livre).
- Confirmar, remarcar, cancelar um agendamento.
- Concluir um agendamento presente → registra o atendimento (visita) e o valor pago.
- Marcar falta (no-show) — manualmente ou por varredura automática após X minutos.
- Ver a agenda do dia/semana por barbeiro; ver o próximo agendamento no perfil do cliente.
- Excluir um cliente (LGPD) que tem agendamentos futuros — cancelar/anonimizar sem quebrar a
  agenda nem os agregados.
- (Preparado, não executado) O bot cria/consulta um agendamento pela mesma camada de domínio.
- (Opcional) Importar serviços/barbeiros/horário do preset da automação no onboarding.

## Edge cases e falhas relevantes

- Dois agendamentos sobrepostos para o mesmo barbeiro (double booking) — inclusive por
  concorrência (dois pedidos simultâneos para o último horário livre).
- Agendar fora da grade do barbeiro, em folga/feriado, ou no passado.
- Serviço com duração que não cabe antes do fim do expediente / atravessa um intervalo.
- Barbeiro desativado (ou serviço desativado) que ainda tem agendamentos futuros.
- Concluir um agendamento cria visita — mas concluir duas vezes não pode duplicar a visita.
- Cancelar/remarcar um agendamento já concluído (transição de estado inválida).
- Cliente excluído (LGPD) com agendamento futuro.
- Fuso horário: horário exibido/《calculado》precisa ser o local da barbearia (America/Sao_Paulo),
  não UTC do servidor — o motor da automação usa hora local (`getHours`), o produto tem de
  ser consistente.
- Migração/seed idempotente do preset (rodar duas vezes não duplica serviço/barbeiro).
- Worker cai / job repetido (idempotência dos jobs; no-show-sweep não pode marcar falta em
  agendamento já concluído ou cancelado).

## Regras de negócio

### Confirmadas

- `barbershop_id` escopa **toda** tabela e consulta nova (ADR-0007), sem exceção.
- Barbeiro é **recurso** (sem login) nesta fase; login segue único "dono" (Decisão da
  discussão Q1).
- Cada barbeiro tem **grade de horário própria** (dias/horas), com intervalos e exceções
  (Decisão da discussão Q3).
- Nenhum agendamento pode sobrepor outro **ativo** do mesmo barbeiro no mesmo intervalo.
- Concluir um agendamento gera exatamente uma `visit` (e, se informado, um `payments_log`) —
  reaproveitando as regras financeiras da Fase 1 (registro, nunca processamento).
- UI em PT-BR com vocabulário do barbeiro; identidade Blade reaproveitada, nunca reinventada.
- Nenhum código fora de `packages/whatsapp`/`packages/ai` fala com provedor externo; nesta
  fase nenhum é chamado (custo externo zero — dentro de D4).

### Inferidas (validar no design)

- Preço do serviço é **preço de tabela/catálogo**; o valor efetivamente pago continua em
  `payments_log` por visita (podem divergir — desconto, gorjeta). **Premissa**.
- Disponibilidade "em qualquer barbeiro" = união das disponibilidades dos barbeiros que fazem
  o serviço. **Premissa**.
- Slot de horário tem um passo configurável por barbearia (ex.: 15/30 min); a duração do
  serviço define o tamanho do bloco. **Premissa**.
- Fuso fixo `America/Sao_Paulo` na Fase 2 (fase 1 do negócio é Brasília/DF); fuso por
  barbearia é evolução futura. **Premissa**.

### Em aberto

- Antecedência mínima e política de cancelamento/remarcação (janela mínima) — assumidas com
  padrões configuráveis; refinar com uso real (não bloqueia o design).
- Cor/identificação visual de cada barbeiro na grade — detalhe de UI, decidido no design.

## Restrições técnicas conhecidas

- **A fundação da Fase 1 existe e é o alicerce**: monorepo pnpm com `apps/web` (Next.js 15,
  App Router) + `packages/db` (Drizzle + Postgres), repositórios com `barbershopId`
  obrigatório, auth HMAC (Web Crypto, Edge-compatible), design system em tokens Tailwind +
  classes CSS Blade. A Fase 2 **estende**, não refunda.
- **`apps/worker`, `packages/core`, `packages/ai`, `packages/whatsapp` não existem ainda** —
  a arquitetura alvo ([docs/architecture/overview.md](../../../docs/architecture/overview.md))
  os prevê; esta change cria os três primeiros (worker, core, ai-esqueleto) por decisão Q4.
- **pg-boss ainda não instalado** (ADR-0003 o prevê, sem Redis) — esta change o ativa.
- ADRs 0001-0007 seguem `Proposto`; a Fase 1 já validou 0001-0003 e 0007 na prática. Esta
  change adiciona ADR-0008 (camada de domínio + contrato de tools) e ADR-0009 (worker +
  pg-boss), ambos `Proposto`.
- Orçamento D4 (≤R$150-200/mês): worker + pg-boss rodam no **mesmo** Postgres/VPS já orçados;
  nenhum serviço pago novo; `packages/ai` não faz chamada em Fase 2 (custo zero).

## Requisitos não funcionais relevantes

- **Escopo por tenant obrigatório** em toda leitura/escrita nova (ADR-0007) + testes de
  isolamento para cada tabela nova.
- **Correção de disponibilidade e ausência de double booking** — verificável por testes de
  unidade do motor + garantia no banco (restrição de exclusão) para o caso de concorrência.
- **Fuso horário** consistente (America/Sao_Paulo) em cálculo e exibição.
- **LGPD**: agendamento vincula dado pessoal (cliente). Exclusão do cliente abrange
  agendamentos futuros; nunca logar telefone completo/conteúdo.
- **Desempenho**: consulta de disponibilidade de um dia responde em < 500ms (p95) com índices
  adequados; a agenda não faz N+1 por barbeiro.
- **Vocabulário do barbeiro** em toda UI; zero ocorrências de "CRM"/"booking"/"slot" nas
  telas.

## Riscos

| Risco | Tipo | Impacto | Probabilidade | Mitigação | Decisão |
|---|---|---:|---:|---|---|
| Motor de disponibilidade com grade por barbeiro é a parte mais complexa e sujeita a bug (fuso, intervalos, sobreposição) | Técnico | Alto | Alta | `AgendaService` isolado e coberto por testes de unidade exaustivos (fuso, borda de expediente, folga, concorrência) antes de qualquer tela | Aceito |
| Double booking por concorrência | Dados | Alto | Média | Restrição de exclusão no Postgres (btree_gist, `tstzrange` + `barber_id`) além da verificação no repositório | Ver design |
| Escopo grande — 7 tabelas novas + worker + 2 pacotes + telas | Processo | Médio | Alta | `tasks.md` faseado e sequencial; cada grupo entrega valor verificável; domínio antes de UI | Aceito |
| Subir worker/pg-boss agora sem uso "de verdade" na Fase 2 | Processo/Custo | Baixo | Média | Dar ao worker um job **real** de Fase 2 (varredura de no-show) + esqueletos honestos (log, não envio) para confirmação/reativação | Q4 decidido |
| Confundir agenda do produto com horários do preset da automação | Produto | Médio | Média | Fronteira explícita; seed do preset é import único opcional no onboarding, não sincronização | — |
| Preço de tabela vs. valor pago serem tratados como a mesma coisa | Produto | Médio | Baixa | Modelos separados (`services.price_cents` ≠ `payments_log.amount_cents`); design e UI deixam claro | — |
| Fuso horário mal tratado gera horário errado ao cliente | Correção | Alto | Média | Padrão único America/Sao_Paulo documentado; `timestamptz` no banco; conversão só na borda de cálculo/exibição; testes de fuso | Ver design |

## Premissas

- A stack segue as ADRs vigentes (0001-0007) + as novas 0008/0009 desta change; se os sócios
  mudarem stack, o design se revisa, a spec de comportamento muda pouco.
- O design system do produto é o mesmo da Fase 1 (tokens Ink/Gold/Chalk/Steel/Wire, fontes
  Barlow) — reaproveitado.
- "Barbearia" = "tenant" = `barbershop_id`.
- Volume por barbearia é pequeno (1-3 barbeiros, dezenas de agendamentos/dia) — o motor pode
  computar disponibilidade sob demanda sem cache dedicado na Fase 2.

## Perguntas críticas

### Bloqueantes

Levantadas e respondidas por Vítor em 2026-07-14 — ver "Decisões da discussão".

### Importantes, não bloqueantes

1. Antecedência mínima e janela de cancelamento — assumidas configuráveis com padrão; revisar
   com uso real.
2. Disponibilidade "qualquer barbeiro" — assumida como união; revisar se o barbeiro preferir
   sempre escolher o profissional.
3. Fuso por barbearia — fixo BRT na Fase 2; parametrizar quando houver cliente fora do fuso.
4. Retrofit dos `visits` antigos (texto livre → FK de catálogo) — a spec da Fase 1 já previa o
   ganho das FKs; visitas legadas ficam com texto livre, novas usam catálogo (sem migração
   forçada de histórico).

## Decisões da discussão

| Pergunta | Decisão | Quem | Data |
|---|---|---|---|
| Q1. Modelo de barbeiro na agenda | **Múltiplos barbeiros como recurso, sem login** — a barbearia cadastra N barbeiros; cada agendamento é de um barbeiro; disponibilidade por barbeiro; login segue único (dono opera todos). Papel/login de funcionário fica para a Fase 4. | Vítor | 2026-07-14 |
| Q2. Canal de agendamento na Fase 2 | **Interno + estrutura pronta para o bot** — barbeiro/operador operam a agenda no painel; a camada de domínio (`AgendaService`) e o contrato de *tools* ficam prontos; o cliente final NÃO se auto-agenda nesta fase (isso vem com WhatsApp/IA na Fase 5). | Vítor | 2026-07-14 |
| Q3. Profundidade do motor de disponibilidade | **Grade de horário própria por barbeiro** — cada barbeiro tem seus dias/horas, intervalos e exceções (folga/bloqueio); disponibilidade derivada disso menos os agendamentos existentes. | Vítor | 2026-07-14 |
| Q4. Infra assíncrona | **Subir worker + pg-boss já** — criar `apps/worker` + pg-boss + esqueleto de `packages/ai` nesta fase, deixando a plumbing assíncrona pronta; Fase 2 dá ao worker um job real (varredura de no-show) e esqueletos honestos para confirmação/reativação (registram, não enviam). | Vítor | 2026-07-14 |

## Pesquisa aplicada (herdada de `add-crm-clientes`) — o que a Fase 2 adota

Da pesquisa de mercado já registrada na exploração da Fase 1 (Fresha/Booksy/Zenoti),
adotamos nesta fase, adaptado ao ICP:

- **Redução de no-show**: estado de falta explícito + varredura automática; o *rebooking no
  checkout* ("já quer marcar o próximo?") entra como ação da tela de concluir agendamento.
- **Agenda por recurso (barbeiro)**: visão de colunas por barbeiro no dia, padrão do setor.
- **Duração por serviço define o bloco**: slots derivados da duração (não blocos fixos), como
  as plataformas maduras.
- **NÃO copiamos** (mesmo racional da Fase 1): depósito/sinal para no-show (exigiria cobrança
  no sistema — non-goal), comissão por barbeiro (pressupõe login de funcionário — Fase 4),
  auto-agendamento público com anti-abuso pesado (fora do escopo Q2).
