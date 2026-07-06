# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/) (v0.x até o primeiro cliente em produção).

## [Unreleased]

### Added
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
