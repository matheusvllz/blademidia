# Painel do Produto — CRM de Clientes (Fase 1)

Painel do barbeiro-dono: cadastro de clientes, histórico de atendimentos, financeiro
(registro, não processamento), dashboard e configuração de inatividade. Ver
[openspec/changes/add-crm-clientes/](../../openspec/changes/add-crm-clientes/) para a
spec, o design e o roadmap completo (5 fases — esta é a Fase 1).

## Rodar localmente

Pré-requisito: **Docker Desktop** (Postgres local) e **Node 22+**.

```bash
# 1. Na raiz do repositório: instalar dependências do monorepo
pnpm install

# 2. Subir o Postgres local (docker-compose.yml da raiz)
docker compose up -d

# 3. Copiar e preencher as variáveis de ambiente
cp .env.example .env
# gerar SESSION_SECRET: openssl rand -hex 32

# 4. Aplicar o schema no banco
pnpm db:migrate

# 5. Criar a barbearia + usuário de teste (ver "Criar o primeiro login" abaixo)

# 6. Subir o painel
pnpm dev
```

Acesse `http://localhost:3000` — redireciona para `/login`.

## Criar o primeiro login (barbearia + usuário)

Não existe tela de "criar conta" na Fase 1 (onboarding é feito por Vítor/Matheus, não
self-service — ver `project.md`, fora de escopo v1):

```bash
pnpm db:create-barbershop -- --slug=barbearia-teste --name="Barbearia Teste" \
  --login=dono@barbearia-teste.com --password=senha-de-teste-123
```

## Migrar dados de um cliente já operado pela agência

Ver [docs/operations/onboarding-produto.md](../../docs/operations/onboarding-produto.md).

## Estrutura

```text
app/
  page.tsx                 # Dashboard
  clientes/                # Lista + cadastro
  clientes/[id]/           # Perfil, histórico, registrar atendimento, excluir (LGPD)
  configuracoes/           # Limite de dias de inatividade
  login/                   # Auth mínima
  api/                     # Rotas internas (clients, dashboard, settings, auth)
lib/
  session.ts               # Sessão assinada (Web Crypto — funciona em Edge e Node)
  auth.ts                  # requireSession() para Server Components/Route Handlers
middleware.ts              # Protege todas as rotas exceto /login
```

## Identidade visual

Tokens Blade (Ink/Gold/Chalk/Steel/Wire, Barlow/Barlow Condensed/Space Mono) em
`tailwind.config.ts` e `app/globals.css` — mesmos do `site/` e do `automation/panel/`,
nenhuma identidade nova. Vocabulário: sempre "Clientes", nunca "CRM" na UI
(`openspec/conventions.md`).
