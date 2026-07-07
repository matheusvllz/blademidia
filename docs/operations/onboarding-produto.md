# Onboarding de uma barbearia no produto (CRM, Fase 1)

> Runbook operacional — Vítor/Matheus rodam isso ao levar uma barbearia da operação
> manual (`automation/`) para o produto (`apps/web`). Ver
> [design.md, Decision 4](../../openspec/changes/archive/add-crm-clientes/design.md) para o
> racional: a migração é um **ponto de corte** — depois dela, o produto é a fonte de
> verdade daquele tenant, não o `automation/data/db.json`.

## Passo a passo

1. **Confirmar que a barbearia já está na automação** (`automation/data/db.json`), com o
   `slug`/id usado lá (ex.: `barbearia-teste`).

2. **Criar a barbearia + usuário no produto:**
   ```bash
   pnpm db:create-barbershop -- --slug=<slug> --name="<Nome da Barbearia>" \
     --login=<email-ou-telefone-do-dono> --password=<senha-temporária>
   ```

3. **Rodar a migração em dry-run primeiro** (não grava nada, só mostra o que vai
   acontecer):
   ```bash
   pnpm db:migrate-automation -- --barbershop-slug=<slug>
   ```
   Confira o relatório de divergências (registros pulados e por quê) antes de prosseguir.

4. **Rodar a migração de verdade:**
   ```bash
   pnpm db:migrate-automation -- --barbershop-slug=<slug> --apply
   ```
   É idempotente — rodar de novo não duplica clientes já importados.

5. **A partir daqui, o produto manda.** Pare de cadastrar clientes novos dessa barbearia
   no `automation/panel` — use o painel do produto (`apps/web`, `/clientes`).

6. **Passar a senha temporária ao barbeiro** e pedir para ele acessar `/login`.

## O que a migração NÃO traz (limitação conhecida da Fase 1)

- **Histórico detalhado de cada visita** — a automação só guarda um contador (`visitas`) e
  a data da última visita, não uma linha por atendimento. A migração cria **um** registro
  de "visita resumo" com a data da última visita conhecida; o histórico anterior a isso não
  existe em lugar nenhum, não é perda da migração.
- **Valor pago** — a automação não registra valor nenhum; nenhuma transação financeira é
  criada pela migração. O financeiro do cliente começa zerado no produto.

## Nuance de privacidade encontrada (reportar, não é bug desta migração)

O arquivo `automation/data/db.json` guarda o telefone **mascarado** no campo
`telefone_mascarado`, mas usa o telefone **completo** (só dígitos) como chave do objeto
`clientes` — o número integral está fisicamente no arquivo, mesmo que nenhum campo
"visível" o exponha. A migração precisa dessa chave para recuperar o telefone real (não
tem outra fonte). Vale avaliar, em paralelo, se `automation/lib/store.mjs` deveria mascarar
também a chave — isso é uma mudança na operação (`automation/`), fora do escopo desta
change de produto.
