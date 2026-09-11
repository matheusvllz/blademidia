# Design: Reativação automática de clientes inativos

> Etapa 6 do fluxo. Decisões técnicas — a spec (proposal.md + specs/) já está aprovada
> (etapa 5). Nenhum requisito novo nasce aqui; se algo faltar, volta para a spec.

## Visão geral

```text
apps/worker/src/jobs/reactivation-sweep.ts (cron 0 8 * * *, já existente)
  │
  ├─ 1. para cada barbearia com reactivationAutomationEnabled = true:
  │     listClientsNeedingReactivation(barbershopId) — nova função em packages/db
  │       (gate + regra de "novo ciclo" + exclusão de quem nunca visitou + telefone válido),
  │       ordenada por mais tempo inativo primeiro, já fatiada em reactivationDailyCap
  ├─ 2. para cada cliente candidato:
  │     resolve/cria a conversa (findOrCreateConversation) — mesmo mecanismo da change anterior
  │     WhatsAppProvider.sendTemplate(...)         [packages/whatsapp — já existe]
  └─ 3. registra o envio (reactivation_sends) + a mensagem (whatsapp_messages)

cliente responde (qualquer coisa, inclusive "quero agendar") → mesmo pipeline do
  atendimento-ia (webhook → worker → process-inbound.ts → loop de IA) — SEM tool nova, usa
  consultar_disponibilidade/criar_agendamento/cadastrar_cliente_basico já existentes

cliente responde "PARE"/"SAIR" → opt-out já existente de whatsapp-canal, sem mudança aqui
```

## Decisões

### Decision 1 — gate e throttling em `crm_settings`, não em nova tabela de config
`crm_settings` (onde já vive `inactivityDaysThreshold`) ganha:
- `reactivationAutomationEnabled boolean NOT NULL DEFAULT false` — mesmo padrão de
  `agenda_settings.confirmationAutomationEnabled`.
- `reactivationDailyCap integer NOT NULL DEFAULT 5` — limite por execução do job (que já roda
  1x/dia). Default conservador, ajustável por barbearia sem mudança de arquitetura (decisão
  registrada como premissa na exploração).

Ligados juntos pelo mesmo script de ativação (Decision 5), já que os dois só fazem sentido
depois do template aprovado.

### Decision 2 — `reactivation_sends`: log append-only, com snapshot de `lastVisitAt`
Tabela nova, sem `UNIQUE` por cliente (ao contrário de `confirmation_reminders`, que é único
para sempre por agendamento — aqui o mesmo cliente pode legitimamente receber mais de um envio
ao longo do tempo, um por ciclo de inatividade):

```text
reactivation_sends
  id                      uuid PK default random
  barbershop_id           uuid NOT NULL references barbershops(id)
  client_id               uuid NOT NULL references clients(id)
  sent_at                 timestamptz NOT NULL default now()
  wamid                   text NOT NULL
  client_last_visit_at    timestamptz  -- snapshot do lastVisitAt do cliente NO MOMENTO do
                                       -- envio; nunca nulo na prática (Requirement exclui
                                       -- quem nunca visitou), mas a coluna aceita NULL por
                                       -- honestidade de schema (não há CHECK a favor de NOT
                                       -- NULL suficientemente barato aqui)
```

`client_last_visit_at` é a peça central da regra de "novo ciclo" (Decision 3): guarda o que
`lastVisitAt` valia quando o envio aconteceu, para comparar com o valor atual depois.

### Decision 3 — regra de "novo ciclo" implementada por comparação de snapshot
`listClientsNeedingReactivation(barbershopId)`:

```sql
-- pseudocódigo da condição de elegibilidade
cliente.deleted_at IS NULL
AND cliente.phone IS NOT NULL
AND ultima_visita.last_visit_at IS NOT NULL      -- nunca visitou → nunca elegível
AND isClientInactive(ultima_visita.last_visit_at, threshold)  -- inativo AGORA
AND (
  nenhum reactivation_sends para este cliente
  OR ultima_visita.last_visit_at > (
       SELECT client_last_visit_at FROM reactivation_sends
       WHERE client_id = cliente.id
       ORDER BY sent_at DESC LIMIT 1
     )
)
```

