# Proposal: Canal WhatsApp (Meta Cloud API via BSP)

## Change ID
`add-whatsapp-canal`

## Status
**Done** (2026-09-10) <!-- Aprovação: perguntas bloqueantes desta change foram todas
respondidas por Matheus em 2026-09-07 (registradas em docs/sdd/06-plano-execucao-fase-5.md e
em exploration.md); em 2026-09-10 Matheus instruiu explicitamente avançar para a implementação
("faça a próxima etapa do projeto"). Implementada e verificada de ponta a ponta (ver
tasks.md) na mesma sessão. Pendente, fora do escopo técnico desta change (tarefa comercial do
Matheus): contratar o BSP específico e configurar credenciais reais — grupo 9 do tasks.md,
deliberadamente por último. -->

## Context
Ver [exploration.md](exploration.md) e `docs/sdd/06-plano-execucao-fase-5.md` (plano de
execução completo da Fase 5, com decisões de arquitetura e contratos externos congelados).
Primeira das 4 changes da Fase 5 (canal WhatsApp + atendimento por IA); as outras três
(`atendimento-ia`, `confirmacao-agendamento`, `reativacao-clientes`) dependem inteiramente
desta.

## Problem
O produto não tem canal de mensagem no WhatsApp. Toda a tese central da Blade — "o zap
continua atendendo quando o dono não pode" — depende de existir um canal real de entrada e
saída de mensagens escopado por barbearia.

## Goals
- Interface `WhatsAppProvider` (`packages/whatsapp`), desacoplada do provedor concreto.
- Ingestão assíncrona de mensagens (webhook → persiste → enfileira → worker processa —
  ADR-0011), com verificação de assinatura e deduplicação por `wamid`.
- Persistência de conversas e mensagens, escopada por `barbershop_id` (ADR-0007).
- Envio de texto livre (dentro da janela de 24h) e de template (fora dela).
- `handover` bot/humano, cobrindo tanto ação futura no painel quanto mensagem do barbeiro
  vinda do próprio WhatsApp Business App (coexistência).
- Opt-out (`PARE`/`SAIR`).
- Anonimização das mensagens de WhatsApp na exclusão LGPD de cliente (delta em `crm-clientes`).
- Tela `/conversas` de leitura (histórico), escopada por papel.

## Non-Goals
- Qualquer chamada à Claude API / loop de conversa — é `add-atendimento-ia`.
- Envio automático agendado (confirmação, reativação) — são `add-confirmacao-agendamento` e
  `add-reativacao-clientes`.
- Caixa de entrada completa no painel (responder pelo produto) — o barbeiro responde pelo
  próprio app; se um dia fizer sentido de produto, é change futura.
- Escolha/contratação do BSP e submissão de templates — decisão e tarefa comercial do Matheus.

## Users / Actors Impacted
- Cliente final da barbearia.
- Barbeiro-dono / funcionário (responde pelo WhatsApp Business App dele).
- Operador Blade (Matheus).

## Scope
### In scope
- `packages/whatsapp`: interface + adapter dry-run + adapter concreto (formato Meta Cloud API
  como referência, ver Assumptions).
- `packages/db`: tabelas `whatsapp_conversations`, `whatsapp_messages`, repositórios
  escopados, anonimização integrada à exclusão LGPD de cliente.
- `apps/web`: rota de webhook, tela `/conversas` (leitura).
- `apps/worker`: job consumidor da fila de mensagens recebidas.

### Out of scope
- Tudo listado em Non-Goals.

## Business Rules
- Um número de WhatsApp por barbearia; `client_id` da conversa é nullable.
- Nenhum texto livre fora da janela de 24h da última mensagem recebida do cliente — só
  template (o envio de template real fica para as changes 3/4; esta change só impede o texto
  livre indevido).
