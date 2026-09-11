# Proposal: Confirmação automática de agendamento

## Change ID
`add-confirmacao-agendamento`

## Status
**Approved** (2026-09-11) <!-- Exploração concluída em 2026-09-11: as 3 perguntas bloqueantes
(reenvio, gate por barbearia, Done sem template real) foram respondidas por Matheus e estão
registradas em exploration.md, seção "Decisões da discussão". Matheus aprovou este proposal e
os deltas de spec ("aprovo, continue") na mesma data — etapa 5 concluída. design.md e tasks.md
produzidos na sequência; implementação segue em `feature/add-confirmacao-agendamento`. -->

## Context
Ver [exploration.md](exploration.md) e
[`docs/sdd/06-plano-execucao-fase-5.md`](../../../docs/sdd/06-plano-execucao-fase-5.md) § 8.
Terceira das 4 changes da Fase 5; depende inteiramente de `add-whatsapp-canal` (canal e envio de
template já existem) e `add-atendimento-ia` (loop de conversa e handover já existem). A change
seguinte (`add-reativacao-clientes`) não depende desta, mas segue a mesma sequência.

## Problem
`apps/worker/src/jobs/send-confirmation.ts` já seleciona corretamente os agendamentos que
entram na janela de `confirmation_lead_hours`, mas é um esqueleto honesto (Fase 2, Non-Goal
explícito): só loga, nunca envia. O produto vende confirmação automática como uma das duas
provas de que resolve a dor central ("zap sem operador" → no-show), e essa promessa ainda não é
real. Além disso, a exploração encontrou uma lacuna que não é só "ligar o envio": o bot do
`atendimento-ia` hoje não tem nenhuma tool para marcar um agendamento como confirmado — se o
cliente responder "sim" ao lembrete, o sistema não teria como registrar isso de fato.

## Goals
- Enviar o template de confirmação aprovado pela Meta, **uma única vez por agendamento**,
  quando ele entra na janela de `confirmation_lead_hours` da barbearia — sem repetir o envio,
  independentemente do cliente responder ou não (decisão registrada na exploração).
- Restringir o envio a barbearias com confirmação automática habilitada (campo booleano em
  `agenda_settings`, ligado manualmente pelo Matheus só depois de confirmar o template aprovado
  para aquela barbearia — decisão registrada na exploração).
- Adicionar a tool `confirmar_agendamento` ao contrato do bot (`packages/core/src/agenda/tools.ts`
  + reexposição em `packages/ai`), mapeando 1:1 para `AgendaService.confirmAppointment`
  (já existe, já é idempotente).
- Fazer a resposta do cliente fluir pelo `atendimento-ia` já existente: confirmação chama a
  tool nova; pedido de remarcação usa `remarcar_agendamento` (já existe) — nenhuma tool nova
  para remarcação.
- Registrar o envio do lembrete (para permitir, em change futura, que `relatorios` calcule
  "no-show evitado" — fora de escopo aqui).
- Continuar escopado por `barbershop_id`, sem log de conteúdo de mensagem nem telefone completo.

## Non-Goals
- Reenvio/segunda tentativa do lembrete (decidido: uma única vez).
- UI de configuração nova no painel para ligar `confirmationAutomationEnabled` — ativação é
  operação interna do Matheus (via script/seed), não self-service nesta change.
- `add-reativacao-clientes` (próxima change — cliente inativo, categoria *marketing*).
- Delta em `relatorios` para exibir "no-show evitado" — avaliação explicitamente adiada, como
  o plano § 8 já registrava.
- Contratação do BSP e submissão/aprovação do template real à Meta — tarefa comercial do
  Matheus, mesmo padrão usado em `add-whatsapp-canal` (grupo 9 do tasks.md daquela change).
- Testar o envio com o BSP e o template reais — decidido (Bloqueante 3) que o Done técnico
  desta change fecha com dry-run/mock do adapter; o teste real fica como tarefa pendente
  separada, assim que o template estiver aprovado.

## Users / Actors Impacted
- Cliente final da barbearia (recebe o lembrete, responde).
- Barbeiro-dono / funcionário (se beneficia do no-show evitado).
- Operador Blade (Matheus) — dono do pré-requisito operacional (BSP + template) e de ligar o
  campo de ativação por barbearia.

## Scope
### In scope
- `apps/worker/src/jobs/send-confirmation.ts`: para de só logar — envia o template via
  `WhatsAppProvider.sendTemplate`, registra o envio, respeita o gate por barbearia.
- `packages/db`: campo `confirmationAutomationEnabled` (booleano, default `false`) em
  `agenda_settings`; registro de envio do lembrete (tabela ou coluna — decisão no design.md,
  respeitando a separação de capability: dado de `confirmacao-agendamento`, não de
  `agendamento`).
- `packages/core/src/agenda/tools.ts`: tool nova `confirmar_agendamento`.
- `packages/ai`: reexpõe a tool nova no formato do provedor de IA, no mesmo padrão das 4 já
  existentes.
- `apps/worker`: o job de inbound já existente (`process-inbound.ts`, da change
  `add-atendimento-ia`) passa a ter a tool nova disponível no loop — sem mudança de fluxo, só
  de tools disponíveis.

### Out of scope
- Tudo listado em Non-Goals.
- Qualquer mudança em `packages/whatsapp` (interface `WhatsAppProvider`/`sendTemplate` já
  cobre o necessário) ou no loop de conversa em si (`packages/ai/src/loop.ts`) além de registrar
  a tool nova.

