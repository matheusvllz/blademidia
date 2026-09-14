# Onboarding de uma barbearia no produto (CRM + Agenda)

> Runbook operacional — Matheus roda isso (com apoio técnico pontual do pai quando necessário) ao levar uma barbearia da operação
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

## Passo a passo — módulo de Agenda (Fase 2, opcional)

> Depois do onboarding do CRM acima. A migração da agenda é **opcional e independente** —
> sem ela, o barbeiro cadastra serviços/barbeiros/grade manualmente em
> Configurações → Serviços / Barbeiros & Horários.

1. **Confirmar que existe um preset da barbearia** em
   `automation/presets/clientes/<slug>.json` (ou usar `--json-path` para apontar para outro
   arquivo, ex.: o `barbearia-default.json` preenchido).

2. **Rodar em dry-run primeiro:**
   ```bash
   pnpm db:migrate-automation-agenda -- --barbershop-slug=<slug>
   ```
   Confira serviços/barbeiros que seriam criados e a lista de divergências (ex.: preço não
   preenchido no preset) e de registros pulados (nome ausente, placeholder "PREENCHER" não
   preenchido, duração inválida).

3. **Rodar de verdade:**
   ```bash
   pnpm db:migrate-automation-agenda -- --barbershop-slug=<slug> --apply
   ```
   Idempotente — rodar de novo não duplica serviço/barbeiro já migrado.

4. **Revisar e ajustar na tela.** A migração aplica a MESMA grade de horário do preset
   (`horario_funcionamento`, que é do negócio) a **todos** os barbeiros importados —
   ajuste grades individuais, folgas e quais serviços cada barbeiro faz em
   Configurações → Barbeiros & Horários.

### O que a migração da agenda NÃO traz

- **Agendamentos futuros já marcados na operação manual** — a automação não tem agenda
  estruturada; não há o que migrar além de serviços/barbeiros/horário de funcionamento.
- **Preço de serviço não preenchido no preset** (`"PREENCHER"` ou não numérico) — o serviço
  é criado sem preço de tabela; preencher manualmente em Configurações → Serviços.

## Passo a passo — canal WhatsApp (Fase 5, `add-whatsapp-canal`)

> Depois do onboarding do CRM (e, se fizer sentido, da Agenda). Liga o número da barbearia ao
> produto via **coexistência**: o WhatsApp Business App continua no celular do barbeiro
> funcionando normalmente, e o mesmo número passa a responder também pela Cloud API — ver
> `docs/sdd/06-plano-execucao-fase-5.md` § 3.3 e `docs/architecture/decisions/
> ADR-0004-whatsapp-provider-abstraido.md` ("Decisão final") para o racional completo.
>
> **Genérico de propósito**: o passo a passo abaixo é o fluxo de Embedded Signup com
> coexistência que vale para qualquer BSP com mensalidade fixa (§ 5.9 do plano). Quando o BSP
> específico for contratado (§ 5.10), substitua os passos 2-4 pelas telas/nomes exatos do
> painel dele — a estrutura (consentimento de histórico, versão mínima do app, teste antes do
> número real) não muda.

1. **Confirmar a versão do WhatsApp Business App** no celular do barbeiro — precisa ser
   2.24.17 ou superior para a coexistência funcionar. Atualizar pela loja do app se for mais
   antiga.

2. **Iniciar o Embedded Signup pelo painel do BSP contratado**, escolhendo a opção de conectar
   uma conta/número do WhatsApp Business App já existente (não "criar número novo" — isso é o
   caminho clássico sem coexistência, que tira o número do celular).

3. **Decidir o consentimento de sincronização de histórico** (até 180 dias) junto com o
   barbeiro antes de confirmar — é uma escolha explícita no fluxo, não automática. Recusar não
   quebra a coexistência, só não traz o histórico antigo do app para o produto.

4. **Concluir o Embedded Signup** e anotar o identificador de número/canal (`phone_number_id`
   ou equivalente do BSP) que ele devolve.

5. **Configurar a barbearia no produto** com esse identificador:
   ```ts
   // via packages/db — setWhatsappPhoneNumberId(barbershopId, phoneNumberId)
   ```
   (ainda não há script de linha de comando para isto — usar via script pontual, mesmo padrão
   do `create-barbershop.ts`, até existir demanda para automatizar).

6. **Testar com um número de teste antes do número real do cliente**: mandar uma mensagem, ver
   ela persistida em `/conversas` no painel; responder pelo próprio WhatsApp Business App e
   confirmar que aparece a marca "com o barbeiro" na conversa (prova que o espelhamento da
   coexistência está funcionando).

7. **Avisar o barbeiro** que, com a coexistência ativa, o número dele continua funcionando
   exatamente como antes no celular — nada muda na rotina dele até a Fase 5.2
   (`add-atendimento-ia`) começar a responder automaticamente.

### O que a coexistência NÃO faz (limitações confirmadas)

- **Chat em grupo não sincroniza** — só conversas individuais.
- **Mensagens que desaparecem, visualização única e localização ao vivo são desativadas**
  após o onboarding da coexistência.
- **Throughput combinado de 20 mensagens/segundo** entre app e API — folgado para o volume
  desta fase, mas relevante se a Blade crescer para um volume alto.

## Nuance de privacidade encontrada (reportar, não é bug desta migração)

O arquivo `automation/data/db.json` guarda o telefone **mascarado** no campo
`telefone_mascarado`, mas usa o telefone **completo** (só dígitos) como chave do objeto
`clientes` — o número integral está fisicamente no arquivo, mesmo que nenhum campo
"visível" o exponha. A migração precisa dessa chave para recuperar o telefone real (não
tem outra fonte). Vale avaliar, em paralelo, se `automation/lib/store.mjs` deveria mascarar
também a chave — isso é uma mudança na operação (`automation/`), fora do escopo desta
change de produto.
