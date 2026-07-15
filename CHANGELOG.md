# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/) (v0.x até o primeiro cliente em produção).

## [Unreleased]

### Added
- **Agenda integrada (Fase 2)**, aprovada e implementada (`add-agendamento`). Evolui o CRM
  (Fase 1) para uma plataforma operacional completa: catálogo de serviços (nome, duração,
  preço de tabela) e barbeiros (recurso da agenda, sem login), grade semanal por barbeiro
  com múltiplas janelas/dia (intervalo de almoço), exceções (folga/bloqueio/disponibilidade
  extra), motor de disponibilidade puro (grade − exceções − agendamentos ativos, fuso
  America/Sao_Paulo), ciclo de vida completo do agendamento (agendado → confirmado →
  concluído/cancelado/faltou) com **ausência de double booking garantida no Postgres**
  (restrição de exclusão `btree_gist`), conclusão transacional idempotente que gera o
  atendimento e o pagamento da Fase 1, varredura automática de falta (worker + pg-boss,
  `apps/worker` novo). Telas: `/agenda` (visão do dia por barbeiro, criar/confirmar/
  concluir/remarcar/cancelar/marcar falta) e hub de Configurações (Serviços, Barbeiros &
  Horários, Regras da Agenda). Integração com o CRM: próximo agendamento no perfil do
  cliente, exclusão LGPD cancela agendamentos futuros, dashboard com agenda de hoje.
  **Estrutura pronta para o bot de IA** (Fase 5, ainda não conectado): camada de domínio
  única `packages/core` (`AgendaService`, ADR-0008) consumida por painel, worker e o
  contrato de 4 tools (`packages/core/agenda/tools.ts`, re-exposto em `packages/ai` no
  formato tool-use da Claude API, ADR-0005) — nenhuma chamada externa nesta fase. Migração
  opcional e idempotente de serviços/barbeiros/horário do preset da automação. ADR-0008
  (camada de domínio) e ADR-0009 (worker + pg-boss). Verificado de verdade: suíte com 49
  testes automatizados no total (`packages/db` 17, `packages/core` 24, `packages/ai` 6,
  `apps/worker` 2 — cobrindo motor de disponibilidade, `AgendaService`, isolamento de
  tenant, contrato de tools, migração e job de no-show) + fluxo completo exercido via HTTP
  real (curl) em cada grupo de tasks + boot real do worker com filas/cron confirmados no
  Postgres. Ver
  [apps/web/README.md](apps/web/README.md) e
  [docs/operations/onboarding-produto.md](docs/operations/onboarding-produto.md). Change
  **concluída (Done)**: specs permanentes atualizadas
  ([openspec/specs/agendamento/spec.md](openspec/specs/agendamento/spec.md) nova,
  [openspec/specs/crm-clientes/spec.md](openspec/specs/crm-clientes/spec.md) evoluída),
  change arquivada em `openspec/changes/archive/add-agendamento/`. [add-agendamento]
- **Primeiro código de produto do repositório**: CRM de Clientes (Fase 1), aprovado e
  implementado (`add-crm-clientes`). Monorepo pnpm com `apps/web` (Next.js, painel do
  barbeiro) e `packages/db` (Drizzle + Postgres): cadastro/edição/exclusão (LGPD) de
  cliente, histórico de atendimentos, registro financeiro por visita (sem processar
  pagamento), dashboard (ativos/inativos/ticket médio), regra de inatividade configurável
  por barbearia, auth mínima (login único por barbearia, sessão via Web Crypto), migração
  idempotente de `automation/data/db.json` com dry-run e relatório de divergências, teste
  de isolamento entre tenants (ADR-0007). Identidade visual 100% herdada de `site/`
  (Ink/Gold/Chalk/Steel/Wire, Barlow/Barlow Condensed/Space Mono). Ver
  [apps/web/README.md](apps/web/README.md) para rodar localmente e
  [docs/operations/onboarding-produto.md](docs/operations/onboarding-produto.md) para o
  runbook de onboarding. Planejamento completo das 5 fases (núcleo, agenda,
  financeiro/relatórios, fidelização, campanhas/IA/WhatsApp) e pesquisa de mercado
  (Fresha/Booksy/Zenoti) em `openspec/changes/archive/add-crm-clientes/exploration.md`.
  Change **concluída (Done)** e fechada formalmente: spec permanente em
  [openspec/specs/crm-clientes/spec.md](openspec/specs/crm-clientes/spec.md), change
  arquivada em `openspec/changes/archive/add-crm-clientes/`, `crm-clientes` promovida a
  capability especificada no registro. [add-crm-clientes]
- Painel da agência e painel do cliente (`automation/panel-server.mjs` + `panel/` + `client-panel/`): CRM de barbearias e clientes finais, detecção de inativos para reativação, escopo por barbearia, telefones mascarados. Painel do cliente é simples/claro e não segue o estilo do site (ferramenta do barbeiro). [add-agency-ops-panel]
- Preset Docker full-stack em `infra/stack/` (Evolution + painel + motor + Caddy) para pôr um cliente no ar no VPS com um comando. [add-agency-ops-panel]
- Auto-deploy do site no Netlify via GitHub Actions + build hook (`.github/workflows/deploy-site.yml`), independente do GitHub App do Netlify.
- Site da agência importado para `site/` (antes no repo pessoal vodetmor/blademidia); Netlify migrado para publicar deste repositório. Todos os JS do site desminificados com Prettier e arquitetura documentada em `site/README.md`. [add-agency-ops-panel]
- Automação de atendimento da agência em `automation/`: motor de auto-resposta com presets por cliente, provisionamento de tenant no Evolution API, simulador local (testável sem Docker/WhatsApp) e runbook de onboarding. [add-agency-ops-panel]
- Infra do gateway WhatsApp em `infra/evolution/`: Docker Compose de produção (com Caddy/TLS) e local. [add-agency-ops-panel]
- Changes SDD: `init-project-skeleton` (exploration/proposal/design/tasks) e `add-agency-ops-panel` (exploration/proposal Fase 0/design/tasks).
- Fundação Spec-Driven Development: estrutura `openspec/` (project, workflow, conventions, templates, specs, changes), método SDD em `docs/sdd/`, contexto de negócio em `docs/business/`.
- Arquitetura proposta com 7 ADRs (`docs/architecture/`) — status Proposto, aguardando validação.
- Instruções para agentes de IA (`CLAUDE.md`).

### Changed
- `openspec/project.md` e `docs/business/contexto-negocio.md`: sócios nomeados (Vítor Machado, Matheus Vellozo).
- `CLAUDE.md`: documentadas as três frentes do repo (site / operação da agência / produto SaaS) e o regime de cada uma, para orientar qualquer IA que pegar o projeto.
- Decisão pragmática de provedor WhatsApp registrada na change add-agency-ops-panel: Evolution API self-hosted (reversível via interface `WhatsAppProvider`).

### Removed
- Seção "Quem opera" (nomes dos sócios) do render da landing — execução não convenceu; código preservado e importância registrada em `docs/business/contexto-negocio.md` para retomada.
