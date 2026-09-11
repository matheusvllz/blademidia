# Exploração Crítica: Reativação automática de clientes inativos

> Etapas 1-3 do fluxo (Ideia → Refinamento → Discussão).
> Não gerar `proposal.md` enquanto existirem perguntas bloqueantes sem resposta.

## Ideia original

Quarta e última change da Fase 5 (`docs/sdd/06-plano-execucao-fase-5.md` § 9): detectar clientes
inativos (regra já existente da Fase 1, `inactivityDaysThreshold`) e enviar uma mensagem
automática de reativação pelo WhatsApp, fechando o esqueleto honesto que já existe desde a Fase
2 (`apps/worker/src/jobs/reactivation-sweep.ts`), que hoje só seleciona e loga a contagem.

> **O plano já marca esta como "a change de maior risco da fase"** — categoria *marketing*
> (não *utility* como as duas anteriores), envio em lote para quem não pediu nada, regras de
> opt-out mais rígidas e custo real por mensagem, sem desconto de volume.

## Entendimento atual

- **Seleção já existe**: `getDashboard(barbershopId).clientsToReactivate` (Fase 1) já usa
  `isClientInactive(lastVisitAt, threshold)` e devolve `{id, name, lastVisitAt}`, ordenado por
  "mais tempo sumido primeiro". **Falta telefone** — a função dashboard serve à UI, não ao
  canal; não deve ganhar telefone só para isto (mesma separação de responsabilidade adotada em
  `add-confirmacao-agendamento`, Achado 2).
- **Envio de template e opt-out já existem**: `WhatsAppProvider.sendTemplate` ignora a janela
  de 24h e só é bloqueado por opt-out (`whatsapp-canal`, já concluído). `findOrCreateConversation`
  já resolve/cria a conversa a partir do telefone.
- **Resposta do cliente não precisa de tool nova** (diferença importante de
  `add-confirmacao-agendamento`): reativação é uma pergunta aberta ("vai voltar?"), não um
  "sim/não" transacional 1:1 com um registro específico. Se o cliente responder querendo
  agendar, o loop existente do `atendimento-ia` já cobre isso com as tools que já existem
  (`consultar_disponibilidade`, `criar_agendamento`, `cadastrar_cliente_basico` se for
  telefone novo). Nenhuma tool nova é necessária aqui.
- **Falta de fato**: (1) o job enviar de verdade; (2) uma seleção própria do canal (telefone +
  gate por barbearia + registro de envio, análoga a `listAppointmentsNeedingConfirmation`);
  (3) uma regra de **reenvio** (diferente de confirmação: lá era "nunca mais"; aqui o cliente
  pode voltar a ficar inativo depois de uma visita, então "nunca mais para sempre" provavelmente
  não é a regra certa — ver pergunta bloqueante); (4) throttling (o plano exige
  explicitamente "não despejar a lista inteira de uma vez", sem definir o número).

### Achado — divergência entre documentos sobre "régua única" vs "régua em degraus"

`openspec/project.md` (decisão estrutural, D-level) diz: **"cliente sem visita há 21+ dias
recebe mensagem"** — singular, um único limiar. O mesmo número aparece em
`docs/business/dor-central.md` e é citado como "régua de 21 dias" na tabela de diferenciação.
Mas `docs/business/guia-de-copy.md` (linha 322, tabela de benefícios) lista **"Régua de
reativação (21/30/45 dias)"** como um recurso vendido — três degraus, não um.

Isto é uma divergência real de documentos, não uma dúvida minha: ou o guia de copy descreve um
recurso futuro/aspiracional que ainda não foi decidido tecnicamente, ou `project.md` está
desatualizado. Pelo workflow (portão estratégico), uma divergência assim **sobe para decisão
dos sócios** antes de eu assumir qualquer um dos dois lados. Vira pergunta bloqueante abaixo —
o escopo desta change muda substancialmente dependendo da resposta (um envio por ciclo de
inatividade vs. uma campanha de até 3 envios escalonados).

## Problema real

A segunda das duas provas da dor central ("zap sem operador" → cliente sumido) ainda não é
resolvida de fato: a barbearia não tem hoje nenhum mecanismo automático de chamar de volta quem
parou de aparecer, e o dono não tem tempo de fazer isso manualmente (é exatamente a mesma causa
raiz do no-show). O esqueleto da Fase 2 prova que a seleção funciona; falta o envio.

## Coerência estratégica (portão — preencher antes de seguir)

- **Relação com a dor central:** sustenta diretamente a segunda prova da dor central —
  **cliente sumido** (a primeira, no-show, foi endereçada por `add-confirmacao-agendamento`).
  Vocabulário oficial já definido no guia de copy: "chama de volta quem sumiu", "quem sumiu
  recebe mensagem sozinho, sem você lembrar".
