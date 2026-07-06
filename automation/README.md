# Automação de Atendimento — Operação da Agência

Motor de atendimento automático no WhatsApp (via Evolution API) + presets por cliente.
Node puro (18+), **zero dependências** — nada de `npm install`.

## O que tem aqui

| Arquivo | Função |
|---|---|
| `presets/barbearia-default.json` | Preset padrão: respostas, regras (confirmação 24h, reativação 21d, escalação p/ humano), warm-up anti-ban |
| `presets/clientes/<slug>.json` | Preset de cada cliente real (copiar do default e preencher) — criado no onboarding |
| `webhook-server.mjs` | Recebe eventos do Evolution e responde via motor de intenções |
| `provision.mjs` | Cria a instance de um cliente novo + webhook + salva QR em `out/` |
| `status.mjs` | Estado de conexão de todas as instances |
| `simulate.mjs` | Testa o fluxo de atendimento localmente, sem WhatsApp/Docker |
| `panel-server.mjs` | Servidor dos **dois painéis** (agência + cliente) + API do CRM |
| `panel/` | UI do painel da **agência** (estilo do site, Ink/Gold) |
| `client-panel/` | UI do painel do **cliente** (simples/claro, mobile — não segue o site) |
| `lib/engine.mjs` | Motor de decisão (intenções por palavra-chave, horário de funcionamento, escalação) |
| `lib/evolution.mjs` | Client REST do Evolution (dry-run automático sem credenciais) |
| `lib/store.mjs` | Camada de dados do CRM (JSON em `data/`, escopo por barbearia) |
| `lib/presets.mjs` | Carrega preset e renderiza os templates de resposta |

## Painéis (organização + CRM)

```bash
node automation/panel-server.mjs        # http://localhost:4545
```

- **Agência** — `http://localhost:4545/` : cadastro de barbearias, CRM de clientes finais,
  quem está inativo (21+ dias) para reativar, status de conexão. Estilo do site (Ink/Gold).
- **Cliente (barbeiro)** — `http://localhost:4545/cliente?barbershop=<slug>` : painel simples
  e claro (mobile), fora do estilo do site — o barbeiro vê seus clientes e quem sumiu. É
  read-mostly (a promessa é "sem você operar nada").

Dados em `automation/data/db.json` (fora do git). Telefones sempre mascarados (`***1234`).

## Testar agora, sem nada instalado além do Node

```bash
# Terminal A — sobe o motor (dry-run: não precisa de Evolution rodando)
node automation/webhook-server.mjs

# Terminal B — dispara uma conversa simulada
node automation/simulate.mjs
```

O terminal A mostra a intenção detectada por mensagem e a resposta que seria enviada.
Conteúdo de mensagem e telefone completo **nunca** aparecem no log (regra do repo).

## Onboarding de cliente novo (runbook — meta < 4h)

1. `cp automation/presets/barbearia-default.json automation/presets/clientes/<slug>.json`
   e preencher: nome, serviços/preços, barbeiros, horários.
2. Subir o Evolution (local: `docker compose -f infra/evolution/docker-compose.local.yml up -d`
   · produção: VPS, ver `infra/evolution/docker-compose.yml`).
3. `EVOLUTION_URL=http://localhost:8080 EVOLUTION_API_KEY=<key> node automation/provision.mjs <slug>`
4. Barbeiro escaneia o QR de `automation/out/qr-blade-<slug>.png`
   (WhatsApp → Dispositivos vinculados). Ele continua usando o app normalmente.
5. `node automation/status.mjs` até ver `open` (conectado).
6. **Respeitar o warm-up**: dia 1 máx 20 envios, dia 2 máx 40, até dia 7 máx 80/dia.

## Regras que este código respeita (do CLAUDE.md do repo)

- Nunca logar conteúdo de mensagem de cliente final nem telefone completo (mask `***1234`).
- Escalação: 2 mensagens sem intenção reconhecida → avisa o cliente e para de responder
  (humano assume; o motor não "chuta").
- Warm-up anti-ban documentado no preset e lembrado no provision.

## Limites conhecidos da v1 (SLC — corte consciente)

- Intenções por palavra-chave, sem LLM — a conversa com IA é papel do produto SaaS
  (change `atendimento-ia`), não deste motor operacional.
- Estado de contato em memória (reinicia com o processo).
- Confirmação 24h/reativação 21d têm template pronto no preset, mas o agendador
  (cron) que as dispara depende do produto ter agenda — hoje o envio é manual assistido.
