# Design: Painel de Operação da Agência

## Context
Ver [exploration.md](exploration.md). Provedor WhatsApp decidido pragmaticamente em
2026-07-06: **Evolution API self-hosted**, revertendo a escolha inicial (Meta Cloud API)
do mesmo dia, após reconhecer o atrito real da rota oficial (verificação externa,
dependência do cliente, perda do uso normal do número). Pricing final e texto de contrato
seguem pendentes do Matheus — não bloqueiam o build, bloqueiam só a venda com número
fechado.

## Goals and Constraints
### Goals
- Painel + gateway WhatsApp operáveis hoje, testáveis com um número real (não sandbox),
  sem depender de aprovação externa.

### Constraints
- Evolution/Baileys exige processo persistente — não roda em função serverless. O
  gateway precisa de VPS/host com Docker; o painel (`apps/web`) pode continuar em
  Netlify/Vercel, comunicando com o gateway via HTTP.
- LGPD e não-logar-conteúdo-de-mensagem (CLAUDE.md do repo) valem aqui como em qualquer
  capability.
- `barbershop_id` como escopo de tenant em toda tabela (ADR-0007), incluindo as novas
  tabelas de credencial/assinatura/saúde.
- Risco de ban é real (não ~zero) — mitigação faz parte do design, não é opcional.

## Proposed Architecture
```text
Netlify/Vercel ──▶ apps/web (Next.js)
                     │  ├─ /painel-agencia        (auth restrita: Vítor/Matheus)
                     │  └─ /api/webhooks/evolution (recebe eventos do gateway)
                     ▼
              Postgres gerenciado (Neon/Supabase) — dados de negócio/painel
                     ▲
                     │ HTTP (REST + webhook)
                     │
        VPS (Docker Compose) ──▶ Evolution API
                                   ├─ 1 "instance" por tenant (número do cliente)
                                   ├─ Postgres/Redis próprios (estado de sessão Baileys)
                                   └─ Caddy (TLS, exposição pública da API)
```

## Technical Decisions

### Decision 1: Evolution API self-hosted, revertendo Meta Cloud API
- Decision: adotar Evolution API (Baileys) como adapter real da v1, uma instance por
  tenant, vinculada ao número existente do barbeiro via QR code (dispositivo vinculado —
  ele mantém uso normal do app).
- Rationale: elimina aprovação externa (Meta) do caminho crítico; elimina dependência de
  o cliente concluir um fluxo Meta; preserva o uso do número que já é do barbeiro (ponto
  central do ICP, per `project.md`); onboarding em minutos, não dias.
- Trade-offs: risco de ban real (não ~zero); manutenção contínua (Baileys quebra com
  updates do WhatsApp); precisa de host persistente, não serverless.
- Consequences: `MetaCloudAdapter` fica como código não implementado por ora — a
  interface `WhatsAppProvider` permite adicioná-lo depois, por tenant, sem reescrever o
  resto (ex.: migrar um cliente específico para oficial se o volume/risco justificar).

### Decision 2: Hospedagem híbrida — painel serverless, gateway em VPS
- Decision: `apps/web` continua em Netlify/Vercel (CRUD, painel, sem estado); Evolution
  API roda em VPS próprio (Docker Compose: Evolution + Postgres + Redis + Caddy) — volta
  ao padrão original da ADR-0006 só para o gateway.
- Rationale: painel não tem motivo técnico para sair do serverless (é CRUD); o gateway
  não tem opção — precisa de processo vivo.
- Trade-offs: dois ambientes de deploy em vez de um; comunicação via rede pública entre
  eles (HTTP + webhook autenticado por API key).
- Consequences: escala de custo previsível (1 VPS pequeno cobre volume inicial, per
  estimativa da ADR-0006: ~R$30-60/mês).

### Decision 3: Credencial por tenant — API key de instance, não sessão em si
- Decision: tabela `whatsapp_credentials` (`barbershop_id`, `evolution_instance_name`,
  `evolution_instance_api_key` — criptografado em repouso), nunca exposta ao
  `painel-web` do barbeiro, só ao `painel-agencia` e ao runtime que envia mensagem. A
  sessão Baileys em si (estado de autenticação com o WhatsApp) fica dentro do Evolution
  API, não replicada no nosso banco.
- Rationale: minimiza a superfície do nosso vault — guardamos a chave de acesso à
  instance, não o material de sessão bruto.