Como `lastVisitAt` só muda quando uma visita nova é registrada, "o valor atual é maior que o
snapshot do último envio" é exatamente "houve uma visita nova desde então" — implementa a
decisão de Matheus (novo ciclo de inatividade) sem precisar de um contador ou estado de
"ciclo" explícito.

### Decision 4 — throttling aplicado na consulta, não como corte pós-seleção
`listClientsNeedingReactivation` já ordena por `last_visit_at ASC` (mais tempo sumido primeiro
— mesmo critério de `getDashboard`) e aplica `LIMIT reactivationDailyCap` diretamente na query
por barbearia. Quem não entra nesta execução continua elegível e reaparece (mais prioritário
ainda, por estar mais tempo na fila) na execução seguinte — sem necessidade de um estado de
"fila pendente" separado.

### Decision 5 — ativação por script CLI, mesmo padrão da change anterior
`packages/db/src/scripts/enable-reactivation-automation.ts`:

```text
tsx src/scripts/enable-reactivation-automation.ts --slug=<slug> [--daily-cap=<n>]
```

Mesma validação de `whatsappPhoneNumberId` configurado antes de ligar. `--daily-cap` opcional,
default 5 se omitido. Documentado no runbook de onboarding, junto com o lembrete explícito do
pré-requisito "fazer a conta de custo contra a base real antes do primeiro envio" (plano § 9).

### Decision 6 — nenhuma tool nova para o bot
Diferente de `add-confirmacao-agendamento`, a resposta do cliente a uma reativação não é um
"sim/não" transacional ligado a um registro específico — é uma conversa aberta que já cai
inteiramente no que `atendimento-ia` sabe fazer (consultar disponibilidade, criar agendamento,
cadastrar cliente básico se for necessário). Nenhuma mudança em `packages/core`/`packages/ai`
nesta change.

### Decision 7 — base legal documentada explicitamente (exigência do plano § 9)
**Isto não é uma opinião jurídica — é o registro da premissa operacional adotada, sujeita a
revisão por advogado se a dúvida for jurídica de verdade (regra explícita do plano de
execução).**

A base legal usada para o envio de reativação é **legítimo interesse** (LGPD, art. 10): existe
relação prévia entre o cliente final e a barbearia (ele já foi atendido, forneceu o telefone no
contexto dessa relação comercial), o conteúdo é sobre o próprio serviço que ele já consome, e o
opt-out está disponível e é respeitado sem exceção como salvaguarda (é o mecanismo que torna o
legítimo interesse defensável — sem ele, o argumento não se sustenta). Isto NÃO é uma extensão
de escopo de "atendimento" — é comunicação iniciada pela barbearia, feita expressamente com
apoio de um mecanismo de recusa imediato e sem fricção ("PARE"/"SAIR", já implementado).
Se algum sócio tiver dúvida real sobre isso valer para o caso concreto (volume, base específica
de clientes, etc.), a decisão correta é consultar um advogado antes do primeiro envio real —
não é uma decisão que um agente de IA deva tomar sozinho, e este documento não substitui
aconselhamento jurídico.

### Decision 8 — envio usa `resolveWhatsAppProvider`, mesmo mecanismo de dry-run já existente
Idêntico à Decision 8 de `add-confirmacao-agendamento`: sem credenciais configuradas, o adapter
dry-run já cobre o caminho de teste completo, sem infraestrutura nova.

### Decision 9 — falha de envio não interrompe o lote (por cliente E por barbearia)
Mesmo padrão da change anterior: `try/catch` por cliente dentro do `for`, sem criar
`reactivation_sends` para uma tentativa que falhou (ela volta a ser candidata na próxima
execução, dentro do limite diário).

**Achado durante a implementação, corrigido**: o isolamento original só cobria o nível de
cliente — um erro ao resolver `getBarbershop`/`listClientsNeedingReactivation` para UMA
barbearia (ex.: falha transitória de conexão) abortava a varredura de TODAS as barbearias
seguintes na mesma execução, já que essa parte do loop não tinha `try/catch` próprio. Corrigido
com isolamento também no nível de barbearia — mesmo princípio da Decision 9, aplicado uma
camada acima. Testado com um `getBarbershop` mockado para falhar numa barbearia específica,
confirmando que as demais continuam sendo processadas.