- **Persona atendida:** ICP padrão. Nota do próprio guia de persona: barbearia nova (< 6 meses)
  não tem base para reativar — não é público desta change, mas isso já está fora do ICP, não é
  uma decisão nova.
- **Impacto em comunicação/copy:** SIM, e é o ponto mais sensível desta change — é a primeira
  mensagem **não solicitada** que o produto envia (confirmação é sobre algo que o cliente já
  agendou; reativação é iniciativa pura da barbearia). Categoria marketing pela Meta. Segue a
  voz "barbearia → cliente" (§ 13.9), com o vocabulário já validado ("sumiu"), e passa pelo
  checklist § 14 antes de submissão à Meta — igual à change anterior, mas com a barra mais alta
  porque é a mensagem mais fácil de soar "spam" das quatro da Fase 5.
- **Conflitos identificados com os guias:** a divergência 21 dias vs. 21/30/45 dias, registrada
  acima — é o único conflito, e é bloqueante.

## Objetivos

- Enviar o template de reativação aprovado pela Meta para clientes inativos, respeitando
  opt-out sem exceção e um limite diário por barbearia (throttling).
- Nunca reenviar para o mesmo cliente antes de uma regra de intervalo mínimo clara (a definir).
- Registrar o envio para permitir, no futuro, a métrica "cliente reativado" no relatório.
- Continuar 100% escopado por `barbershop_id`, sem log de conteúdo/telefone completo.

## Fora de escopo inicial

- Delta em `relatorios` para exibir "cliente reativado"/"R$ recuperado" — avaliação
  explicitamente adiada, mesmo padrão de `add-confirmacao-agendamento`.
- Qualquer UI nova de configuração além do necessário para ligar a automação (mesmo padrão:
  script operacional, não self-service — a decidir se confirma essa mesma escolha aqui).
- Vincular causalmente uma visita futura a um envio de reativação específico (é a base da
  métrica futura, não desta change).
- Mudar `inactivityDaysThreshold` ou a UI que já existe (Fase 1) para configurá-lo.

## Atores e stakeholders

- Cliente final inativo da barbearia (recebe a mensagem, pode responder ou nunca mais).
- Barbeiro-dono / funcionário (se beneficia do cliente reativado).
- Operador Blade (Matheus) — pré-requisito operacional (template + BSP), conta de custo
  obrigatória antes do primeiro envio real (plano § 9, "grupo de tarefa que não pode faltar").

## Capabilities afetadas ou candidatas

- `reativacao-clientes` (nova capability, primeira spec permanente).
- `crm-clientes` (nenhuma mudança de comportamento — só leitura da regra de inatividade já
  existente; se a seleção própria do canal precisar de um campo/tabela novo, ele nasce em
  `reativacao-clientes`, não em `crm-clientes`, mesmo princípio de separação já usado).
- `relatorios` (candidato a delta futuro, não nesta change).

## Casos de uso principais

1. Cliente ultrapassa `inactivityDaysThreshold` sem visita → entra na seleção → job envia o
   template de reativação, respeitando o limite diário da barbearia.
2. Cliente responde interessado em agendar → segue a conversa normal do `atendimento-ia`
   (tools já existentes) — nenhum caminho novo.
3. Cliente responde com opt-out ("PARE"/"SAIR") → mecanismo já existente de `whatsapp-canal`
   marca opt-out; nunca mais recebe nada, nem reativação nem qualquer outro envio.
4. Cliente não responde nada → depende da regra de reenvio (pergunta bloqueante).
5. Cliente volta a visitar a barbearia (por qualquer canal) depois de já ter recebido uma
   reativação, e mais tarde fica inativo de novo → deve poder entrar na seleção de novo (não é
   "banido para sempre" da reativação) — a menos que a regra de reenvio diga o contrário.
6. Barbearia com muitos clientes inativos simultaneamente (ex.: acabou de migrar dados
   antigos) → throttling evita despejar todos de uma vez.

## Edge cases e falhas relevantes

- Cliente nunca teve nenhuma visita registrada (`lastVisitAt = null`) — `isClientInactive`
  já trata como inativo desde o primeiro dia. Faz sentido mandar "reativação" pra alguém que
  nunca veio? Provavelmente o texto não deveria dizer "há um tempo que você não aparece" para
  esse caso — risco de soar estranho/quebrar a confiança no texto. Ver pergunta importante.
- Cliente anonimizado por exclusão LGPD (`phone = null`) — mesma defesa já aplicada em
  `add-confirmacao-agendamento`: nunca selecionar quem não tem telefone.
- Falha de envio de um cliente não pode interromper os demais do lote (mesmo padrão da change
  anterior).
- Reentrega do webhook/duplicidade de envio sob concorrência — mesma garantia de banco
  (`UNIQUE`) usada em `confirmation_reminders`.
