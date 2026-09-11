# Proposal: Reativação automática de clientes inativos

## Change ID
`add-reativacao-clientes`

## Status
**Approved** (2026-09-11) <!-- Exploração concluída em 2026-09-11: as 2 perguntas bloqueantes
(escopo da régua; regra de reenvio) foram respondidas por Matheus e estão registradas em
exploration.md, seção "Decisões da discussão". Matheus aprovou este proposal e os deltas de
spec ("pode continuar") na mesma data — etapa 5 concluída. -->

## Context
Ver [exploration.md](exploration.md) e
[`docs/sdd/06-plano-execucao-fase-5.md`](../../../docs/sdd/06-plano-execucao-fase-5.md) § 9 —
**marcada como a change de maior risco da Fase 5**: categoria de template *marketing* (não
*utility*), envio em lote para quem não pediu nada, regras de opt-out mais rígidas, custo real
sem desconto de volume. Quarta e última change da Fase 5; depende de `add-whatsapp-canal`
(canal, opt-out) e `add-atendimento-ia` (loop de conversa, para quando o cliente responder).

## Problem
`apps/worker/src/jobs/reactivation-sweep.ts` já seleciona corretamente os clientes inativos
(reaproveitando `inactivityDaysThreshold` da Fase 1) mas é um esqueleto honesto: só loga a
contagem, nunca envia. A segunda das duas provas da dor central ("zap sem operador" → cliente
sumido) continua sem solução automática — o dono não tem tempo de chamar de volta quem sumiu,
a mesma causa raiz do no-show que `add-confirmacao-agendamento` já resolveu para a primeira
prova.

## Goals
- Enviar o template de reativação aprovado pela Meta (categoria *marketing*) para clientes que
  ultrapassam `inactivityDaysThreshold` (já configurável por barbearia, sem mudança aqui),
  respeitando um limite diário por barbearia (throttling).
- Nunca reenviar para o mesmo cliente antes de um **novo ciclo de inatividade** — só volta a
  ser elegível depois de uma visita nova seguida de um novo período de inatividade (decisão
  registrada na exploração).
- Respeitar opt-out sem exceção (mecanismo já existente de `whatsapp-canal`).
- Excluir da seleção automática clientes que nunca tiveram nenhuma visita registrada (o texto
  "você sumiu" não se aplica; ver Assumptions).
- Registrar o envio (para permitir, em change futura, a métrica "cliente reativado" no
  relatório — fora de escopo aqui).
- Documentar a base legal (legítimo interesse, com opt-out como salvaguarda) explicitamente no
  design.md, por exigência do plano de execução — não como decisão implícita.

## Non-Goals
- Régua em múltiplos degraus (21/30/45 dias) — decidido explicitamente NÃO fazer parte desta
  v1 (Bloqueante 1 da exploração); fica registrada como possível change futura.
- UI de configuração nova para ligar a automação — script CLI, mesmo padrão de
  `add-confirmacao-agendamento`.
- Delta em `relatorios` para exibir "cliente reativado"/"R$ recuperado".
- Vincular causalmente uma visita futura a um envio específico de reativação.
- Contratação do BSP e submissão/aprovação do template real à Meta — tarefa comercial do
  Matheus (mesmo padrão das 2 changes anteriores da Fase 5).
- Fazer a conta de custo contra a base real de um cliente antes do primeiro envio — tarefa
  operacional obrigatória do Matheus (plano § 9), registrada como bloqueio de produção, não do
  fechamento técnico.
- Testar o envio com o BSP e o template reais — Done técnico fecha com dry-run/mock, mesmo
  critério já usado em `add-confirmacao-agendamento`.

## Users / Actors Impacted
- Cliente final inativo da barbearia (recebe a mensagem de reativação).
- Barbeiro-dono / funcionário (se beneficia do cliente reativado).
- Operador Blade (Matheus) — pré-requisito operacional (BSP + template marketing), conta de
  custo obrigatória, ativação por barbearia.

## Scope
### In scope
- `packages/db`: `crm_settings` ganha `reactivationAutomationEnabled` (booleano, default
  `false`) e `reactivationDailyCap` (inteiro, default 5) — gate e throttling por barbearia.
  Tabela nova `reactivation_sends` (log de envio, com snapshot do `lastVisitAt` no momento do
  envio, para aplicar a regra de "novo ciclo").
  Repositório novo `listClientsNeedingReactivation(barbershopId)` — seleção própria do canal
  (telefone + gate + regra de reenvio), análoga a `listAppointmentsNeedingConfirmation`, sem
  adicionar telefone à função de dashboard existente.
- `packages/core`: nenhuma tool nova (resposta do cliente usa o loop/tools já existentes).
- `apps/worker`: `reactivation-sweep.ts` reescrito — envia de fato, aplica o limite diário,
  registra o envio.
- Script `enable-reactivation-automation.ts` (mesmo padrão de
  `enable-confirmation-automation.ts`).

