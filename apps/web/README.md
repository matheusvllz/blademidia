# Painel do Produto — CRM + Agenda (Fases 1-2)

Painel do barbeiro-dono: cadastro de clientes, histórico de atendimentos, financeiro
(registro, não processamento), dashboard, agenda completa (serviços, barbeiros, grade de
horário, agendamentos) e configurações. Ver
[openspec/changes/archive/add-crm-clientes/](../../openspec/changes/archive/add-crm-clientes/)
(Fase 1) e [openspec/changes/archive/add-agendamento/](../../openspec/changes/archive/add-agendamento/)
(Fase 2) para spec, design e roadmap completo.

> **Texto de interface segue os guias estratégicos.** Todo rótulo, estado vazio, aviso e
> mensagem deste painel passa pelo [Guia de COPY](../../docs/business/guia-de-copy.md) §§ 8 e
> 13.9 — vocabulário do barbeiro, nunca jargão ("clientes", não "CRM"; "horário", não
> "agendamento no sistema"), estados vazios que instruem em vez de informar. O painel é
> **conveniência**, não requisito: a promessa ao cliente é "sem você operar nada"
> ([project.md](../../openspec/project.md)), então nenhuma função essencial pode depender de
> o barbeiro abrir esta tela.

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

# 6. Subir o painel (e, se for testar a agenda, o worker também)
pnpm dev
pnpm worker   # opcional nesta fase: só a varredura de falta (no-show) depende dele
```

Acesse `http://localhost:3000` — redireciona para `/login`.

## Criar o primeiro login (barbearia + usuário)

Não existe tela de "criar conta" (onboarding é feito por Vítor/Matheus, não self-service —
ver `project.md`, fora de escopo v1):

```bash
pnpm db:create-barbershop -- --slug=barbearia-teste --name="Barbearia Teste" \
  --login=dono@barbearia-teste.com --password=senha-de-teste-123
```

## Migrar dados de um cliente já operado pela agência

Ver [docs/operations/onboarding-produto.md](../../docs/operations/onboarding-produto.md)
(migração de clientes — Fase 1 — e, opcionalmente, de serviços/barbeiros/grade — Fase 2).

## Estrutura

```text
app/
  page.tsx                 # Dashboard (clientes + agenda de hoje)
  clientes/                # Lista + cadastro
  clientes/[id]/           # Perfil, histórico, próximo agendamento, excluir (LGPD)
  agenda/                  # Visão do dia por barbeiro, criar/confirmar/concluir/remarcar/cancelar
  configuracoes/           # Hub: Serviços, Barbeiros & Horários, Agenda, Inatividade
  login/                   # Auth mínima
  api/                     # Rotas internas (clients, dashboard, settings, auth,
                            #   services, barbers, availability, appointments, agenda-settings)
lib/
  session.ts               # Sessão assinada (Web Crypto — funciona em Edge e Node)
  auth.ts                  # requireSession() para Server Components/Route Handlers
  api.ts                   # Validação Zod + mapeamento de erros de domínio para HTTP
middleware.ts              # Protege todas as rotas exceto /login
```

Lógica de negócio da agenda vive em `@blademidia/core` (fronteira única — ADR-0008), não
neste app; `apps/web` só resolve a sessão e delega.

## Identidade visual

Tokens Blade (Ink/Gold/Chalk/Steel/Wire, Barlow/Barlow Condensed/Space Mono) em
`tailwind.config.ts` e `app/globals.css` — mesmos do `site/` e do `automation/panel/`,
nenhuma identidade nova. Vocabulário: sempre "Clientes"/"Agenda"/"horário", nunca
"CRM"/"booking"/"slot" na UI (`openspec/conventions.md`).
