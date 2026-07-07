# Tasks: CRM de Clientes — Núcleo (Fase 1)

> Aprovado por Vítor em 2026-07-07. Implementado na branch `feature/add-crm-clientes`.
> **Verificado de verdade contra Postgres real** (Docker Desktop instalado e WSL2 ativado
> pelo Vítor no mesmo dia): migração aplicada, 11/11 testes passando, fluxo completo
> exercido no navegador (Playwright + curl), telas conferidas visualmente. Cada item abaixo
> tem evidência concreta.

## 0. Fase 0 técnica (pré-requisito)

- [x] 0.1 Inicializar monorepo pnpm + tooling
  - Evidência: `pnpm install` sem erro (3 workspaces); `pnpm lint` → "No ESLint warnings or
    errors". `.npmrc` com `node-linker=hoisted` (Next.js não funciona com os symlinks
    aninhados do pnpm — sem isso o dev não compila Tailwind e `next start` falha com
    "Cannot find module ./vendor-chunks/...").
- [x] 0.2 `packages/db`: Drizzle + client Postgres
  - Evidência: `pnpm db:migrate` aplicou `migrations/0000_*.sql` no Postgres do
    `docker-compose.yml` sem erro; queries reais rodando (ver 2.x).
- [x] 0.3 Esqueleto Next.js (`apps/web`)
  - Evidência: `pnpm build` gera 12 rotas; `next start` sobe e serve as páginas (CSS de
    18KB com os tokens Blade, telas conferidas por screenshot).
- [x] 0.4 Docker Compose local (só Postgres)
  - Evidência: `docker compose up -d` → container `blademidia-postgres-1` `healthy`;
    `apps/web` e os scripts conectam e leem/escrevem.
- [x] 0.5 Auth mínima (login único por barbearia)
  - Evidência: `POST /api/auth/login` com `rafael/corte123` → 200 + cookie; senha errada →
    401; rota protegida sem cookie → 401/redirect. Sessão assinada (HMAC via Web Crypto,
    funciona no Edge middleware).

## 1. Schema de dados

- [x] 1.1 Tabelas `barbershops`, `clients`, `visits`, `payments_log`, `crm_settings`,
      `crm_users`
  - Nota: `barbershops` (tenant) adicionada além do design original — peça que faltava para
    login/migração referenciarem; mesmo espírito do ADR-0007.
  - Evidência: migração aplicada; índice único `(barbershop_id, phone)` provado pelo teste
    de telefone duplicado (409).
- [x] 1.2 Camada de repositório com escopo de tenant obrigatório
  - Evidência: toda função de `repositories/*` exige `barbershopId`; typecheck limpo.
- [x] 1.3 Teste de isolamento entre tenants
  - Evidência: `clients.isolation.test.ts` — 2 testes rodando de verdade contra Postgres
    (não mais `skipped`), passando em ~1.9s. Confirmado: barbearia A não vê dado da B;
    `getClient` com tenant errado retorna null. DoD do ADR-0007 cumprido.

## 2. API interna (`apps/web`)

- [x] 2.1 `GET/POST /api/clients`
  - Evidência: criar "João" → 201; telefone duplicado → 409 (aponta o existente); sem nome
    → 400. Listagem só do tenant da sessão.
- [x] 2.2 `GET/PATCH/DELETE /api/clients/:id`
  - Evidência: exclusão LGPD do João → 200; buscar depois → 404; dashboard: `totalClients`
    caiu de 2→1 MAS `averageTicketCents` permaneceu (histórico financeiro anonimizado
    preservado — cenário exato da spec).
- [x] 2.3 `POST /api/clients/:id/visits`
  - Evidência: 2 atendimentos do João (R$50 pix + R$35 dinheiro) → 201, criando visit +
    payment. Visita sem valor aceita sem quebrar ticket médio.