- Trade-offs: dependência operacional do Evolution API estar saudável — se o container
  cair, todas as instances ficam inacessíveis (mitigado por monitoramento + restart
  automático do Docker Compose).

### Decision 4: Mitigação de ban como parte do design, não como promessa solta
- Decision: (a) warm-up — nova instance começa com limite de volume/dia, aumentando
  gradualmente; (b) rate limit por instance no envio; (c) `tenant_health` registra
  eventos de desconexão do Evolution (webhook `CONNECTION_UPDATE`) para runbook de
  reconexão manual; (d) 1 VPS cobre até ~10-15 números ativos (estimativa inicial);
  diversificar em VPS adicionais a partir daí, para não concentrar risco de banimento de
  portfólio em uma única infra/IP.
- Rationale: a Blade Mídia assumiu arcar com toda queda/ban — isso só é sustentável com
  mitigação ativa, não com o risco simplesmente aceito passivamente.
- Trade-offs: mais complexidade operacional que a rota oficial teria; custo de
  monitoramento contínuo.

### Decision 5: Billing com valores placeholder até o Matheus confirmar
- Decision: modelar `subscriptions` (`barbershop_id`, `status`: trialing/active/
  past_due/suspended, `setup_fee_cents`, `monthly_fee_cents`, `provider_customer_id`)
  com gateway de cobrança integrado (Asaas recomendado — BR, pix/boleto/cartão), valores
  como configuração, não hardcoded; texto de contrato fora do código.
- Rationale: permite construir/testar o fluxo completo hoje sem esperar o número final
  do Matheus.
- Trade-offs: nenhum.

## Alternatives Considered
### Alternative 1: Meta Cloud API (decisão inicial do mesmo dia, revertida)
- Description: rota oficial via Tech Provider, hospedagem serverless.
- Why not chosen: aprovação externa (dias), dependência do cliente no fluxo de signup, e
  perda do uso normal do número pelo barbeiro — atrito incompatível com onboarding
  rápido e com o ativo mais valioso do ICP.

### Alternative 2: Esperar a spike formal do ADR-0004
- Description: rodar a comparação completa antes de decidir.
- Why not chosen: pedido explícito de execução hoje; a análise de atrito acima já é
  suficiente para uma decisão pragmática e reversível (a interface permite trocar depois).

## Affected Components
| Component | Change | Reason |
|---|---|---|
| `apps/web` (`/painel-agencia`) | Novo | Superfície interna, CRUD de tenants/keys/billing |
| `apps/web` (`/api/webhooks/evolution`) | Novo | Recebe eventos do gateway (mensagem, status de conexão) |
| `packages/whatsapp` | Novo adapter | `EvolutionAdapter` implementa `WhatsAppProvider` |
| `packages/db` | Novo schema | `whatsapp_credentials`, `subscriptions`, `tenant_health` |
| Infra | Novo | VPS + Docker Compose (Evolution + Postgres + Redis + Caddy) |

## Main Flows
### Flow 1: Provisionar novo tenant (manual assistido, v1)
1. Vítor cria o tenant no `/painel-agencia`.
2. Vítor chama `POST /instance/create` no Evolution API, recebe QR code.
3. Barbeiro escaneia o QR com o WhatsApp dele (continua usando o app normalmente).
4. Painel salva `evolution_instance_name`/`api_key` (criptografado), marca tenant como
   "conectado".
5. Vítor ativa a assinatura (`subscriptions.status = trialing` ou `active`).

### Flow 2: Mensagem recebida
1. Evolution API chama `/api/webhooks/evolution` com o evento (mensagem recebida).
2. Handler identifica o tenant pelo `instance_name`, processa (sem log de conteúdo).
3. Resposta enviada via `EvolutionAdapter.sendMessage` (REST para o Evolution API).

## Error Flows
### Error Flow 1: Instance desconectada (logout, troca de aparelho, ban)
1. Evolution API emite webhook `CONNECTION_UPDATE` com status de desconexão.
2. Marca `tenant_health.status = "precisa_reconectar"` — aparece no dashboard do
   `/painel-agencia`; runbook manual gera novo QR para o barbeiro escanear de novo.

### Error Flow 2: Assinatura suspensa por inadimplência
1. Job de cobrança marca `subscriptions.status = "suspended"`.
2. `EvolutionAdapter.sendMessage` passa a recusar envio para esse tenant, retornando erro
   direcional (não silencioso) — regra exata de carência ainda pendente do Matheus.