- `wamid` único por mensagem — reentrega nunca duplica processamento.
- Exclusão LGPD de cliente anonimiza (`NULL`) telefone e desvincula as conversas; conteúdo
  operacional das mensagens permanece.
- Opt-out (`PARE`/`SAIR`) interrompe qualquer envio futuro àquela conversa.

## Affected Capabilities
- `whatsapp-canal` (nova)
- `crm-clientes` (delta — anonimização de mensagens na exclusão)

## Expected Impact
### Code
- `packages/whatsapp` (novo pacote).
- `packages/db`: novo schema, migração, repositórios.
- `apps/web`: `app/api/webhooks/whatsapp/route.ts`, `app/conversas/**`,
  `app/api/conversations/**`.
- `apps/worker`: `src/jobs/process-inbound.ts`.

### Data
- Tabelas novas: `whatsapp_conversations`, `whatsapp_messages`. Nenhuma migração de dado
  existente.

### APIs / Contracts
- `GET/POST /api/webhooks/whatsapp` (verificação de challenge + recepção de eventos).
- Leitura de conversas é via Server Component (`/conversas`, `/conversas/:id`), sem rota de
  API JSON dedicada — achado durante a implementação, ver design.md § API/Contract Design.

### Integrations
- BSP escolhido em § 5.9 do plano (mensalidade fixa) — adapter concreto segue o formato Meta
  Cloud API como base (ver Assumptions), a confirmar contra a documentação do BSP real.

### Operations
- `docs/operations/onboarding-produto.md` ganha o fluxo de Embedded Signup com coexistência.
- `.env.example` ganha as variáveis do provedor (nomes genéricos até o BSP ser escolhido).

### Security / Privacy (LGPD)
- Conteúdo de mensagem e telefone completo nunca em log.
- Anonimização (não exclusão física) das mensagens ao excluir cliente — consistente com o
  padrão já usado em `clients.phone`.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Formato do adapter divergir do BSP real | Retrabalho no adapter concreto quando o BSP for escolhido | Interface `WhatsAppProvider` isola o domínio; só o adapter muda |
| Duas respostas simultâneas (bot futuro + barbeiro pelo app) | Cliente recebe respostas conflitantes | `handover` + lock de enfileiramento por conversa (ADR-0011) |
| Reentrega duplicando processamento | Mensagem processada/respondida duas vezes | `wamid` único no banco |

## Success Criteria
- `pnpm --filter @blademidia/whatsapp build` (ou equivalente) compila sem erro.
- Migração aplica em Postgres real; teste de isolamento de tenant verde.
- `curl` real contra o webhook: challenge respondido em texto puro; POST assinado persiste e
  responde 200; não assinado responde 401; duplicado não cria segunda linha.
- Boot real do worker consome a fila sem erro.
- Tela `/conversas` renderiza o histórico real, escopada por papel.
- Exclusão LGPD de um cliente de teste anonimiza as mensagens associadas (verificado por
  query direta).

## Assumptions
- O adapter concreto desta change é escrito contra o formato documentado da Meta Cloud API
  (endpoint de envio, verificação de challenge, assinatura HMAC, estrutura do payload — ver
  § 4.4 do plano de execução), por ser o contrato mais estável e documentado publicamente, e
  porque muitos BSPs de mensalidade fixa espelham esse formato quase sem alteração. **Esta é
  uma premissa técnica, não uma confirmação do BSP real** — antes de qualquer envio de
  produção, confirmar contra a documentação do BSP efetivamente contratado (Open Question
  abaixo) e ajustar o adapter se divergir.
- ADR-0001 a ADR-0011 aceitas sem mudança de conteúdo.

## Open Questions
- Qual BSP específico será contratado (§ 5.9/5.10 do plano) — não bloqueia esta change (a
  interface abstrai o provedor e o adapter dry-run não depende disso), mas bloqueia a
  configuração final de credenciais reais e a validação do adapter contra o formato real do
  BSP. Tarefa comercial do Matheus, fora desta change.
