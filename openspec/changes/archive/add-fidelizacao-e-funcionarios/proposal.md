# Proposal: Fidelização de Clientes + Papel de Funcionário (Produto — Fase 4)

## Change ID
`add-fidelizacao-e-funcionarios`

## Status
Done <!-- Draft | Proposed | Approved | In Progress | In Review | Done | Rejected | Superseded -->

> Aprovada por Vítor em 2026-07-16 (portão da etapa 5 do [workflow](../../workflow.md)),
> incluindo `design.md`/`tasks.md` (produzidos junto, por pedido explícito) e a execução
> (portão adicional pedido por Vítor). Implementada por completo na branch
> `feature/add-fidelizacao-e-funcionarios` (5 grupos do `tasks.md`, todos com evidência —
> código, 104 testes automatizados e verificação via HTTP real com dois barbeiros/dois papéis
> reais, incluindo os caminhos proibidos E os permitidos). Dois achados de segurança reais
> (vazamento de hash de senha) pegos e corrigidos durante a implementação, antes de qualquer
> exposição externa. Deltas aplicados às specs permanentes em 2026-07-16
> (`openspec/specs/fidelizacao-clientes/spec.md` e `openspec/specs/auth-tenancy/spec.md`
> novos, `openspec/specs/agendamento/spec.md` estendido); change arquivada. Ver
> [exploration.md](./exploration.md), "Decisões da discussão", para o histórico das escolhas.

## Context

O produto entregou CRM (Fase 1), Agenda (Fase 2) e Relatórios (Fase 3). O roadmap definia a
Fase 4 como "Fidelização e Configurações avançadas" — nesta change, resolvida como duas
capabilities que entram juntas por decisão explícita de Vítor: `fidelizacao-clientes` (feature
de produto, baixo risco) e `auth-tenancy` (mudança estrutural de autenticação/autorização, alto
risco — primeira vez que o produto tem mais de um papel de usuário).

## Problem

**Fidelização**: o produto não tem nenhum mecanismo para reconhecer clientes recorrentes além
do dashboard de inatividade (que olha para trás, "sumiu"). Não existe um sinal de "para frente"
que incentive a recorrência — a pesquisa de mercado da Fase 1 já apontou que contagem simples
("a cada N visitas, um benefício") é o formato que funciona para o ICP.

**Papel de funcionário**: hoje **só existe um login por barbearia** (o dono). Barbearias com
mais de um barbeiro (o ICP é 1-3 cadeiras) não têm como dar acesso à agenda para os outros
barbeiros sem compartilhar a própria senha do dono — o que exporia financeiro e configurações
a quem não deveria ver.

## Constraint estrutural (decisão de escopo registrada)

`auth-tenancy` é uma mudança de autorização que toca potencialmente **toda rota existente** do
sistema. Isso foi sinalizado a Vítor como motivo para separar em duas changes; ele decidiu
manter as duas juntas nesta change mesmo assim. O `design.md` compensa o risco com uma matriz
de autorização explícita, e o `tasks.md` percorre cada rota existente sistematicamente.

## Goals

### Fidelização
- Contar visitas de um cliente desde o último resgate (ou desde a ativação, se nunca resgatou).
- Sinalizar "meta atingida" no perfil do cliente e no dashboard.
- Permitir marcar um resgate explícito, reiniciando a contagem.
- Configurar o limite de visitas por barbearia (padrão 6).

### Papel de funcionário
- Permitir que o dono defina login/senha para um barbeiro do catálogo, tornando-o
  "funcionário".
- Funcionário loga e opera **só a própria agenda** (todas as visões) e o CRM de clientes
  compartilhado (ver Premissa do exploration) — sem ver relatórios financeiros nem
  Configurações.
- Dono continua com acesso total, incluindo gestão dos logins de funcionário (criar, redefinir
  senha, desativar).
- Sessão carrega o papel e o vínculo de barbeiro; toda rota sensível é retrofitada com a
  checagem correspondente.

## Non-Goals

- Sistema de pontos por valor gasto; qualquer desconto/crédito automático (o sistema não
  processa pagamento — non-goal transversal do produto).
- Convite por e-mail; recuperação de senha self-service (sem infraestrutura de e-mail no
  projeto).
- Papéis além de dono/funcionário (ex.: gerente intermediário, recepcionista sem cadeira).
- Múltiplas barbearias por login; acesso de suporte do operador Blade a tenants de cliente.
- Qualquer mudança em `packages/ai`/Fase 5 (bot ainda não conectado).
- Retroatividade da contagem de fidelização (começa do zero na ativação).

## Users / Actors Impacted

- **Barbeiro-dono** — acesso total inalterado; ganha telas novas (gestão de funcionário,
  resgate de fidelização).
- **Barbeiro-funcionário (novo)** — login novo, acesso restrito à própria agenda.
- **Cliente final** — sujeito da fidelização; não é usuário.

## Scope

### In scope
- Capability nova `fidelizacao-clientes`: contagem, sinalização, resgate, configuração de
  limite por barbearia.
- Capability nova `auth-tenancy`: papel (`dono`/`funcionario`) em `crm_users`, vínculo opcional
  a um `barbers`, sessão estendida (`role`, `barberId`), matriz de autorização retrofitada em
  toda rota/tela existente que precisa de restrição, tela de gestão de funcionário em
  Configurações.
