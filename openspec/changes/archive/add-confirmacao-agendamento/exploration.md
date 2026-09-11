# Exploração Crítica: Confirmação automática de agendamento

> Etapas 1-3 do fluxo (Ideia → Refinamento → Discussão).
> Não gerar `proposal.md` enquanto existirem perguntas bloqueantes sem resposta.

## Ideia original

Terceira change da Fase 5 (ver `docs/sdd/06-plano-execucao-fase-5.md` § 8): enviar
automaticamente, pelo WhatsApp, um lembrete de confirmação para agendamentos próximos, e
processar a resposta do cliente (confirmar ou pedir remarcação) — fechando o esqueleto honesto
que já existe desde a Fase 2 (`apps/worker/src/jobs/send-confirmation.ts`), que hoje só
seleciona e loga, sem enviar nada.

## Entendimento atual

O terreno já está quase todo preparado pelas duas changes anteriores da Fase 5:

- **Seleção já existe**: `listAppointmentsNeedingConfirmation(now)`
  (`packages/db/src/repositories/appointments.ts`) já retorna, para todas as barbearias, os
  agendamentos com status `agendado` cujo início cai dentro de `confirmation_lead_hours`
  (configurável por barbearia em `agenda_settings`, default existente). O job do worker já
  roda de hora em hora e já chama essa função — só não envia nada.
- **Envio de template já existe**: `WhatsAppProvider.sendTemplate` (`packages/whatsapp`) já
  aplica a regra de opt-out e delega ao adapter; `SendTemplateInput` já tem `bodyParams:
  string[]` (parâmetros posicionais) — exatamente o que um template Meta aprovado exige.
  Templates SHALL poder sair fora da janela de 24h (é para isso que existem).
- **Transição de domínio já existe e já é idempotente**: `confirmAppointment(barbershopId,
  appointmentId)` em `packages/core/src/agenda/agenda-service.ts` — se o agendamento já está
  `confirmado`, retorna `ok` sem re-transicionar; só falha se não for `agendado`. Cobre sozinho
  o requisito de "nunca confirmar duas vezes" do lado da escrita.
- **Falta de fato**: (1) o job efetivamente chamar `sendTemplate`; (2) processar a resposta do
  cliente e chamar `confirmAppointment` quando ele confirmar; (3) a tool `confirmar_agendamento`
  **não existe** no contrato do bot (`packages/core/src/agenda/tools.ts` só tem
  `consultar_disponibilidade`, `criar_agendamento`, `remarcar_agendamento`,
  `cancelar_agendamento`) — ver "Achado" abaixo; (4) nada registra que um agendamento já
  recebeu o template de confirmação, então a seleção horária hoje re-selecionaria o mesmo
  agendamento em toda janela até ele mudar de status — ver "Achado" abaixo.

### Achado 1 — a resposta do cliente entra pelo mesmo cano do `atendimento-ia`, que hoje não sabe confirmar