- [x] 2.4 `GET /api/dashboard`
  - Evidência: retornou `{totalClients:2, active:1, inactive:1, averageTicket:4250,
    clientsToReactivate:[Pedro]}` — cálculos corretos. Bug real corrigido no caminho:
    `max(occurred_at)` volta como string do driver pg, precisava normalizar para Date
    (testes unitários não pegaram; a verificação real pegou).
- [x] 2.5 `GET/PATCH /api/settings`
  - Evidência: GET → 21 (padrão); PATCH 30 → 200; refletiu no cálculo de inatividade
    (Carlos com 22 dias vira ativo com limite 30).

## 3. Regra de inatividade

- [x] 3.1 Cálculo de cliente inativo (limite configurável, padrão 21 dias)
  - Evidência: 4/4 testes unitários (`inactivity.test.ts`) + comportamento real confirmado
    no dashboard após mudar o limite para 30.

## 4. Telas (`apps/web`)

- [x] 4.1 Dashboard (`/`)
  - Evidência: screenshot — 3 cards (ativos verde, inativos vermelho, ticket médio) +
    "Clientes para reativar" com dados reais; estado vazio tratado.
- [x] 4.2 Lista de clientes (`/clientes`) + cadastro
  - Evidência: screenshot — busca, cards com telefone mascarado, botão "Novo cliente";
    erro de duplicado exibido; nenhuma tela usa "CRM" (verificado: 0 ocorrências em todas).
- [x] 4.3 Perfil do cliente (`/clientes/[id]`)
  - Evidência: screenshot do Pedro — badge Inativo, total/última visita/frequência média,
    telefone mascarado `***6666`, botões Registrar/Excluir, estado vazio do histórico.
  - Ponto em aberto (mantido): layout de "frequência média/evolução" é interpretação do
    pedido — validar refinamento com Vítor após uso real.
- [x] 4.4 Configurações (`/configuracoes`)
  - Evidência: screenshot — carrega o valor atual (30) do banco via client component,
    campo + texto de ajuda + Salvar.

## 5. Migração de dados da operação

- [x] 5.1 Script de import de `automation/data/db.json`
  - Evidência: rodado contra Postgres real com um dataset de exemplo — dry-run (2 migrados,
    2 pulados: telefone inválido + nome vazio), `--apply` (2 gravados), re-`--apply`
    (0 migrados, 2 idempotência + 2 malformados → **não duplicou**). Bug de detecção de
    "main module" no Windows corrigido no caminho (comparar paths resolvidos, não URLs).
  - Script irmão `create-barbershop.ts` adicionado (cria barbearia + primeiro usuário —
    necessário para ter login antes de migrar).
- [x] 5.2 Runbook de onboarding
  - Evidência: `docs/operations/onboarding-produto.md` — passo a passo + limitações da
    migração + nuance de privacidade da chave do JSON (telefone completo na chave) reportada.

## 6. Documentação e fechamento

- [x] 6.1 `.env.example`
  - Evidência: raiz, com `DATABASE_URL` e `SESSION_SECRET`. `.env` real carregado pelo Next
    (via `next.config.ts`) e pelos scripts (via `load-env.ts`) — ambos apontam para a raiz.
- [x] 6.2 `CHANGELOG.md`
  - Evidência: entrada `[Unreleased]` descreve a implementação real.
- [ ] 6.3 Aplicar deltas em `openspec/specs/crm-clientes/spec.md`
  - Pendente do fechamento formal da change (revisão + merge). O delta já está pronto em
    `specs/crm-clientes/spec.md` desta change; mover para a spec permanente é a última etapa
    do DoD (`workflow.md`), após a revisão do Vítor.

## Como rodar (resumido — detalhes em apps/web/README.md)

```bash
docker compose up -d                 # Postgres local
cp .env.example .env                 # preencher SESSION_SECRET (openssl rand -hex 32)
pnpm install && pnpm db:migrate      # dependências + schema
pnpm db:create-barbershop -- --slug=... --name="..." --login=... --password=...
pnpm --filter @blademidia/web dev    # painel em http://localhost:3000
```
