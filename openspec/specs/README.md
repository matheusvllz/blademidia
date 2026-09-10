# Registro de Capabilities

Specs permanentes — a fonte da verdade do comportamento do sistema. Cada capability tem um
diretório com `spec.md`, criado/atualizado **somente** pela conclusão de uma change (deltas
aplicados na etapa 11 do [workflow](../workflow.md)).

## Capabilities especificadas

| Capability | Spec | Estabelecida por |
|---|---|---|
| `crm-clientes` | [crm-clientes/spec.md](crm-clientes/spec.md) | change `add-crm-clientes` (Fase 1, 2026-07-07); estendida por `add-agendamento` (Fase 2, 2026-07-15) |
| `agendamento` | [agendamento/spec.md](agendamento/spec.md) | change `add-agendamento` (Fase 2, 2026-07-15); estendida por `add-agenda-visao-semanal` (2026-07-15) e `add-fidelizacao-e-funcionarios` (Fase 4, 2026-07-16) |
| `relatorios` | [relatorios/spec.md](relatorios/spec.md) | change `add-relatorios` (Fase 3, 2026-07-15) |
| `fidelizacao-clientes` | [fidelizacao-clientes/spec.md](fidelizacao-clientes/spec.md) | change `add-fidelizacao-e-funcionarios` (Fase 4, 2026-07-16) |
| `auth-tenancy` | [auth-tenancy/spec.md](auth-tenancy/spec.md) | change `add-fidelizacao-e-funcionarios` (Fase 4, 2026-07-16) |
| `whatsapp-canal` | [whatsapp-canal/spec.md](whatsapp-canal/spec.md) | change `add-whatsapp-canal` (Fase 5, 2026-09-10); `crm-clientes` recebeu delta (exclusão LGPD passa a anonimizar conversas) |

## Capabilities candidatas (ainda não especificadas)

Mapa inicial do domínio, derivado do [project.md](../project.md). Nomes e limites serão
confirmados quando cada capability receber sua primeira change.

| Capability | Responsabilidade | Observações |
|---|---|---|
| `financeiro-clientes` | Registro de transações por cliente/visita (sem processar pagamento) | Candidata surgida em `add-crm-clientes`; o registro por visita já vive na spec de `crm-clientes` na Fase 1 |
| `atendimento-ia` | Conversação com IA, roteamento para fluxos, escalação para humano | D3/ADR-0005; `add-agendamento` deixou o contrato de tools pronto (`packages/core/agenda/tools.ts`, re-exposto em `packages/ai`) e `add-whatsapp-canal` entregou o canal — falta só conectar o loop de conversa |
| `confirmacao-agendamento` | Confirmação automática 24h antes; tratamento da resposta | Fase 5; a seleção de quem confirmar já roda como esqueleto no worker (`agenda.send-confirmation`, só loga, não envia) |
| `reativacao-clientes` | Detecção de inatividade (21+ dias) e mensagem de reativação | Fase 5; a detecção de inatividade (dado) já existe em `crm-clientes`, e a seleção já roda como esqueleto no worker (`crm.reactivation-sweep`, só loga, não envia) — falta o envio |
| `painel-web` | Dashboard e visões operacionais para barbeiro e operador Blade | Telas do produto nasceram em `apps/web` com `add-crm-clientes`; `add-agendamento` acrescentou `/agenda` e o hub de Configurações; `add-relatorios` acrescentou `/relatorios`; `add-fidelizacao-e-funcionarios` recortou dashboard/agenda por papel e acrescentou gestão de login em Configurações → Barbeiros |

Futuras (fora da v1): `billing`, `onboarding-self-service`.

## Regras

1. Capability = área de comportamento coesa do produto, não um módulo de código.
2. A spec descreve comportamento observável — nunca implementação.
3. Alterar uma spec permanente diretamente é proibido; toda mudança passa por uma change.