Toda mensagem inbound (`whatsapp-canal`) que chega com a conversa em `handover = bot` e sem
opt-out já roda o loop de IA do `atendimento-ia` (spec permanente, Requirement "Loop de conversa
roda no worker"). Não existe um caminho separado "processar resposta de confirmação" — a
resposta do cliente ("sim", "pode ser", "quero mudar o horário") chega como qualquer outra
mensagem e passa pelo mesmo loop.

Isso tem uma consequência direta: hoje, se o cliente responder "confirmo" ao lembrete, **o bot
não tem nenhuma tool para de fato marcar o agendamento como confirmado** — só pode responder em
texto livre, o que a spec de `atendimento-ia` proíbe como efeito colateral ("Ações estruturadas
só acontecem via tool, nunca por texto livre do modelo"). Para o pedido de remarcação, a tool
`remarcar_agendamento` já existe e cobre o caso (é por isso que o plano diz "pedir remarcação →
entra na conversa da change 2").

Conclusão: esta change precisa **adicionar uma tool `confirmar_agendamento`** ao contrato do
bot (mapeando 1:1 para `confirmAppointment`, no padrão das demais) — não é só "ligar o envio".
Fica registrado como requisito, não como invenção: é a lacuna que o próprio código expõe.

### Achado 2 — reenvio do lembrete não é idempotente por si só

`listAppointmentsNeedingConfirmation` seleciona por `status = 'agendado' AND startsAt` dentro da
janela — sem nenhum campo "já notificado". O job roda de hora em hora. Enquanto o cliente não
responder (status continua `agendado`), **o mesmo agendamento seria re-selecionado e o template
reenviado a cada execução horária dentro da janela**, até ele confirmar, a barbearia atender por
telefone, ou o horário passar. Isso é diferente da idempotência de escrita (`confirmAppointment`
já resolve) — é idempotência de **envio**, que ninguém resolveu ainda. Vira pergunta bloqueante
abaixo, porque tem custo real (mesmo template *utility* barato, reenviar de hora em hora é
mensurável) e risco de qualidade do número (Meta penaliza reclamação/bloqueio, e reenvio
repetido do mesmo lembrete é candidato natural a isso).

## Problema real

O produto vende como uma das duas provas da dor central ("zap sem operador" → no-show) que o
agendamento é confirmado automaticamente, sem depender do barbeiro lembrar de ligar ou mandar
mensagem manualmente. Hoje isso não acontece: o esqueleto da Fase 2 só loga. Sem esta change, a
promessa central de "no-show evitado" (uma das 4 métricas comerciais que `add-relatorios`
deixou fundação pronta, mas não exibe) continua sem sustento real.

## Coerência estratégica (portão — preencher antes de seguir)

- **Relação com a dor central:** sustenta diretamente uma das duas provas da dor central — o
  **no-show** (a outra é cliente sumido, que é `add-reativacao-clientes`, a próxima change).
  Não ataca a tese em si (zap sem operador durante o atendimento), mas é consequência direta
  dela: agendamento sem confirmação automática também depende de o barbeiro ter tempo de
  ligar, o que ele não tem.
- **Persona atendida:** o ICP padrão (Rafael, 2-4 cadeiras, dono cortando). Nenhuma mudança de
  público.
- **Impacto em comunicação/copy:** SIM — introduz a primeira mensagem automática que a
  **barbearia** manda proativamente ao cliente final (até aqui, `atendimento-ia` só responde;
  aqui o sistema inicia contato). Precisa seguir a voz "barbearia → cliente" do Guia de COPY
  § 13.9 ("é a barbearia falando, não a Blade"; informal, direto, no máximo 1 emoji; sempre
  horário concreto, nunca "confirma?"; nunca se apresentar como robô). O texto do template vai
  para aprovação da Meta — **caro de mudar depois**, então precisa passar pelo checklist
  § 14 antes de ser submetido, não depois.
- **Conflitos identificados com os guias:** nenhum.

## Objetivos

- Enviar o template de confirmação aprovado pela Meta na janela `confirmation_lead_hours` de
  cada barbearia, sem repetir o envio para o mesmo agendamento.
- Processar a resposta do cliente: confirmação transiciona o agendamento para `confirmado` via
  `AgendaService`; pedido de remarcação segue pelo loop existente do `atendimento-ia`
  (`remarcar_agendamento`).
- Registrar o envio para permitir, no futuro, que `relatorios` calcule "no-show evitado".
- Continuar 100% escopado por `barbershop_id`, sem log de conteúdo/telefone completo.

## Fora de escopo inicial

- Mudar `confirmation_lead_hours` ou a UI de configuração dessa janela (já existe, Fase 2).
- `add-reativacao-clientes` (próxima change — cliente inativo, categoria *marketing*).
- Qualquer UI nova no painel além do necessário para acompanhar o status de envio (se algo for
  necessário, é incremento mínimo em `/agenda` ou `/conversas`, não uma tela nova).
- Alterar a métrica exibida em `/relatorios` além de, se fizer sentido, um delta pontual
  habilitando "no-show evitado" (o plano § 8 pede avaliar isso ao concluir, não abrir agora).

## Atores e stakeholders

- Cliente final da barbearia (recebe o lembrete, responde).
- Barbeiro-dono / funcionário (se beneficia do no-show evitado; pode ver o status pelo painel
  ou pelo próprio WhatsApp Business App via coexistência).
- Operador Blade (Matheus) — dono do pré-requisito operacional (submeter o template à Meta).

## Capabilities afetadas ou candidatas

- `confirmacao-agendamento` (nova capability, primeira spec permanente).
- `atendimento-ia` (delta: nova tool `confirmar_agendamento` no contrato do bot).
- `agendamento` (nenhuma mudança de comportamento — só consumo de `confirmAppointment`, que já
  existe; avaliar se cabe um campo de rastreio de envio, mas isso é domínio de
  `confirmacao-agendamento`, não de `agendamento`).
- `relatorios` (candidato a delta futuro, não nesta change — ver "Fora de escopo").

## Casos de uso principais

1. Agendamento entra na janela de `confirmation_lead_hours` → sistema envia template →
   registra o envio.
2. Cliente responde confirmando ("sim", "confirmo", "pode ser") → bot chama
   `confirmar_agendamento` → status vira `confirmado`.
3. Cliente responde pedindo para mudar → bot segue a conversa normal do `atendimento-ia`,
   usando `remarcar_agendamento`.
4. Cliente não responde nada → agendamento permanece `agendado`; comportamento hoje (nenhuma
   ação adicional) seria mantido, a menos que os sócios decidam por um segundo lembrete (ver
   perguntas).
5. Reentrega do webhook da Meta para o mesmo evento de resposta → não deve confirmar duas
   vezes (já coberto por `confirmAppointment` + deduplicação de mensagem do `whatsapp-canal`).

## Edge cases e falhas relevantes

- Cliente responde de forma ambígua ("talvez", "não sei ainda") — cai no comportamento padrão
  do `atendimento-ia` (segue conversando ou escala por estagnação); não é caso novo.
- Cliente já confirmou por telefone/presencialmente antes do lembrete chegar — `agenda` já
  suporta marcar confirmado manualmente pelo painel (Fase 2); o lembrete não deveria mais sair
  se o status já não for `agendado` — a query já filtra por isso.
- Agendamento é cancelado ou remarcado para fora da janela **depois** de o job já ter
  selecionado mas **antes** de enviar (race dentro da mesma execução) — mitigação: reler o
  status imediatamente antes de enviar, dentro do próprio job.
- Envio de template falha (erro do provedor/BSP) — não deve travar os demais agendamentos da
  mesma execução; registrar falha sem lançar exceção não tratada (mesmo padrão de degradação
  do `atendimento-ia`).
- Barbearia sem template aprovado ainda (rollout gradual entre clientes reais) — sistema não
  pode quebrar nem tentar enviar; precisa de um jeito de saber "esta barbearia tem confirmação
  automática ativa" antes de tentar.

## Regras de negócio

### Confirmadas
- Template de confirmação: categoria *utility*, idioma `pt_BR`, parâmetros para nome do
  cliente, dia e horário (plano § 8, § 3.1).
- Confirmação transiciona `agendado → confirmado` via `AgendaService.confirmAppointment`,
  idempotente.
- Remarcação pedida na resposta usa o loop e a tool já existentes do `atendimento-ia`.
- Envio de template ignora a janela de 24h (regra já implementada em `WhatsAppProvider`), só é
  bloqueado por opt-out.

### Inferidas (validar)
- Um único lembrete por agendamento (sem segunda tentativa automática) é o comportamento mais
  simples e mais alinhado ao que o plano descreve — mas não está escrito explicitamente em
  lugar nenhum. Ver pergunta bloqueante.
- O rastreio de "já enviado" deveria viver como um campo/tabela em `confirmacao-agendamento`
  (nova capability), não em `agenda_settings`/`appointments` — mantém `agendamento` sem
  conhecimento de canal, no mesmo espírito de separação que `whatsapp-canal` e `atendimento-ia`
  já seguem.

### Em aberto
- Como o sistema sabe se uma barbearia específica já tem template aprovado e está pronta para
  receber confirmação automática (feature flag por barbearia, ou coluna em `agenda_settings`,
  ou presença de config no BSP)? Ver pergunta bloqueante.

## Restrições técnicas conhecidas

- Depende de o BSP estar contratado e do template estar **submetido e aprovado pela Meta**
  antes de qualquer teste ponta a ponta real ser possível — é tarefa comercial do Matheus,
  deliberadamente fora do escopo técnico (mesmo padrão usado em `add-whatsapp-canal`, onde a
  contratação do BSP também ficou de fora, no grupo 9 do `tasks.md`).
- `WhatsAppAdapter.sendTemplate` já existe na interface, mas o adapter concreto
  (`cloud-api/adapter.ts`) precisa ser verificado/testado contra o formato real de template do
  BSP contratado — mesmo achado que `add-whatsapp-canal` já registrou como pendência (task 9.x
  daquela change).
- `confirmar_agendamento` como nova tool precisa seguir exatamente o padrão de
  `packages/core/src/agenda/tools.ts` (zod/v4, `handler(barbershopId, input)`) e ser
  re-exposta por `packages/ai` como as demais.

## Requisitos não funcionais relevantes

- **LGPD**: mensagem de confirmação contém nome do cliente e horário — mesmo cuidado de log já
  aplicado em `whatsapp-canal`/`atendimento-ia` (nunca logar conteúdo nem telefone completo).
- **Risco de ban/qualidade do número WhatsApp**: reenvio duplicado do mesmo lembrete é
  exatamente o tipo de padrão que a Meta penaliza (reclamação de spam). Ver Achado 2 e riscos
  abaixo.
- **Isolamento multi-tenant (ADR-0007)**: seleção, envio e registro sempre escopados por
  `barbershop_id`.

## Riscos

| Risco | Tipo | Impacto | Probabilidade | Mitigação | Decisão necessária |
|---|---|---:|---:|---|---|
| Reenvio do mesmo lembrete a cada execução horária do job, até o cliente responder | Técnico/produto | Médio-Alto (custo, spam percebido, risco de qualidade do número) | Alta, sem mitigação | Registrar `confirmation_sent_at` (ou equivalente) e não reselecionar quem já recebeu | Pergunta bloqueante 1 |
| Template de confirmação não fica pronto (BSP não contratado / Meta não aprova a tempo) | Operacional | Alto (change fica sem forma de ser testada/validada ponta a ponta) | Média (já é pendência conhecida desde `add-whatsapp-canal`) | Escrever a change com dry-run/mock cobrindo o caminho todo, sem depender do template real para `Done` técnico | Pergunta bloqueante 2 |
| Ausência de tool `confirmar_agendamento` faz o bot responder "confirmado" em texto sem persistir nada | Correção/confiança | Alto (cliente acha que confirmou, banco discorda) | Certa se não for corrigida | Adicionar a tool nesta change, com teste que prova a transição real | Nenhuma — já decidido, registrado como objetivo |
| Barbearia sem template aprovado ainda recebe tentativa de envio | Operacional | Médio (erro em produção, ruído em log) | Média (rollout será gradual entre clientes) | Alguma forma de "confirmação automática ativa" por barbearia antes de tentar enviar | Pergunta bloqueante 3 |

## Premissas

- O BSP com mensalidade fixa (D2/ADR-0004, § 5.9) já foi escolhido como caminho; a contratação
  específica e a submissão do template continuam pendentes e são tarefa do Matheus, não desta
  change.
- `apps/worker/src/jobs/send-confirmation.ts` é o ponto de partida certo (só precisa parar de
  só logar) — não é necessário um job novo.
- A resposta do cliente não precisa de um caminho técnico separado do `atendimento-ia` — só
  precisa que o bot tenha a tool certa disponível.

## Perguntas críticas

### Bloqueantes

1. **Reenvio do lembrete**: o sistema deve enviar o template **uma única vez** por agendamento
   (registrando o envio e nunca mais reselecionando aquele agendamento, mesmo que o cliente não
   responda), ou deve haver alguma re-tentativa (ex.: reenviar 1x se não houver resposta em N
   horas)? Recomendo uma única vez — é o comportamento mais simples, mais barato e mais seguro
   para a reputação do número — mas é decisão de produto, não técnica.
2. **Gate operacional**: como o sistema sabe que uma barbearia tem template aprovado e está
   pronta para confirmação automática? Proposta: campo booleano em `agenda_settings` (ex.:
   `confirmationAutomationEnabled`), ligado manualmente pelo Matheus (via painel ou seed) só
   depois de confirmar o template aprovado para aquela barbearia — barbearias sem o campo ativo
   nunca entram na seleção. Preciso de validação: é assim que deve funcionar, ou existe outro
   mecanismo já pensado (ex.: uma tabela de "configuração de provedor" por barbearia que ainda
   não vi)?
3. **Definition of Done sem template real aprovado**: dado que o template pode não estar
   aprovado pela Meta quando a implementação técnica terminar, o "Done" desta change pode
   depender de teste ponta a ponta com dry-run/mock do adapter (no padrão que `add-whatsapp-canal`
   já usa para BSP), deixando o teste com o BSP real registrado como tarefa pendente separada —
   ou o Matheus prefere iniciar a submissão do template AGORA (em paralelo a esta exploração)
   para que a change só feche com o caminho real testado?

### Importantes, não bloqueantes

1. O texto do template (nome, dia, horário + call to action de responder) deveria já nascer
   redigido nesta change (para agilizar a submissão à Meta) ou fica para o `design.md`, depois
   da aprovação do proposal? Recomendo escrever um rascunho já no `design.md`, seguindo o guia
   de copy § 13.9, para o Matheus poder submeter o quanto antes (é o item de maior lead time da
   change).
2. Vale a pena, nesta change, já aplicar o delta em `relatorios` para exibir "no-show evitado",
   ou isso fica deliberadamente para depois, como o plano § 8 sugere ("avalie ao concluir")?
   Recomendo deixar para depois — evita acoplar duas capabilities na mesma change, mesmo padrão
   que `add-whatsapp-canal`/`add-atendimento-ia` já seguiram.

## Decisões da discussão

> Preenchido na etapa 3, com as respostas dos sócios.

| Pergunta | Decisão | Quem | Data |
|---|---|---|---|
| Bloqueante 1 — reenvio do lembrete | **Uma única vez por agendamento.** Enviado quando entra na janela de `confirmation_lead_hours`; o agendamento nunca é reselecionado depois disso, respondendo ou não o cliente. | Matheus | 2026-09-11 |
| Bloqueante 2 — gate por barbearia | **Campo booleano em `agenda_settings`** (ex.: `confirmationAutomationEnabled`), ligado manualmente pelo Matheus só depois de confirmar o template aprovado para aquela barbearia. Barbearia sem o campo ativo nunca entra na seleção. | Matheus | 2026-09-11 |
| Bloqueante 3 — Done sem template real aprovado | **Fecha com dry-run/mock** (mesmo padrão de `add-whatsapp-canal`): a change técnica é considerada Done com o caminho todo testado via mock do adapter; testar com o BSP e template reais fica registrado como tarefa pendente separada, fora do Done técnico desta change. | Matheus | 2026-09-11 |

**Perguntas importantes, não bloqueantes — resolvidas por decisão de arquiteto (premissa marcada, não invenção de requisito), seguindo a própria recomendação registrada acima:**
- Rascunho do texto do template nasce no `design.md` desta change (para o Matheus poder submeter à Meta o quanto antes — é o item de maior lead time).
- Delta em `relatorios` para exibir "no-show evitado" fica **fora** desta change, para avaliação posterior, como o plano § 8 já sugeria.
