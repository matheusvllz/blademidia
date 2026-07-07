# Exploração Crítica: CRM de Clientes para Barbearias (Produto)

> Etapas 1-3 do fluxo (Ideia → Refinamento → Discussão). Cobre a **visão completa** do
> módulo pedida por Vítor (25 seções). A entrega detalhada (proposal/design/tasks/spec)
> desta change cobre só a **Fase 1** (núcleo) — o resto vira roadmap de changes futuras,
> por regra do próprio [workflow.md](../../workflow.md) ("uma change afeta uma ou poucas
> capabilities; se afetar muitas, quebre em changes menores").

## Ideia original

Construir o módulo de CRM do produto SaaS — cadastro de clientes, histórico completo,
evolução do cliente, agenda integrada, financeiro, fidelização, campanhas, dashboard,
métricas — para uso exclusivo do barbeiro/barbearia, sobre a arquitetura já proposta
(ADRs), sem alterar nenhum código existente, com identidade visual da Blade Mídia.
Planejamento apenas — sem implementação até aprovação.

## Entendimento atual

Isto é a capability `crm-clientes`, já mapeada como candidata em
[openspec/specs/README.md](../../specs/README.md) ("núcleo da retenção"), junto de
capabilities vizinhas que o pedido também toca: `agendamento`, `confirmacao-agendamento`,
`reativacao-clientes`, `painel-web`, `relatorios`, `whatsapp-canal`, `atendimento-ia`. O
pedido introduz ainda duas candidatas **novas**, não listadas até hoje:
`financeiro-clientes` (registro de transações, sem processar pagamento — confirmado por
Vítor) e `fidelizacao-clientes`.

**Fato (conventions.md):** a palavra "CRM" é proibida na UI do produto — lá o barbeiro vê
sempre "Clientes". "CRM" é o nome interno do módulo/capability nestes documentos, nunca um
rótulo de tela.

**Fato (project.md):** este é o produto SaaS, não a operação da agência. Não confundir com
`automation/lib/store.mjs` — o tooling interno que Vítor/Matheus já usam para gerenciar as
barbearias-cliente da própria Blade Mídia. São sistemas diferentes; a relação entre os dois
está decidida na seção "Decisões da discussão" abaixo (migração prevista).

## Problema real

Comprovado por `project.md` e `docs/business/contexto-negocio.md`: o barbeiro-dono (ICP
Rafael) não tem processo — usa papel/memória/Instagram, nunca usou CRM. Isso causa:
mensagem sem resposta, no-show, cliente que some e nunca é recontatado. O produto promete
resolver isso e ainda precisa produzir o **relatório mensal** que justifica a mensalidade
(R$697/mês) — sem um repositório estruturado de cliente/histórico/transação, esse relatório
não existe. O CRM é a peça de dados que sustenta tanto a experiência do barbeiro quanto as
automações (confirmação, reativação, IA) já decididas em D3/D5.

## Objetivos

- Organizar os clientes da barbearia num só lugar (fim do papel/memória).
- Manter histórico completo de atendimentos por cliente.
- Aumentar o retorno de clientes (retenção) e reduzir faltas (no-show).
- Melhorar o atendimento com contexto (o barbeiro sabe quem é o cliente antes de atender).
- Acompanhar indicadores do negócio (quantos ativos, quantos sumiram, quanto se recuperou).
- Preparar a base de dados e a arquitetura para as automações futuras (confirmação,
  reativação, IA conversacional, WhatsApp) sem construí-las agora.

## Fora de escopo inicial (desta change / Fase 1)

- Processar pagamento (gateway de cobrança) — **fora do produto v1** (Fato, `project.md`).
  O financeiro desta change é só registro.
- Agenda completa (criação/edição de horário, disponibilidade por barbeiro) — capability
  `agendamento`, change futura. Fase 1 só reserva o campo "próximo agendamento" como
  leitura, preenchido manualmente até `agendamento` existir.
- Fidelização com pontos/recompensas — Fase futura (`fidelizacao-clientes`).
- Campanhas de marketing automatizadas — Fase futura, depende de `whatsapp-canal` +
  `atendimento-ia`.
- Envio automático de mensagem (confirmação 24h, reativação 21d) — depende de
  `whatsapp-canal` (change futura). Fase 1 registra o dado que **vai disparar** essas
  regras; não envia nada.
- Múltiplos funcionários com login próprio (barbeiro não-dono) — papel único "dono" no v1.
- Multi-unidade / franquia — fora do produto (`project.md`, anti-ICP).

## Atores e stakeholders

- **Barbeiro-dono** (Rafael, ICP) — usuário primário do painel do produto.
- **Cliente final da barbearia** — sujeito dos dados; nunca usuário direto do sistema.
- **Operador Blade** (Vítor/Matheus) — hoje gerencia via `painel-agencia` (sistema
  separado); acesso de suporte ao CRM do cliente é ponto em aberto (ver abaixo).
- Futuro: barbeiro funcionário — papel a definir, fora desta change.

## Capabilities afetadas ou candidatas

- `crm-clientes` — núcleo desta change (Fase 1).
- `painel-web` — hospeda as telas do produto (nasce nesta change; ainda não existe).
- `auth-tenancy` — login e escopo de tenant; Fase 1 usa só um subconjunto mínimo (ver
  "Restrições técnicas conhecidas").
- `financeiro-clientes` — **candidata nova**, registro de transações associadas ao
  cliente, sem processamento de pagamento.
- Tocadas por integração futura, **não implementadas nesta change**: `agendamento`,
  `confirmacao-agendamento`, `reativacao-clientes`, `whatsapp-canal`, `atendimento-ia`,
  `relatorios`, `fidelizacao-clientes` (nova candidata).

## Casos de uso principais

- Cadastrar um cliente novo (nome, telefone, observações).
- Registrar que um atendimento aconteceu (serviço, barbeiro, data, valor).
- Ver o histórico completo de um cliente (linha do tempo de visitas).
- Ver a "evolução" do cliente (frequência ao longo do tempo, ticket médio, tendência).
- Ver o dashboard com indicadores gerais da barbearia.
- Ver quem está inativo (sem visita há N dias, configurável) para reativação manual.
- Registrar uma transação financeira (o que o cliente pagou naquele atendimento).
- Configurar a regra de inatividade (hoje fixa em 21 dias no preset da automação).
- Migrar os dados que já existem em `automation/data/db.json` quando a barbearia virar
  cliente do produto.
- Editar/excluir um cliente (LGPD — direito ao esquecimento).

## Edge cases e falhas relevantes

- Cliente duplicado (mesmo telefone cadastrado duas vezes).
- Telefone inválido, incompleto ou ausente.
- Cliente novo, sem nenhum atendimento registrado ainda (estado vazio do histórico).
- Registro migrado do JSON antigo com dado incompleto (sem telefone, nome vazio).
- Dois usuários editando o mesmo cliente ao mesmo tempo (concorrência) — improvável no v1
  (papel único), mas o dado precisa sobreviver a isso sem corromper.
- Barbearia nova, zero clientes (estado vazio do dashboard).
- Exclusão de cliente pedida pelo dono: tensão entre LGPD (direito ao esquecimento) e
  manter a integridade do histórico financeiro/relatório mensal já fechado.
- Migração roda duas vezes por engano (idempotência).

## Regras de negócio

### Confirmadas

- `barshopId` (na prática `barbershop_id`) escopa toda tabela de negócio (ADR-0007), sem
  exceção, incluindo as tabelas novas desta change.
- "CRM" nunca aparece em texto de UI — sempre "Clientes" (`conventions.md`).
- Financeiro é **registro**, nunca processamento de pagamento (confirmado por Vítor,
  2026-07-07): "deve registrar automaticamente todos os tipos de pagamentos que tiveram na
  barbearia, mas sem ser o próprio lugar que processa o pagamento".
- Nunca logar conteúdo de mensagem de cliente final nem telefone completo (`CLAUDE.md`).
- Migração dos dados de `automation/data/db.json` faz parte desta change (confirmado por
  Vítor, 2026-07-07) — não é ponto em aberto, é requisito.

### Inferidas (validar)

- "Evolução do cliente" (pedido do Vítor) interpretada como: linha do tempo de
  frequência de visitas e valor gasto ao longo do tempo, com indicação de tendência (mais
  frequente / estável / esfriando). **Premissa** — não foi detalhado literalmente o que
  "evolução" deveria mostrar; validar essa leitura ao revisar o design.
- Registro financeiro é "por visita" (um valor total por atendimento), não item a item por
  serviço dentro da visita. **Premissa** — mais simples, alinhado ao ICP; abre para
  granularidade por serviço numa fase futura se fizer falta para relatório.
- Migração de `automation/data/db.json` roda uma vez, no onboarding do tenant no produto
  (não é sincronização contínua entre os dois sistemas).
- Papel único "dono" cobre a Fase 1; múltiplos funcionários com login fica para depois.

### Em aberto

- Acesso de suporte do operador Blade (Vítor/Matheus) ao CRM de um cliente específico —
  hoje o `painel-agencia` é sistema separado; se o operador precisa "entrar como" o
  barbeiro para dar suporte, é uma decisão de auth ainda não tomada.
- Regra de retenção/exclusão de dado ao cancelar assinatura — mesmo ponto já pendente do
  Matheus em `add-agency-ops-panel` (carência de inadimplência), reaparece aqui para
  exclusão de dado de cliente final.

## Restrições técnicas conhecidas

- **`init-project-skeleton` não existe ainda** — todas as suas tarefas estão `[ ]`
  (`openspec/changes/init-project-skeleton/tasks.md`). Não há `apps/web`, não há
  `packages/db`, não há Next.js, não há conexão Postgres. Isso é hoje a maior restrição
  técnica desta change — ver "Fase 0 técnica" no roadmap abaixo, resposta à pergunta
  bloqueante "como seria esse skeleton?".
- Stack alvo (ADRs 0001-0003, **status Proposto, nenhuma aceita formalmente ainda**):
  TypeScript/Node 22, monorepo pnpm, Next.js (App Router) para o painel, PostgreSQL 16 +
  Drizzle ORM, multi-tenant em banco único com `barbershop_id` (ADR-0007, também Proposto).
- Orçamento D4 (≤R$150-200/mês) não pode ser estourado por este módulo — CRM em si não
  adiciona serviço pago novo (roda dentro do mesmo Postgres/VPS já orçado na visão geral).

## Requisitos não funcionais relevantes

- **LGPD**: dado pessoal de cliente final (nome, telefone, histórico de visitas, valor
  pago). Consentimento, retenção e exclusão precisam de tratamento explícito no design.
- **Escopo por tenant obrigatório** em toda leitura/escrita (ADR-0007) — inclusive nas
  novas tabelas de cliente e de transação financeira.
- **Vocabulário do barbeiro** em toda UI — nunca "lead", "funil", "CRM", "conversão",
  "churn" (`conventions.md`, `docs/business/contexto-negocio.md`).

## Riscos

| Risco | Tipo | Impacto | Probabilidade | Mitigação | Decisão necessária |
|---|---|---:|---:|---|---|
| Escopo em cascata — CRM toca 7+ capabilities | Processo | Médio | Alta | Fasear a entrega; só a Fase 1 vira proposal/design/tasks nesta change | Confirmado (Vítor, "visão completa + Fase 1 detalhada") |
| Construir sobre um skeleton que ainda não existe | Técnico | Alto | Certa | "Fase 0 técnica" com escopo mínimo (subconjunto de `init-project-skeleton`), sequenciada antes da Fase 1 | Ver seção "Fase 0 técnica" |
| Confundir o "CRM" interno da agência (`automation/`) com o CRM do produto | Produto | Médio | Média | Nomenclatura explícita nos documentos; migração de dados desenhada como fronteira clara (import único, não sincronização) | — |
| Campo financeiro vira "meio de pagamento" de fato, mesmo sem processar | Produto/Legal | Médio | Baixa | Design e UI deixam explícito: só registro manual retroativo, nenhuma integração de cobrança nesta fase | — |
| Migração de `automation/data/db.json` com dado malformado (telefone incompleto, nome vazio) | Dados | Médio | Média | Script de migração com validação, modo dry-run e relatório de divergências antes de gravar | — |
| ADRs da stack ainda não aceitas formalmente | Processo | Baixo | Certa | Design desta change assume as ADRs como estão (Proposto); se forem substituídas, o design se revisa, não a spec | — |

## Premissas

- A stack técnica segue as ADRs 0001-0003 e 0007 como estão hoje (Proposto), por serem a
  única arquitetura documentada — se os sócios decidirem mudar stack, este design se
  revisa, a spec de comportamento (o que o CRM faz) muda pouco ou nada.
- O design system do produto (shadcn/ui + tokens Blade, per `docs/architecture/overview.md`)
  é o mesmo já usado no `site/` e no `painel/` da automação (Ink/Gold/Chalk/Steel/Wire,
  Barlow/Barlow Condensed/Space Mono) — reaproveitado, não reinventado.
- "Barbearia" e "tenant" são o mesmo conceito neste documento (equivalente a
  `barbershop_id` no código).

## Perguntas críticas

### Bloqueantes

Já levantadas e respondidas por Vítor em 2026-07-07 — ver "Decisões da discussão" abaixo.

### Importantes, não bloqueantes

1. Papel de funcionário (barbeiro não-dono, múltiplos logins por barbearia) — assumido
   fora da Fase 1; validar antes da Fase 4 (Configurações avançadas).
2. Granularidade do registro financeiro (por visita vs. por serviço dentro da visita) —
   assumida "por visita" na Fase 1; revisar se o relatório mensal (Fase 3) precisar de mais
   detalhe.
3. Acesso de suporte do operador Blade ao CRM de um tenant específico — não bloqueia o
   design da Fase 1 (painel do produto não precisa disso ainda), mas afeta `auth-tenancy`
   quando essa capability for especificada de verdade.

## Decisões da discussão

| Pergunta | Decisão | Quem | Data |
|---|---|---|---|
| Sequenciamento vs. `init-project-skeleton` | Skeleton é pré-requisito técnico inegociável (não dá para ter telas Next.js/Postgres sem ele) — mas não precisa ser o skeleton **completo**. Definida uma "Fase 0 técnica" com só o subconjunto que o CRM precisa (workspace, `packages/db`, `apps/web` básico, auth mínima), deixando `packages/whatsapp`, `packages/ai` e `apps/worker` para quando as capabilities que os usam entrarem em jogo. Isso resolve "priorizar o CRM" sem pular a plumbing técnica. | Vítor (após pedir explicação do que é o skeleton) | 2026-07-07 |
| Escopo do "Financeiro" | Registro automático de todos os pagamentos que a barbearia teve, associados ao cliente — sem o sistema processar/cobrar o pagamento em si (nenhum gateway integrado nesta fase). | Vítor | 2026-07-07 |
| Dados já existentes em `automation/lib/store.mjs` | Prever migração desde já — faz parte do escopo desta change, não é ponto em aberto futuro. | Vítor | 2026-07-07 |
| Profundidade da entrega | Visão completa (esta exploração, todas as 25 seções pedidas) + Fase 1 totalmente detalhada em proposal/design/tasks/spec; fases seguintes ficam mapeadas como roadmap, especificadas quando chegar a vez. | Vítor | 2026-07-07 |

## Pesquisa de mercado — boas práticas de CRM para barbearias e salões

Levantamento sobre plataformas de referência do setor (Fresha, Booksy, Zenoti, e
plataformas menores voltadas a barbearia/salão) e práticas de retenção documentadas por
elas, para adaptar — não copiar — ao ecossistema Blade Mídia.

### Funcionalidades essenciais observadas

- **Perfil completo do cliente**: histórico de serviço com data e profissional,
  preferências (corte, produto, alergias/observações), preferência de comunicação, data de
  aniversário, origem do cliente (indicação, Instagram etc.).
- **Redução de no-show**: lembrete automático 24h e 2h antes; depósito/sinal para clientes
  reincidentes em falta (fora do escopo Blade — sem cobrança no sistema); rebooking direto
  no checkout (perguntar "já quer marcar o próximo?" na hora do pagamento).
- **Detecção de inatividade por padrão de frequência**: não é só "X dias sem visita" fixo —
  plataformas maduras comparam com o intervalo médio histórico do próprio cliente (ex.:
  cliente que sempre volta a cada 5 semanas e passa de 12 semanas é sinalizado antes de um
  cliente irregular que nunca teve padrão). Achado relevante para uma fase futura de
  reativação mais inteligente do que o corte fixo de 21 dias hoje usado no preset.
- **Campanha de reativação ("we miss you")**: mensagem automática ao cruzar o limiar de
  inatividade, com CTA direto de reagendar. Fontes relatam recuperação de até ~40% dos
  clientes inativos com essa prática isolada.
- **Fidelização simples supera pontos complexos**: "a cada 6ª visita, um serviço grátis" é
  citado como mais eficaz que sistemas de pontos por valor gasto — cliente não acompanha
  pontuação, mas entende contagem simples. Relevante para a Fase 4 (`fidelizacao-clientes`)
  deste roadmap: evitar over-engineering.
- **Indicadores usados**: taxa de retenção (clientes que voltam), ticket médio, taxa de
  no-show, número de clientes recuperados por reativação, frequência média entre visitas.

### O que adotamos (mapeado nas fases deste roadmap)

- Perfil de cliente + histórico completo + registro financeiro por visita → **Fase 1**.
- Dashboard com indicadores simples (ativos/inativos, ticket médio, taxa de retenção) →
  **Fase 1** (versão básica) e **Fase 3** (relatório mensal completo).
- Detecção de inatividade configurável, com espaço para evoluir de "N dias fixo" para
  "desvio do padrão do cliente" → **Fase 1** (regra simples) e **Fase 5** (regra inteligente,
  quando `atendimento-ia`/`relatorios` amadurecerem).
- Campanha de reativação automática via WhatsApp → **Fase 5**, depende de `whatsapp-canal` +
  `atendimento-ia` (já decididos em D2/D3, ainda não implementados).
- Rebooking no checkout → vira requisito de UX da **Fase 2** (`agendamento`), não do CRM
  isoladamente.
- Fidelização com regra simples (contagem, não pontos) → **Fase 4**.

### O que NÃO copiamos (e por quê)

- **Sistema de pontos por valor gasto** — ICP (Rafael) não tem paciência para configurar
  regra de conversão de pontos; contraria a promessa "você não opera nada". Se houver
  fidelização, será contagem simples (Fase 4).
- **Venda de produto/estoque (retail) vinculada ao cliente** — fora do ICP (barbearia
  simples, 1-3 cadeiras, não opera estoque relevante); não está em `project.md` como
  objetivo do produto. Não entra em nenhuma fase deste roadmap sem novo pedido explícito.
- **Comissão de funcionário por atendimento** — pressupõe múltiplos barbeiros com login,
  fora do escopo do v1 (papel único "dono").
- **Depósito/sinal obrigatório para reduzir no-show** — envolveria cobrança dentro do
  sistema, que é non-goal explícito de `project.md`.
- **Multi-unidade/franquia** — anti-ICP documentado.

## Roadmap de fases (ordem ideal de desenvolvimento)

> Resposta completa à pergunta "como seria esse skeleton?" e ao pedido de seção 21
> (Ordem ideal de desenvolvimento).

### Fase 0 — Fundação técnica mínima (pré-requisito, não é feature de CRM)

Não é uma feature do CRM — é a plumbing sem a qual nenhuma tela existe. É um
**subconjunto** do que `init-project-skeleton` já tem planejado (ver
`openspec/changes/init-project-skeleton/tasks.md`), reduzido ao mínimo que a Fase 1
precisa:

- Monorepo pnpm + tooling (lint/format) — tasks 1.1/1.2 do skeleton.
- `packages/db`: Drizzle + client Postgres — tasks 2.1/2.2 do skeleton.
- `apps/web`: esqueleto Next.js (App Router) — task 4.1 do skeleton.
- Auth mínima: login único por barbearia (papel "dono"), sem o sistema de papéis completo
  de `auth-tenancy` — um recorte, não a capability inteira.
- Docker Compose local só com Postgres (sem worker, sem Evolution) — recorte da task 6.1.

**Explicitamente adiado** (não bloqueia o CRM): `packages/whatsapp`, `packages/ai`,
`apps/worker`, CI completo, observabilidade (Sentry) — entram quando as capabilities que
realmente os usam (`whatsapp-canal`, `atendimento-ia`) forem trabalhadas.

### Fase 1 — Núcleo do CRM (ESTA CHANGE — proposal/design/tasks/spec prontos)

Cadastro e gerenciamento de clientes, histórico completo, "evolução do cliente", dashboard
básico, registro financeiro por visita, configuração de regra de inatividade, migração dos
dados de `automation/data/db.json`. Detalhado nos artefatos irmãos desta pasta.

### Fase 2 — Agenda integrada

Capability `agendamento`: serviços, barbeiros, horários, criação/cancelamento. O CRM passa
a mostrar o "próximo agendamento" de verdade (hoje seria um campo manual/vazio). Rebooking
no checkout (prática de mercado) entra aqui.

### Fase 3 — Financeiro avançado e Relatórios

Capability `relatorios`: o relatório mensal prometido (`docs/business/contexto-negocio.md`)
— clientes reativados, no-shows evitados, R$ recuperado. Financeiro ganha granularidade
por serviço se o relatório precisar.

### Fase 4 — Fidelização e Configurações avançadas

Capability nova `fidelizacao-clientes`: regra simples de fidelidade (contagem, não pontos).
Papel de funcionário (múltiplos logins por barbearia) também entra aqui, se confirmado.

### Fase 5 — Campanhas, IA conversacional e WhatsApp automático

Capabilities `whatsapp-canal`, `atendimento-ia`, `confirmacao-agendamento`,
`reativacao-clientes`: envio automático de confirmação/reativação, campanhas de
reativação, detecção de inatividade "inteligente" (padrão do cliente, não corte fixo). O
CRM (Fase 1) já terá o dado — aqui ele passa a agir sozinho sobre esse dado.