### Out of scope
- Tudo listado em Non-Goals.
- Qualquer mudança em `packages/whatsapp`, `packages/ai` ou no loop de conversa.
- Qualquer mudança na UI/regra de `inactivityDaysThreshold` já existente (Fase 1).

## Business Rules
- Envio só ocorre para barbearias com `reactivationAutomationEnabled = true`.
- Envio respeita `reactivationDailyCap` por barbearia por execução do job — nunca despeja a
  lista inteira de uma vez.
- Cliente só é elegível de novo depois de uma visita registrada após o último envio de
  reativação (novo ciclo de inatividade) — nunca reenvia em loop para quem continua sumido sem
  ter respondido.
- Cliente sem nenhuma visita registrada (`lastVisitAt = null`) nunca entra na seleção
  automática.
- Opt-out interrompe qualquer envio futuro, sem exceção — mesmo mecanismo de `whatsapp-canal`.
- Todo texto do template segue a voz "barbearia → cliente" do guia de copy § 13.9 (vocabulário
  "sumiu", já validado) e passa pelo checklist § 14 antes de ser submetido à Meta.

## Affected Capabilities
- `reativacao-clientes` (nova)

## Expected Impact
### Code
- `apps/worker/src/jobs/reactivation-sweep.ts` (reescrito — envia de fato).
- `packages/db` (schema + repositório: `crm_settings` +2 campos, tabela `reactivation_sends`,
  `listClientsNeedingReactivation`).

### Data
- Migração nova: 2 colunas em `crm_settings` (defaults seguros, não quebram barbearias
  existentes) + tabela `reactivation_sends`.

### APIs / Contracts
- Nenhum endpoint HTTP novo.

### Integrations
- `WhatsAppProvider.sendTemplate` (já existe) — segundo consumidor real, categoria de template
  diferente (marketing vs. utility).

### Operations
- Runbook: passo novo de ativação (script), análogo ao de confirmação, documentando também o
  pré-requisito de "fazer a conta de custo" antes do primeiro envio real.

### Security / Privacy (LGPD)
- Base legal: **legítimo interesse** (relação prévia cliente-barbearia), com opt-out como
  salvaguarda — documentado explicitamente no design.md, não como decisão implícita. Mesmo
  regime de log já em vigor (nunca conteúdo de mensagem nem telefone completo).

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Reclamação de spam / rebaixamento de qualidade do número | Alto (única com custo real, sem desconto de volume) | `reactivationDailyCap`, opt-out sem exceção, seleção pelos mais antigos primeiro |
| Reenvio em loop para quem já ignorou | Percepção de spam, reputação | Regra de "novo ciclo de inatividade" — só reenvia após visita nova + inatividade nova |
| Custo de marketing multiplicado pela base inativa | Financeiro | Conta obrigatória contra base real antes do primeiro envio real (tarefa do Matheus, plano § 9) |
| Base legal contestada | Legal | Legítimo interesse documentado explicitamente no design.md; dúvida jurídica real escala para advogado, não decisão de agente |
| Template não aprovado a tempo de testar o caminho real | Change fecha sem validação ponta a ponta com o provedor real | Done técnico com dry-run/mock (mesmo critério de `add-confirmacao-agendamento`) |

## Success Criteria
- `pnpm --filter @blademidia/db build`/typecheck e `pnpm --filter @blademidia/worker
  build`/typecheck sem erro.
- Testes automatizados cobrindo: seleção respeita gate + cap diário + regra de "novo ciclo" +
  exclusão de cliente sem visita nenhuma; envio único por ciclo (não reenvia em loop); opt-out
  bloqueia envio; falha de um cliente não interrompe o lote; isolamento de tenant.
- Fluxo real com dry-run (mesmo padrão de `add-confirmacao-agendamento`): cliente inativo
  elegível → job "enviaria" (log dry-run) → registro criado → simular resposta do cliente
  (segue o loop normal do `atendimento-ia`, sem tool nova).
- **Pendente de pré-requisito operacional** (não bloqueia o fechamento técnico): template real
  de marketing submetido e aprovado pela Meta, e conta de custo feita contra base real antes do
  primeiro envio em produção.

## Assumptions
- Cliente sem `lastVisitAt` (nunca visitou) fica fora da seleção automática — ele continua
  contando como "inativo" no dashboard da Fase 1, só não recebe mensagem automática (decisão de
  arquiteto, marcada como não bloqueante na exploração; reverter é simples se Matheus discordar).
- `reactivationDailyCap` nasce com default 5 por barbearia por execução do job (que já roda
  1x/dia) — ajustável depois sem mudança de arquitetura.
- "Done técnico sem template real aprovado" segue o mesmo critério já usado em
  `add-confirmacao-agendamento`.

## Open Questions
- Régua em múltiplos degraus (21/30/45 dias) fica para change futura, sem data definida —
  citada aqui só para não se perder.
- Nome exato do template e texto final (rascunho nasce no `design.md`, submissão é tarefa do
  Matheus).