- Delta em `agendamento`: requisito "Barbeiro não é usuário do sistema" torna-se "login
  opcional, definido por `auth-tenancy`".

### Out of scope
- Tudo listado em Non-Goals.

## Business Rules

- `barbershop_id` continua escopando tudo (ADR-0007); a restrição de papel é uma camada
  adicional, nunca substitui o isolamento de tenant.
- Funcionário só opera agendamentos com `barberId` = o próprio.
- Contagem de fidelização não distingue tipo de serviço; reinicia só por ação explícita de
  resgate.
- Sessão sem `role` (cookie emitido antes desta change) é lida como `dono` — sem forçar logout
  em massa no deploy.

## Affected Capabilities
- `fidelizacao-clientes` (nova).
- `auth-tenancy` (nova — antes só candidata em `specs/README.md`).
- `agendamento` (modificada — login do barbeiro passa a ser possível).
- `crm-clientes`, `relatorios` — **acesso** afetado (restrição por papel), sem mudança de
  requisito de conteúdo.

## Expected Impact

### Code
- `packages/db`: `crm_users` +`role`/`barberId`; novas tabelas `loyalty_settings` e
  `loyalty_redemptions`; novos repositórios.
- `apps/web/lib/session.ts`: `SessionData` +`role`/`barberId`; novo helper
  `requireOwnerSessionApi`.
- `apps/web/app/api/**`: retrofit de autorização em rotas dono-only (relatórios, configurações,
  mutações de barbeiro/serviço/agenda-settings) e escopo por `barberId` em rotas de agenda
  quando `role === "funcionario"`.
- `apps/web/app`: tela de gestão de funcionário (`/configuracoes/funcionarios` ou dentro de
  Barbeiros & Horários); ação de resgate no perfil do cliente; sinalização de meta atingida no
  dashboard.

### Data
- `crm_users`: +`role pgEnum('dono','funcionario') DEFAULT 'dono'`, +`barber_id uuid NULL`.
- `loyalty_settings` (1:1 barbearia, padrão do `agenda_settings`): `threshold_visits int
  DEFAULT 6`.
- `loyalty_redemptions`: histórico de resgates por cliente (id, barbershop_id, client_id,
  redeemed_at, visit_id nullable).
- `clients` +`loyalty_baseline_at timestamptz NOT NULL DEFAULT now()` (marca "a partir de
  quando conta" — cobre a decisão "começa do zero" sem backfill manual).

### APIs / Contracts
- Novo: `GET/PUT /api/funcionarios` (ou dentro de `/api/barbers/:id/login`), `POST
  /api/clients/:id/loyalty/redeem`, `GET/PATCH /api/loyalty-settings`.
- Retrofit: 403 em rotas dono-only quando `role === "funcionario"`; filtro forçado de
  `barberId` em rotas de agenda para funcionário.

### Integrations
- Nenhuma integração externa nova.

### Operations
- Nenhuma mudança de infraestrutura (mesmo Postgres, mesmos processos).

### Security / Privacy (LGPD)
- Primeira introdução de papel/permissão no produto — superfície de risco real (ver Riscos no
  exploration.md). Exclusão de cliente (LGPD) restrita a dono (premissa marcada para validação).
  Logs continuam sem PII; nenhuma mudança na regra de mascaramento existente.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Retrofit esquecer uma rota (funcionário acessa o que não deveria) | Alto | Matriz de autorização explícita no design; tasks.md percorre rota por rota com teste HTTP real (403 esperado) |
| Escopo grande atrasar/aumentar risco de regressão | Médio | Aceito por Vítor; tasks.md isola fidelização (grupo de baixo risco) de auth-tenancy (grupo de alto risco), cada um com suíte verde antes do próximo |
| Sessão antiga sem `role` quebrar no deploy | Médio | Leitura trata ausência de `role` como `dono` (compatível) |
| Contagem de fidelização divergir entre telas | Baixo | Função de cálculo única (mesmo padrão do ADR-0010) |

## Success Criteria

- Cliente que atinge o limite de visitas aparece sinalizado no perfil e no dashboard; marcar
  resgate reinicia a contagem; cliente novo/sem resgate conta a partir da ativação, não do
  histórico antigo.
- Dono cadastra um funcionário (login vinculado a um barbeiro existente); funcionário loga e só
  vê a própria agenda; tentar acessar relatórios ou configurações retorna 403; tentar criar
  agendamento para outro barbeiro é recusado.
- Sessões existentes (sem `role`) continuam funcionando como dono após o deploy.
- Teste de isolamento de tenant continua 100% verde (nada quebrou); nova suíte de autorização
  por papel cobre cada rota retrofitada; `pnpm lint`/`typecheck`/`test`/`build` limpos.

## Assumptions

- Exclusão de cliente (LGPD) restrita a dono (premissa, ver exploration.md).
- CRM de clientes (cadastro/histórico) continua compartilhado entre dono e funcionários da
  mesma barbearia (premissa, ver exploration.md).
- Volume de funcionários pequeno (1-3) → UI de gestão simples, sem paginação/busca.

## Open Questions

- Se um dia existir "gerente" (papel intermediário) ou acesso de suporte da Blade, o enum de
  papel e a matriz de autorização terão que crescer — não bloqueia esta fase.
- Registrar a change nos índices (`openspec/changes/README.md`, `openspec/specs/README.md`) e
  arquivar — pendente até a conclusão (etapa 11).
