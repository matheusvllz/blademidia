# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/) (v0.x até o primeiro cliente em produção).

## [Unreleased]

### Added
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
  (Fresha/Booksy/Zenoti) em `openspec/changes/add-crm-clientes/exploration.md`.
  [add-crm-clientes]
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