## API / Contract Design
- `POST /api/webhooks/evolution` — recebe eventos do gateway (mensagem, conexão), API key
  própria para autenticar a origem.
- `GET/POST /painel-agencia/tenants` — CRUD de tenant.
- `GET /painel-agencia/tenants/:id/health` — status da conexão + volume recente.

## Data Model and Persistence
- `whatsapp_credentials(barbershop_id, evolution_instance_name, evolution_api_key_enc, created_at)`
- `subscriptions(barbershop_id, status, setup_fee_cents, monthly_fee_cents, provider_customer_id, updated_at)`
- `tenant_health(barbershop_id, connection_status, last_message_at, error_count_24h)`

Todas com `barbershop_id` (ADR-0007). Nenhuma armazena conteúdo de mensagem nem estado
bruto de sessão Baileys (isso fica dentro do Evolution API).

## UI do painel e materiais de preset (diretriz de Vítor, 2026-07-06)
- O painel da agência e qualquer material visual ligado aos presets (telas de
  onboarding, cards de cliente, QR de pareamento) seguem o MESMO design system do
  site em `site/` — Ink/Gold/Chalk/Steel, Barlow Condensed/Barlow/Space Mono,
  monogramas tipográficos. "Faz nesse estilo para os presets" — o site é a
  referência visual canônica da marca.

## Authentication and Authorization
- `/painel-agencia` exige papel `agency_admin` (Vítor, Matheus). Better Auth com papel
  único "admin" na v1.
- Endpoints do Evolution API expostos publicamente exigem API key própria (não a mesma
  usada pelo painel) — nunca reaproveitar segredo entre camadas.

## Security and Privacy
- API key de instance criptografada em repouso; nunca retornada em resposta de API nem
  exibida em texto puro no painel (mascarada).
- Logs (pino) nunca incluem corpo de mensagem nem API key.
- Endpoint público do Evolution API protegido por TLS (Caddy) + API key — sem acesso
  anônimo a nenhuma rota de gerenciamento de instance.

## Observability
### Logs
- Eventos de webhook, envio, erro, mudança de status de conexão — com `tenant_id`, sem
  conteúdo.
### Metrics
- Volume de mensagens/dia por tenant; taxa de erro; tempo até primeira resposta; nº de
  reconexões nos últimos 30 dias (indicador de instabilidade/risco de ban).
### Alerts
- Sentry em erro de adapter; alerta manual (painel) quando `connection_status !=
  "conectado"`.

## Testing Strategy
- Unit: `EvolutionAdapter` contra mocks de resposta da API.
- Integration: webhook handler contra payloads de exemplo do Evolution API.
- Contract: `WhatsAppProvider` interface — qualquer adapter futuro (inclusive
  `MetaCloudAdapter`, se necessário depois) roda a mesma suíte.
- Manual: fluxo ponta a ponta com um número de teste real (QR scan, envio, recebimento).

## Migration Strategy
- Novas tabelas, sem dado legado a migrar.

## Rollback Plan
- Reverter deploy do painel normalmente; para o gateway, `docker compose down` reverte
  sem perda (estado de sessão persiste no volume do Evolution API entre reinícios).

## Compatibility
- N/A.

## Remaining Risks
| Risk | Impact | Mitigation | Owner/Decision |
|---|---|---|---|
| Ban de número (real, não ~zero) | Crítico | Warm-up, rate limit, diversificação de VPS/IP conforme escala, runbook de reconexão | Vítor — mitigação técnica; Matheus — ciência do risco assumido |
| Baileys quebra com update do WhatsApp | Médio | Acompanhar releases do Evolution API, atualizar com agilidade | Vítor |
| ADR-0006 volta a valer parcialmente (gateway), painel segue serverless — arquitetura híbrida não documentada formalmente ainda | Baixo/processo | Novo ADR ou atualização da 0006 quando o Matheus revisar | Vítor, ciência do Matheus |
| Preço/contrato ainda não fechados | Alto para venda, zero para build | Valores como config; não vender antes do texto de contrato existir | Matheus |

## Open Questions
- Compensação financeira por indisponibilidade e limite exato de "assumir tudo" — com
  Evolution, "falha de terceiro" vs "falha nossa" se confunde mais (ban pode vir de
  padrão de uso nosso) — pendente Matheus, não bloqueia esta entrega técnica.
- A partir de quantos números ativos diversificar VPS/IP — proposta inicial ~10-15,
  validar na prática.