## Business Rules
- Envio único por agendamento — o job nunca reseleciona um agendamento já notificado.
- Envio só ocorre para barbearias com `confirmationAutomationEnabled = true`.
- Confirmação e remarcação são sempre efeitos de tool, nunca inferidas de texto livre do modelo
  (mesma regra já vigente em `atendimento-ia`).
- `confirmar_agendamento` é idempotente: chamar novamente sobre um agendamento já `confirmado`
  não falha nem gera efeito duplicado (herdado de `AgendaService.confirmAppointment`).
- Todo texto do template segue a voz "barbearia → cliente" do guia de copy § 13.9 e passa pelo
  checklist § 14 antes de ser submetido à Meta.

## Affected Capabilities
- `confirmacao-agendamento` (nova)
- `atendimento-ia` (delta: nova tool no contrato do bot)

## Expected Impact
### Code
- `apps/worker/src/jobs/send-confirmation.ts` (reescrito — envia de fato).
- `packages/core/src/agenda/tools.ts` (tool nova).
- `packages/ai` (reexposição da tool nova).
- `packages/db` (schema + repositório para o campo de ativação e o registro de envio).

### Data
- Migração nova: coluna `confirmation_automation_enabled` em `agenda_settings` (default
  `false`, não quebra barbearias existentes) + tabela/coluna de registro de envio do lembrete
  (detalhe no design.md).

### APIs / Contracts
- Nenhum endpoint HTTP novo.

### Integrations
- `WhatsAppProvider.sendTemplate` (já existe) — este é o primeiro consumidor real dele em
  produção (até aqui só `whatsapp-canal` tinha a interface, sem quem chamasse).

### Operations
- Runbook: como o Matheus liga `confirmationAutomationEnabled` para uma barbearia depois de
  confirmar o template aprovado — a decidir no design.md (script CLI, no padrão de
  `migrate-automation-agenda.ts`, é o candidato natural).

### Security / Privacy (LGPD)
- Mesmo regime já em vigor em `whatsapp-canal`/`atendimento-ia`: nunca logar conteúdo de
  mensagem nem telefone completo. O registro de envio do lembrete guarda só identificadores
  técnicos (id do agendamento, barbearia, timestamp).

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Reenvio duplicado do template (sem controle de "já enviado") | Custo, spam percebido, risco de qualidade do número na Meta | Registro de envio consultado antes de cada seleção; decidido: envio único (exploration.md) |
| Bot sem tool para confirmar — cliente acha que confirmou, banco discorda | Perda de confiança, dado incorreto | Tool `confirmar_agendamento` nesta change, com teste que prova a transição real no banco |
| Barbearia sem template aprovado recebe tentativa de envio | Erro em produção, ruído de log, possível rejeição do BSP | Gate `confirmationAutomationEnabled`, default `false`, ligado manualmente só após confirmação do template |
| Template não aprovado a tempo de testar o caminho real | Change fecha sem validação ponta a ponta com o provedor real | Decidido: Done técnico com dry-run/mock (Bloqueante 3); teste real registrado como pendência separada |
| Race entre seleção e envio (agendamento cancelado/remarcado no meio da execução do job) | Envio de lembrete para agendamento que não existe mais nesse horário | Reler o status do agendamento imediatamente antes de enviar, dentro do próprio job |

## Success Criteria
- `pnpm --filter @blademidia/core build`/typecheck e `pnpm --filter @blademidia/worker
  build`/typecheck sem erro.
- Testes automatizados cobrindo: seleção respeita o gate por barbearia; envio único (não
  reseleciona agendamento já notificado); `confirmar_agendamento` transiciona
  `agendado → confirmado` e é idempotente; tool nova aparece no formato de tool-use do
  `packages/ai`; falha do provedor no envio de um agendamento não interrompe os demais da
  mesma execução.
- Teste de isolamento de tenant para a tabela/coluna nova.
- Fluxo real (com mock do `WhatsAppAdapter`, no padrão de `add-whatsapp-canal`): agendamento
  entra na janela → job registra "enviaria" e chama `sendTemplate` mockado → resposta de
  confirmação simulada → `confirmar_agendamento` chamado → status `confirmado` no banco.
- **Pendente de pré-requisito operacional** (não bloqueia o fechamento técnico): template real
  submetido e aprovado pela Meta, para o primeiro envio real em produção.

## Assumptions
- `confirmation_lead_hours` e a UI de configuração dessa janela (Fase 2) não mudam nesta change.
- `confirmationAutomationEnabled` é ativado por ferramenta interna (script), não por tela nova
  do painel — poucas barbearias, ativação manual e pontual pelo Matheus é suficiente para o
  volume atual.
- O adapter concreto de `sendTemplate` (`packages/whatsapp/src/cloud-api/adapter.ts`) já
  implementa o formato de template da Meta Cloud API; a verificação contra o BSP real
  específico continua pendência de `add-whatsapp-canal` (não desta change).

## Open Questions
- Nome exato do template e texto final (rascunho nasce no `design.md`, seguindo o guia de copy
  § 13.9; submissão e aprovação são tarefa do Matheus, fora do fluxo técnico).
- Quando `relatorios` deve ganhar o delta de "no-show evitado" — decidido adiar, sem data
  definida ainda.
