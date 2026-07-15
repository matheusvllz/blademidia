# Proposal: Agenda Integrada (Produto — Fase 2)

## Change ID
`add-agendamento`

## Status
Done <!-- Draft | Proposed | Approved | In Progress | In Review | Done | Rejected | Superseded -->

> Aprovada por Vítor em 2026-07-14 (portão humano da etapa 5 do
> [workflow](../../workflow.md)). Implementada por completo na branch `feature/add-agendamento`
> (10 grupos do `tasks.md`, todos com evidência — código, testes automatizados e verificação
> via HTTP real/CLI real/boot real contra Postgres). Deltas aplicados às specs permanentes em
> 2026-07-15 (`openspec/specs/agendamento/spec.md` novo,
> `openspec/specs/crm-clientes/spec.md` estendido); change arquivada.

## Context

O produto entregou a Fase 1 (`add-crm-clientes`, arquivada 2026-07-07): CRM de clientes com
histórico, financeiro por visita, dashboard e inatividade, sobre um monorepo pnpm com
`apps/web` (Next.js 15) + `packages/db` (Drizzle/Postgres), escopo de tenant por repositório
(ADR-0007) e o design system Blade. O roadmap registrado naquela exploração define a **Fase 2
= Agenda integrada** (capability `agendamento`). O código já deixou ganchos: o schema de
`visits` antecipa as FKs de serviço/barbeiro; o preset da automação já modela
serviços/barbeiros/horários. Esta change realiza a Fase 2 e, com ela, a fundação técnica
(camada de domínio + worker assíncrono + esqueleto de IA) que as fases de mensageria e IA
(Fase 5) vão consumir.

## Problem

O CRM da Fase 1 organiza o **passado** (quem é o cliente, o que já aconteceu) mas não o
**presente e o futuro** da barbearia: quando cada cliente vem, com qual barbeiro, qual
serviço, o que está livre. Sem uma agenda estruturada, o produto não consegue (a) mostrar o
"próximo agendamento" prometido, (b) medir e reduzir no-show, (c) produzir o relatório mensal
que justifica a mensalidade, nem (d) dar ao bot de IA (Fase 5) uma agenda consultável e
gravável para agendar em nome do cliente. A agenda é o que converte o CRM de "cadastro" em
"sistema operacional da barbearia".

## Goals

- Entregar uma agenda operável pelo barbeiro: dia/semana por barbeiro, criar/confirmar/
  remarcar/cancelar/concluir/marcar-falta.
- Modelar serviços e barbeiros (recurso, sem login) como dados de primeira classe, com grade
  de horário por barbeiro e folgas.
- Calcular disponibilidade automaticamente, sem sobreposição, no fuso da barbearia.
- Unificar agenda e CRM: concluir agendamento gera atendimento + registro financeiro; perfil
  do cliente mostra próximo agendamento; dashboard mostra a agenda de hoje.
- Preparar a arquitetura para o bot: camada de domínio `AgendaService` única (painel + worker
  + tools futuras) com o contrato de *tools* especificado; subir worker + pg-boss.
- Preservar identidade Blade e escopo de tenant em tudo que for novo.

## Non-Goals

- Auto-agendamento pelo cliente final (link público) — Fase 5 (via bot/WhatsApp).
- Envio de mensagem (confirmação/reativação/lembrete) — depende de `whatsapp-canal` (Fase 5,
  provedor em aberto por D2). Worker só registra o que enviaria.
- Conversa de IA — Fase 5. Aqui, só o contrato de tools + esqueleto de `packages/ai`.
- Processamento de pagamento — non-goal do produto v1 (financeiro segue sendo registro).
- Login/papel de funcionário — Fase 4.
- Relatório mensal completo, fidelização, multi-unidade — fases posteriores / anti-ICP.

## Users / Actors Impacted

- **Barbeiro-dono** — opera a agenda (usuário primário).
- **Barbeiro (recurso)** — executa serviços; tem grade e folgas; não acessa o sistema.
- **Cliente final** — sujeito do agendamento; não é usuário nesta fase.
- **Operador Blade** — onboarding/suporte.
- **Bot de IA (futuro)** e **worker (sistema)** — consumidores da camada de domínio.

## Scope

### In scope
- Capability nova `agendamento`: serviços, barbeiros, grade de trabalho, exceções (folga/
  bloqueio), motor de disponibilidade, agendamentos com ciclo de vida completo, regras da
  agenda (settings).
- Evolução de `crm-clientes`: `visits` referencia catálogo; próximo agendamento no perfil;
  concluir agendamento → visita+pagamento; exclusão LGPD abrange agendamentos futuros;
  dashboard com agenda de hoje/no-show.
- Fundação técnica: `packages/core` (domínio + `AgendaService` + contrato de tools),
  `apps/worker` + pg-boss (job real de no-show + esqueletos de confirmação/reativação),
  esqueleto de `packages/ai` (cliente Claude + definições de tools, sem canal).
- Telas: Agenda (dia/semana), formulário de agendamento com seletor de horários livres,
  detalhe/ações do agendamento; Configurações → Serviços, Barbeiros & Horários, regras da
  Agenda; ajustes no perfil do cliente e no dashboard.