### Decision 10 — `provider` injetável, não mockado, nos testes ponta a ponta
Achado durante a implementação: os testes ponta a ponta desta change e de
`add-confirmacao-agendamento` mockavam `@blademidia/whatsapp` (`vi.mock`) para forçar o adapter
dry-run, cada um com uma fábrica de mock ligeiramente diferente. Rodar os dois arquivos juntos
causava flakiness real (achado, não totalmente explicado pela documentação pública do Vitest,
mas reproduzido de forma consistente e eliminado pela mudança abaixo). Corrigido tornando
`provider` um parâmetro opcional de `runSendConfirmation`/`runReactivationSweep`
(default `resolveWhatsAppProvider(process.env)`) — os testes ponta a ponta agora instanciam
`new WhatsAppProvider(createDryRunAdapter())` diretamente e passam como argumento, sem
`vi.mock` nenhum para este módulo. Mudança pequena e sem efeito em produção (o default
preserva o comportamento anterior).

## Modelo de dados — resumo da migração

- `crm_settings`: `+ reactivation_automation_enabled boolean NOT NULL DEFAULT false`,
  `+ reactivation_daily_cap integer NOT NULL DEFAULT 5`.
- Tabela nova `reactivation_sends` (Decision 2), com FKs para `barbershops` e `clients`,
  **sem** unicidade por cliente (ao contrário de `confirmation_reminders`).
- Gerado via `drizzle-kit generate`, mesmo fluxo já usado.

## Rascunho do texto do template (para o Matheus submeter à Meta)

Categoria **marketing**, idioma `pt_BR`, 1 parâmetro posicional (nome). Segue a voz "barbearia
→ cliente" do guia de copy § 13.9, vocabulário já validado ("sumiu", § 8/§ 271), e passa pelo
checklist § 14:

```text
Nome do template: reativacao_cliente
Categoria: MARKETING
Idioma: pt_BR

Corpo:
oi {{1}}! faz um tempo que você não aparece por aqui. bora marcar um horário? é só
responder aqui que eu já te mostro os dias livres 💈 (se não quiser mais receber
mensagem, responde PARE)
```

Checklist § 14 aplicado:
1. Resumível na tese? É a segunda prova direta da dor central (cliente sumido). ✅.
2. Uma coisa só: convidar a voltar. ✅.
3. Palavra banida: nenhuma. ✅.
4-5. Números/ticket: não há valor monetário no texto. n/a.
6. Absolvição: não fala de dor, é convite direto, sem culpar o cliente. ✅.
7. Resultado vs funcionalidade: convite a agendar, não uma promessa vaga. ✅.
8. Barbeiro/cliente leria sem travar: sim, coloquial. ✅.
9. CTA mais fácil que a decisão: responder qualquer coisa já inicia a conversa. ✅.
10. Promete algo que a operação não entrega: não. ✅.

Menção explícita ao opt-out ("responde PARE") **dentro do próprio template**: reforço da
salvaguarda da Decision 7, além do mecanismo já existente que reconhece a palavra em qualquer
mensagem — deixa a opção visível para quem não sabia que podia usá-la.

**Rascunho, não fonte de verdade em runtime** — mesmo tratamento do template de confirmação:
ajustável até a submissão real; o nome definitivo só é hardcoded em `reactivation-sweep.ts`
depois de confirmado.

## Estratégia de testes

Mesmo padrão de rigor das changes anteriores da Fase 5:

- `packages/db`: teste da nova função de seleção (gate, cap diário, regra de "novo ciclo",
  exclusão de cliente sem visita, exclusão de cliente sem telefone) contra Postgres real;
  isolamento de tenant.
- `apps/worker`: teste do job com adapter mockado (mesmo padrão de
  `send-confirmation.test.ts`): cliente elegível → `sendTemplate` chamado → registro criado;
  cliente que já recebeu e não teve visita nova não reaparece; cliente que voltou a visitar e
  ficou inativo de novo reaparece; cap diário respeitado com mais elegíveis do que o limite;
  falha de um cliente não impede os demais; opt-out bloqueia envio; nenhum log com conteúdo/
  telefone completo.
- Demonstração ponta a ponta com o adapter dry-run real (sem mock), mesmo padrão da change
  anterior.

## Non-Goals reafirmados (não fazem parte desta change)
- Régua em múltiplos degraus (21/30/45 dias).
- UI de painel para ligar a automação — script CLI.
- Delta em `relatorios` para "cliente reativado"/"R$ recuperado".
- Teste com BSP/template reais — pendência operacional separada.