- Barbearia sem template de reativação aprovado ainda — mesmo gate por barbearia da change
  anterior, valor booleano separado (categoria de template diferente, aprovação separada).

## Regras de negócio

### Confirmadas
- Categoria do template: **marketing** (não *utility*) — regras de opt-out mais rígidas, custo
  real, sem desconto de volume (plano § 3.5/§ 9).
- Opt-out interrompe qualquer envio futuro, sem exceção, já mecanismo existente.
- Matheus autorizou o envio de reativação em 2026-09-07 ("só uma mensagem pro cliente
  perguntando se ele vai voltar") — autorização registrada, não dispensa as 3 ressalvas abaixo.
- Throttling é obrigatório — "não despejar a lista inteira de uma vez" (texto literal do
  plano); o número exato não está definido.

### Inferidas (validar)
- Resposta do cliente não precisa de tool nova — usa o loop/tools já existentes do
  `atendimento-ia`.
- Registro de envio deveria viver em tabela própria de `reativacao-clientes`, análoga a
  `confirmation_reminders`, mas sem unicidade permanente por cliente (o cliente pode voltar a
  ser elegível depois de um novo ciclo de inatividade) — depende da pergunta bloqueante sobre
  reenvio.

### Em aberto
- Régua única (21 dias) vs. régua em degraus (21/30/45 dias) — pergunta bloqueante 1.
- Regra de reenvio/cooldown para o mesmo cliente — pergunta bloqueante 2.
- Valor do limite diário de envios por barbearia (throttling) — pergunta importante, não
  bloqueante (proponho um padrão conservador, ajustável depois).

## Restrições técnicas conhecidas

- Depende do MESMO pré-requisito operacional da change anterior, mas com aprovação **separada**
  na Meta: template de reativação, categoria marketing, submetido e aprovado — tarefa comercial
  do Matheus, fora do escopo técnico (mesmo padrão de `add-whatsapp-canal`/
  `add-confirmacao-agendamento`).
- Antes de qualquer envio real, o plano exige "fazer a conta do custo" (nº de inativos × preço
  do template marketing) contra a base real de um cliente — tarefa operacional do Matheus,
  registrada como bloqueio de produção, não de fechamento técnico da change (mesmo padrão do
  "Done sem template real" já usado).
- `WhatsAppProvider.sendTemplate`/`findOrCreateConversation` já existem e cobrem o necessário.

## Requisitos não funcionais relevantes

- **LGPD**: reativação é a mensagem mais sensível das 4 da Fase 5 do ponto de vista de base
  legal — não há relação de agendamento em curso, só histórico de cliente. O plano já aponta
  **legítimo interesse** como o argumento (relação prévia existente + opt-out como salvaguarda),
  mas exige que isso fique **escrito no design.md**, não como decisão implícita — e reforça que
  dúvida jurídica real é para advogado, não para decisão de agente. Registro aqui como premissa
  a confirmar no design, não como fato jurídico estabelecido.
- **Risco de ban/qualidade do número WhatsApp**: mensagem de marketing para quem não pediu é o
  cenário de maior risco de reclamação das 4 mensagens automáticas do produto — throttling e
  opt-out são mitigação estrutural, não op cional.
- **Isolamento multi-tenant (ADR-0007)**: seleção, envio e registro sempre escopados por
  `barbershop_id`.

## Riscos

> Registrados como Risco por instrução explícita do plano § 9 — as 3 ressalvas da autorização
> de Matheus não foram dispensadas.

| Risco | Tipo | Impacto | Probabilidade | Mitigação | Decisão necessária |
|---|---|---:|---:|---|---|
| A Meta classifica por intenção, não por tamanho — mensagem curta em lote é *marketing*, aprovação mais rigorosa e custo diferente de *utility* | Operacional/produto | Médio-Alto | Certa (já é a categoria assumida) | Template submetido corretamente como marketing desde o início; nenhuma tentativa de disfarçar como utility | Nenhuma — já reconhecida, sem decisão pendente |
| Opt-out não é opcional em marketing (nem para a Meta, nem para a LGPD) | Legal/produto | Alto se violado | Baixa (mecanismo já existe) | Reuso do opt-out já implementado em `whatsapp-canal`, sem exceção nesta capability | Nenhuma — mecanismo já existe, só reforçar teste dedicado |
| Base legal precisa estar escrita, não implícita — "não muda nada de mais" não é base legal | Legal | Alto se questionado | Baixa | Legítimo interesse documentado no design.md, com opt-out como salvaguarda explícita; se houver dúvida jurídica real, escalar para advogado, não decidir como agente | Confirmação de Matheus de que o texto do design.md está de acordo antes de Approved |
| Rebaixamento de qualidade do número por reclamação em massa | Operacional | Alto | Média sem throttling | Limite diário por barbearia + seleção pelos mais antigos primeiro (já ordenado) | Pergunta importante (valor do limite) |
| Custo de marketing multiplicado pelo tamanho da base inativa, sem desconto de volume | Financeiro | Alto | Certa, magnitude a confirmar | Conta obrigatória contra base real antes do primeiro envio (tarefa do Matheus, plano § 9) | Nenhuma decisão técnica — é tarefa operacional registrada |
| Reenvio sem regra clara pode soar como spam repetido para quem já recebeu e não respondeu | Produto/reputação | Médio-Alto | Alta sem regra definida | Regra de cooldown/reenvio explícita | Pergunta bloqueante 2 |

## Premissas

- O gate por barbearia segue o mesmo padrão de `confirmationAutomationEnabled`: campo booleano
  próprio (`reactivationAutomationEnabled`, em `crm_settings` — mesmo lugar de
  `inactivityDaysThreshold`), ligado por script análogo a `enable-confirmation-automation.ts`.
- "Done técnico sem template real aprovado" segue a mesma decisão já tomada para
  `add-confirmacao-agendamento` (fecha com dry-run/mock) — não repito a pergunta, assumo
  continuidade de critério; sinalizado aqui para o caso de Matheus discordar desta vez.
- Limite diário de envios por barbearia (throttling): proponho um padrão conservador (ex.: 5
  por barbearia por execução do job, que já roda 1x/dia) até existir dado real de reclamação —
  ajustável depois sem mudança de arquitetura. Fica como premissa, não bloqueante, porque é
  reversível e não muda o comportamento central.

## Perguntas críticas

### Bloqueantes

1. **Régua única ou em degraus?** `project.md` (estrutural) e `dor-central.md` descrevem um
   único limiar (21+ dias, uma mensagem). `guia-de-copy.md` descreve "régua de reativação
   (21/30/45 dias)" como recurso vendido — três degraus. Esta change implementa qual dos dois?
   Recomendo o único limiar (21 dias, reaproveitando `inactivityDaysThreshold` já existente) por
   ser o que está na decisão estrutural (`project.md`) e no plano de execução da Fase 5 — a
   régua em degraus, se for de fato o objetivo, é naturalmente uma change maior (múltiplos
   templates, múltiplos registros de cooldown por degrau) que talvez mereça ficar para depois
   desta v1. Mas a divergência entre os documentos precisa ser resolvida por vocês, não por mim.

2. **Regra de reenvio/cooldown**: depois de enviar uma reativação para um cliente que não
   responde nem volta a visitar, quando (se algum dia) ele pode receber outra? Opções que vejo:
   (a) nunca mais — um único envio por cliente, para sempre; (b) um novo envio é permitido só
   depois de um intervalo mínimo (ex.: 90 dias) desde o último envio, enquanto ele continuar
   inativo; (c) um novo envio só depois de uma visita nova seguida de um novo ciclo de
   inatividade (reseta a régua a cada "retorno e sumiço" do cliente). Recomendo (c) — é o mais
   alinhado com "chama de volta quem sumiu" sem virar spam repetido para quem já decidiu não
   responder, e mais simples de implementar corretamente (o próprio `lastVisitAt` já diferencia
   os casos). Preciso da decisão de vocês, é regra de negócio central desta change.

### Importantes, não bloqueantes

1. **Limite diário de throttling**: proponho 5 envios por barbearia por execução do job (job
   já roda 1x/dia, `0 8 * * *`), configurável depois sem mudança de arquitetura. Confirmar se
   esse número é razoável ou se há uma preferência diferente.
2. **Cliente que nunca teve visita nenhuma** (`lastVisitAt = null`) — o texto do template
   "você sumiu" não faz sentido para quem nunca veio. Proponho excluir esse caso do envio
   automático nesta capability (ele já é candidato a intervenção manual/prospecção, não
   reativação) — ele continua contando como "inativo" no dashboard da Fase 1, só não entra na
   seleção de envio automático. Confirmar se faz sentido.

## Decisões da discussão

> Preenchido na etapa 3, com as respostas dos sócios.

| Pergunta | Decisão | Quem | Data |
|---|---|---|---|
| Bloqueante 1 — régua única ou em degraus | **Limiar único**, reaproveitando `inactivityDaysThreshold` (default 21 dias) — **já configurável por barbearia** desde a Fase 1 (Configurações → Inatividade), sem mudança nesta change. A régua em degraus (21/30/45) NÃO faz parte desta v1; fica registrada como possível change futura, sem compromisso de prazo. | Matheus | 2026-09-11 |
| Bloqueante 2 — regra de reenvio/cooldown | **Novo ciclo de inatividade**: um cliente só volta a ser elegível para reativação depois de uma visita nova seguida de um novo período de inatividade. Nunca reenvia em loop para quem continua sumido sem ter respondido. | Matheus | 2026-09-11 |
