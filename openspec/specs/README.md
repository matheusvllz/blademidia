# Registro de Capabilities

Specs permanentes — a fonte da verdade do comportamento do sistema. Cada capability tem um
diretório com `spec.md`, criado/atualizado **somente** pela conclusão de uma change (deltas
aplicados na etapa 11 do [workflow](../workflow.md)).

## Capabilities candidatas (nenhuma especificada ainda)

Mapa inicial do domínio, derivado do [project.md](../project.md). Nomes e limites serão
confirmados quando cada capability receber sua primeira change.

| Capability | Responsabilidade | Observações |
|---|---|---|
| `auth-tenancy` | Contas, usuários, papéis e isolamento por barbearia (tenant) | Base de tudo; primeira a especificar |
| `crm-clientes` | Cadastro de clientes finais, histórico de visitas, status ativo/inativo | Núcleo da retenção |
| `agendamento` | Serviços, barbeiros, horários, criação/cancelamento de agendamentos | |
| `whatsapp-canal` | Envio/recebimento de mensagens; abstração do provedor (D2/ADR-0004) | Risco crítico: ban do número |
| `atendimento-ia` | Conversação com IA, roteamento para fluxos, escalação para humano | D3/ADR-0005 |
| `confirmacao-agendamento` | Confirmação automática 24h antes; tratamento da resposta | |
| `reativacao-clientes` | Detecção de inatividade (21+ dias) e mensagem de reativação | |
| `painel-web` | Dashboard e visões operacionais para barbeiro e operador Blade | |
| `relatorios` | Relatório mensal de resultados (justifica a mensalidade) | |

Futuras (fora da v1): `billing`, `onboarding-self-service`.

## Regras

1. Capability = área de comportamento coesa do produto, não um módulo de código.
2. A spec descreve comportamento observável — nunca implementação.
3. Alterar uma spec permanente diretamente é proibido; toda mudança passa por uma change.
