# Proposal: CRM de Clientes — Núcleo (Fase 1)

## Change ID
`add-crm-clientes`

## Status
In Progress <!-- Draft | Proposed | Approved | In Progress | In Review | Done | Rejected | Superseded -->

> Aprovado por Vítor em 2026-07-07 ("Aprovo a fase 0 e a fase 1, pode fazê-la
> completamente"). Implementação em andamento na branch `feature/add-crm-clientes` — ver
> `tasks.md` para o progresso tarefa a tarefa.

## Context
Ver [exploration.md](exploration.md) para a visão completa do módulo (25 seções, pesquisa
de mercado, roadmap de 5 fases). Este proposal cobre **só a Fase 1** — o núcleo do CRM —
por regra do projeto de não misturar muitas capabilities numa change só. É a primeira
change de implementação de produto deste repositório depois de `init-project-skeleton`
(hoje `[ ]`, ver dependência abaixo).

## Problem
O barbeiro-dono (ICP Rafael) não tem processo de gestão de clientes — usa papel, memória e
Instagram. Isso causa mensagem sem resposta, no-show e clientes que somem sem serem
recontatados (`project.md`). Sem um repositório estruturado de cliente/histórico/transação,
o produto também não consegue produzir o relatório mensal que justifica a mensalidade
(R$697/mês, `docs/business/contexto-negocio.md`).

## Goals
- Barbeiro cadastra e gerencia seus clientes num painel do produto.
- Cada atendimento realizado fica registrado no histórico do cliente (serviço, barbeiro,
  data, valor).
- Barbeiro vê um dashboard com indicadores básicos (clientes ativos/inativos, ticket médio,
  quantos precisam de reativação).
- Sistema registra automaticamente os pagamentos ocorridos por cliente, sem processar
  cobrança nenhuma.
- Regra de "cliente inativo" é configurável por barbearia (hoje fixa em 21 dias só no
  preset da automação).
- Dados que já existem em `automation/data/db.json` (tooling interno da agência) são
  migrados para o cliente que virar tenant do produto.

## Non-Goals
- Processar pagamento/cobrança dentro do sistema (non-goal explícito de `project.md`).
- Agenda completa — criação/edição de horário, disponibilidade por barbeiro (`agendamento`,
  change futura).
- Envio automático de mensagem — confirmação 24h, reativação 21d (`whatsapp-canal`,
  change futura). Esta change só guarda o dado que vai disparar essas regras.
- Fidelização com pontos/recompensas (`fidelizacao-clientes`, Fase 4).
- Campanhas de marketing automatizadas (Fase 5).
- Múltiplos funcionários com login próprio — papel único "dono" nesta fase.
- Acesso do operador Blade (Vítor/Matheus) ao CRM de um tenant específico — fica de fora;
  hoje a visão da agência é o `painel-agencia`, sistema separado.

## Users / Actors Impacted
- **Barbeiro-dono** — usuário primário; cadastra clientes, registra atendimentos, vê
  dashboard.
- **Cliente final da barbearia** — sujeito dos dados; nunca usuário direto.
- Fora desta change: operador Blade, funcionário barbeiro.

## Scope
### In scope
- Cadastro, edição e exclusão (LGPD) de cliente.
- Registro de atendimento (histórico) por cliente.
- Registro financeiro (transação) por atendimento — só registro, sem gateway.
- Dashboard com indicadores básicos.
- Configuração da regra de inatividade por barbearia.
- Migração de dados de `automation/data/db.json` para o schema do produto, no onboarding
  do tenant.
- Autenticação mínima (login do dono, escopo por `barbershop_id`) — subconjunto de
  `auth-tenancy`, não a capability completa.
- Fundação técnica mínima (subconjunto de `init-project-skeleton`: monorepo, `packages/db`,
  `apps/web` básico) — ver [exploration.md](exploration.md#fase-0--fundação-técnica-mínima-pré-requisito-não-é-feature-de-crm).

### Out of scope
- Tudo listado em "Non-Goals" acima.
- `packages/whatsapp`, `packages/ai`, `apps/worker`, CI completo, observabilidade Sentry —
  adiados para quando `whatsapp-canal`/`atendimento-ia` entrarem em jogo.

## Business Rules
- Toda leitura/escrita de cliente, atendimento e transação é escopada por
  `barbershop_id` (ADR-0007), sem exceção.
- "CRM" nunca aparece em texto de UI — sempre "Clientes" (`conventions.md`).
- Registro financeiro é lançamento manual/retroativo do que já foi pago fora do sistema;
  o produto não processa nem intermedeia o pagamento.
- Exclusão de cliente (LGPD) preserva a integridade de relatórios já fechados — anonimiza
  em vez de apagar linha de transação histórica (ver `design.md`).

## Affected Capabilities
- `crm-clientes` (nova — nasce com esta change)
- `painel-web` (nova — telas do produto nascem aqui)
- `auth-tenancy` (subconjunto mínimo; capability completa fica para depois)
- `financeiro-clientes` (nova candidata, registro de transações)

## Expected Impact
### Code
- Novo `apps/web` (Next.js), novo `packages/db` (Drizzle) — nenhum código de
  `automation/` ou `site/` é alterado.
### Data
- Novas tabelas: `clients`, `visits`, `payments_log`, `crm_settings` (ver `design.md`).
  Nenhuma tabela/dado existente é modificado (o produto não tem banco hoje).
### APIs / Contracts
- Rotas internas do `apps/web` (CRUD de cliente, visita, transação) — sem contrato externo
  nesta fase (nenhuma integração de terceiro).
### Integrations
- Nenhuma integração externa nova nesta fase. Migração de `automation/data/db.json` é
  leitura de arquivo local, não integração de sistema.
### Operations
- Onboarding de tenant no produto passa a incluir um passo de migração de dados
  (script, não manual).
### Security / Privacy (LGPD)
- Dado pessoal de cliente final (nome, telefone, histórico, valor pago). Exclusão sob
  demanda com anonimização de histórico financeiro associado.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Depende de `init-project-skeleton`, que não existe | Alto | Fase 0 técnica com escopo mínimo, sequenciada antes das tasks desta change |
| Migração de dados malformados do JSON da automação | Médio | Script com validação, dry-run e relatório de divergências antes de gravar |
| Confundir "CRM" do produto com tooling interno da agência | Médio | Nomenclatura e fronteira de dados explícitas (import único, não sync contínuo) |
| ADRs 0001-0003/0007 ainda `Proposto`, não aceitas formalmente | Baixo | Design assume a stack como está; revisão do design (não da spec) se isso mudar |

## Success Criteria
- Barbeiro consegue cadastrar um cliente e registrar um atendimento em menos de 1 minuto,
  sem depender de suporte técnico.
- Dashboard carrega os indicadores básicos (ativos/inativos/ticket médio) em até 2 segundos
  com até 500 clientes cadastrados.
- Migração de um tenant real de `automation/data/db.json` roda sem perda de registro
  válido (validado contra um dataset real antes do rollout).
- Teste de isolamento entre tenants confirma que a barbearia A nunca vê dado da barbearia B
  (DoD do ADR-0007).

## Assumptions
- Stack técnica segue as ADRs 0001-0003/0007 como estão hoje (ver premissa equivalente na
  exploração).
- "Evolução do cliente" = linha do tempo de frequência/valor ao longo do tempo (premissa a
  validar no design, não literalmente detalhada pelo Vítor).
- Registro financeiro é por visita (valor total), não por serviço dentro da visita.

## Open Questions
- Acesso de suporte do operador Blade ao CRM de um tenant específico (não bloqueia esta
  fase).
- Regra de retenção/exclusão de dado ao cancelar assinatura — pendente do Matheus (mesmo
  ponto já registrado em `add-agency-ops-panel`).