- ADR-0008 (camada de domínio + contrato de tools) e ADR-0009 (worker + pg-boss).
- Import opcional idempotente de serviços/barbeiros/horário do preset da automação no
  onboarding.

### Out of scope
- Tudo listado em Non-Goals; qualquer envio real por WhatsApp; qualquer chamada à Claude API
  em runtime; retrofit forçado do histórico de `visits` legadas.

## Business Rules

- `barbershop_id` escopa toda tabela/consulta nova (ADR-0007), com teste de isolamento.
- Barbeiro é recurso sem login; grade por barbeiro; disponibilidade = grade − exceções −
  agendamentos ativos.
- Nenhum agendamento ativo sobrepõe outro do mesmo barbeiro (garantido no banco).
- Concluir agendamento gera exatamente uma `visit` (idempotente); financeiro é registro.
- Fuso America/Sao_Paulo no cálculo e exibição; `timestamptz` no armazenamento.
- Nenhum provedor externo é chamado nesta fase; UI no vocabulário do barbeiro; identidade
  Blade reaproveitada.

## Affected Capabilities
- `agendamento` (nova) · `crm-clientes` (modificada) · `painel-web` (telas).
- Preparadas, não implementadas: `atendimento-ia`, `whatsapp-canal`, `relatorios`.

## Expected Impact

### Code
- Novos pacotes/apps: `packages/core`, `apps/worker`, `packages/ai` (esqueleto).
- `packages/db`: 7 tabelas novas + FKs em `visits` + repositórios tenant-scoped novos.
- `apps/web`: rotas de API novas + telas novas + ajustes em dashboard/perfil/nav.

### Data
- Tabelas: `barbers`, `services`, `barber_services`, `work_schedules`,
  `schedule_exceptions`, `appointments`, `agenda_settings`. `visits` ganha `service_id` e
  `barber_id` (nullable). Migrações Drizzle + uma restrição de exclusão via SQL bruto.

### APIs / Contracts
- REST interno (session-guarded, tenant-scoped) para barbeiros, serviços, grade, exceções,
  disponibilidade, agendamentos e regras da agenda. Contrato de *tools* do bot documentado no
  design e refletido em `packages/ai` (schemas), sem execução em runtime.

### Integrations
- Nenhuma integração externa ativa. Seams: `appointment.source` (`painel`/`bot`/`importacao`),
  `AgendaService` como fronteira do bot, jobs de confirmação/reativação como esqueleto.

### Operations
- Novo processo `worker` no Docker Compose (local e `infra/stack`), mesmo Postgres. pg-boss
  cria seu schema no banco. Runbook de onboarding atualizado (serviços/barbeiros/grade).

### Security / Privacy (LGPD)
- Agendamento vincula dado pessoal (cliente): exclusão do cliente cancela/anonimiza
  agendamentos futuros e preserva agregados. Logs sem telefone completo/conteúdo; `tenant_id`
  e correlação nos logs do worker.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Motor de disponibilidade (grade por barbeiro, fuso, intervalos) com bug | Alto | `AgendaService` isolado + testes de unidade exaustivos antes das telas |
| Double booking por concorrência | Alto | Restrição de exclusão no Postgres (btree_gist) + checagem no repositório |
| Escopo grande | Médio | `tasks.md` faseado, domínio antes de UI, cada grupo verificável |
| Worker sem uso real na fase | Baixo | Job real de no-show + esqueletos que registram (não enviam) |
| Fuso mal tratado | Alto | Padrão único BRT documentado, `timestamptz`, testes de fuso |
| Confusão com o preset da automação | Médio | Fronteira explícita; import único opcional, não sincronização |

## Success Criteria
- Barbeiro cadastra serviços, barbeiros e grade; a agenda mostra dia/semana por barbeiro.
- Criar agendamento só oferece horários realmente livres; tentar sobrepor é recusado (inclui
  concorrência, provado por teste).
- Concluir um agendamento cria a visita e (se informado) o pagamento; concluir de novo não
  duplica.
- No-show marca-se manualmente e por varredura automática; agendamento concluído/cancelado
  nunca vira falta.
- Perfil do cliente mostra o próximo agendamento; dashboard mostra a agenda de hoje.
- Excluir um cliente com agendamento futuro cancela/anonimiza sem quebrar a agenda.
- Testes de isolamento de tenant passam para toda tabela nova; 0 ocorrências de
  "CRM"/"booking"/"slot" nas telas; suíte completa (unit/contrato/e2e) verde.
- `pnpm build` e `pnpm typecheck` limpos; worker sobe e processa o job de no-show; nenhuma
  chamada externa (custo dentro de D4).

## Assumptions
- Preço do serviço = preço de tabela; valor pago segue em `payments_log`.
- Fuso fixo America/Sao_Paulo na Fase 2.
- Volume pequeno por barbearia → disponibilidade computada sob demanda, sem cache dedicado.
- Stack segue ADRs vigentes + 0008/0009.

## Open Questions
- Antecedência mínima e janela de cancelamento — padrões configuráveis; refinar com uso.
- Disponibilidade "qualquer barbeiro" como união — validar com uso real.
- Registrar a change no índice `openspec/changes/README.md` e atualizar
  `openspec/specs/README.md` na conclusão (etapa 11) — pendente por ora para não alterar
  arquivos existentes antes da aprovação (ver `tasks.md`, grupo final).
