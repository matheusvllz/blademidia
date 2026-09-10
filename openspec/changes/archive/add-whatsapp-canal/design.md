# Design: Canal WhatsApp (Meta Cloud API via BSP)

## Context
O produto (`apps/web` Next 15, `packages/db` Drizzle+Postgres, `apps/worker` pg-boss) não tem
canal de mensagem. A decisão de provedor (D2/ADR-0004) é Meta Cloud API, integrada via BSP com
mensalidade fixa (§ 5.9 do plano de execução), com coexistência confirmada: o número continua
no WhatsApp Business App do barbeiro e responde à Cloud API ao mesmo tempo, com mensagens
espelhadas nos dois sentidos. O BSP específico ainda não foi contratado — o adapter desta
change segue o formato documentado da Meta Cloud API como referência (ver Decision 1).

## Goals and Constraints

### Goals
- Canal funcional de recepção/envio, testável em modo dry-run sem credencial real.
- Zero acoplamento entre domínio e formato de provedor.
- Ingestão que nunca bloqueia o webhook nem duplica processamento.

### Constraints
- D4 (orçamento): sem custo de infra novo — reusa Postgres e worker já provisionados.
- D5 (multi-tenancy): toda tabela nova tem `barbershop_id`, todo acesso escopado.
- D2/ADR-0004: provedor abstraído atrás de `WhatsAppProvider`; adapter isolado em `packages/whatsapp`.
- ADR-0011: ingestão assíncrona — webhook só persiste e enfileira.
- LGPD: conteúdo de mensagem e telefone completo nunca em log; exclusão de cliente anonimiza.

## Proposed Architecture

```
packages/whatsapp/
  src/provider.ts        interface WhatsAppProvider (enviarTexto, enviarTemplate, normalizar,
                          verificarAssinatura, responderChallenge)
  src/dry-run.ts          adapter que loga em vez de enviar — usado sem credencial
  src/cloud-api/adapter.ts     adapter concreto contra o formato Meta Cloud API (Decision 1)
  src/cloud-api/signature.ts   verificação HMAC sobre corpo cru
  src/cloud-api/normalize.ts   payload → evento interno normalizado
  src/phone.ts            normalização E.164 + nono dígito (BR)

packages/db/src/schema/
  whatsapp-conversations.ts
  whatsapp-messages.ts
packages/db/src/repositories/
  whatsapp-conversations.ts
  whatsapp-messages.ts

apps/web/
  app/api/webhooks/whatsapp/route.ts   GET (challenge) + POST (assinatura → persiste → enfileira → 200)
  app/conversas/page.tsx               lista (leitura) — Server Component, busca direto no
                                        banco (mesmo padrão de app/clientes/page.tsx), sem
                                        rota de API intermediária
  app/conversas/[id]/page.tsx          histórico de uma conversa (leitura), idem

apps/worker/src/jobs/process-inbound.ts   consumidor da fila — nesta change só resolve
                                          tenant/cliente e marca handover; loop de IA entra
                                          na change 2 (add-atendimento-ia)
```

## Technical Decisions

### Decision 1: Adapter concreto segue o formato Meta Cloud API, não um BSP específico
- Decision: `packages/whatsapp/src/cloud-api/adapter.ts` implementa `WhatsAppProvider` contra
  o contrato documentado da Meta Cloud API (endpoint `POST /{PHONE_NUMBER_ID}/messages`,
  verificação de challenge `GET`, assinatura `X-Hub-Signature-256`) — não contra a API de um
  BSP específico, porque nenhum foi contratado ainda (§ 5.9 do plano).
- Rationale: é o contrato mais estável e publicamente documentado; muitos BSPs de mensalidade
  fixa (o modelo escolhido) expõem esse formato quase sem alteração. A interface
  `WhatsAppProvider` isola o domínio — se o BSP real divergir, só este arquivo muda.
- Trade-offs: risco de retrabalho pontual no adapter quando o BSP for escolhido e a
  documentação real for conferida (registrado como Risco no proposal, não escondido).
- Consequences: nenhuma credencial de produção é necessária para esta change avançar até o
  fechamento; a validação final do adapter contra credenciais reais é a última etapa,
  explicitamente fora desta change de implementação (fica documentada como runbook).

### Decision 2: Ingestão assíncrona (ADR-0011) — webhook nunca processa inline
- Decision: o handler do webhook faz só: ler corpo cru → verificar assinatura → normalizar →
  persistir (com dedupe por `wamid`) → enfileirar job `whatsapp.process-inbound` → responder
  `200`. Todo processamento de negócio (resolver cliente, `handover`, e — na change 2 — o
  loop de IA) roda no worker.
- Rationale: já registrado em ADR-0011; a Meta/BSP exige `200` rápido e reentrega em caso de
  lentidão ou falha.
- Trade-offs: latência extra de fila (enfileirar → processar), imperceptível ao usuário final.
- Consequences: reusa `apps/worker` + pg-boss já provados (Fases 2-3), sem infraestrutura nova.

### Decision 3: Dedupe de mensagem por restrição de unicidade no banco
- Decision: `whatsapp_messages.wamid` tem índice único. Uma segunda tentativa de inserir a
  mesma mensagem falha por violação de unicidade; o repositório trata esse erro como "já
  processada" (idêntico ao padrão de `isExclusionViolation` em `appointments.ts` para o código
  de erro do Postgres) e retorna sem re-enfileirar.
- Rationale: mesmo padrão já usado no anti-double-booking da Fase 2 — a garantia vive no
  banco, não em lógica de aplicação que pode ter corrida.
- Trade-offs: nenhum relevante.

### Decision 4: Lock de processamento por conversa via singleton do pg-boss
- Decision: o job `whatsapp.process-inbound` é enfileirado com `singletonKey` igual ao id da
  conversa (`conversation_id`), usando o suporte nativo do pg-boss a chave de singleton — duas
  mensagens da mesma conversa em sequência rápida não geram dois jobs em processamento
  paralelo.
- Rationale: é o cenário de concorrência mais provável da fase inteira (ADR-0011) — resolver
  com a primitiva que o pg-boss já oferece evita lock manual no banco.
- Trade-offs: mensagens da mesma conversa são processadas em série, não em paralelo — correto
  aqui, porque uma conversa é inerentemente sequencial (não faz sentido responder duas
  mensagens do mesmo cliente fora de ordem).

### Decision 5: Detecção de `handover` por origem da mensagem, não por flag manual
- Decision: toda mensagem de saída registrada pelo sistema carrega `direction: "saida"` e
  `origem_bot: true` (quando enviada pelo próprio fluxo automatizado — vazio nesta change,
  usado pela change 2). Uma mensagem de saída que chega pelo webhook **sem** ter sido
  originada por um envio do próprio sistema (ou seja: o número do negócio enviou algo que o
  sistema não mandou) é reconhecida como resposta humana via app, e marca
  `handover = "humano"`.
- Rationale: é a única forma de saber, sob coexistência, que o barbeiro respondeu pelo
  aplicativo sem exigir ação explícita dele no painel.
- Trade-offs: depende do payload do provedor sinalizar a direção/origem da mensagem de forma
  distinguível — a normalizar e testar contra o formato real assim que o BSP for escolhido
  (mesma ressalva da Decision 1).

### Decision 7 *(achado durante a implementação — não previsto na primeira versão deste design)*: roteamento do webhook único por `barbershops.whatsappPhoneNumberId`
- Decision: `barbershops` ganha a coluna `whatsapp_phone_number_id` (nullable, único). O
  webhook é um único endpoint compartilhado por todas as barbearias — a Meta/BSP identifica
  o número de destino via `metadata.phone_number_id` no payload. Sem essa coluna, não havia
  como resolver `barbershop_id` antes de criar a conversa.
- Rationale: faltava no design original o mecanismo de roteamento tenant — os requisitos de
  isolamento (spec `whatsapp-canal`, "Isolamento de dados entre barbearias") pressupunham
  implicitamente que esse roteamento existia. Corrigido aqui em vez de silenciosamente, por
  `conventions.md`: "se durante o design surgir um requisito, volte e atualize a spec".
- Trade-offs: nenhum relevante — coluna nullable, aditiva, não quebra nada existente.
- Consequences: mensagem para um `phone_number_id` não reconhecido (nenhuma barbearia com
  esse valor) é um cenário de erro que precisa de tratamento explícito (ver Error Flow 4).

### Decision 8 *(achado durante a implementação)*: webhook precisa sair do gate de sessão do `middleware.ts`
- Decision: `apps/web/middleware.ts` bloqueia toda rota `/api/**` sem cookie de sessão, exceto
  uma lista curta de `PUBLIC_PATHS`. `/api/webhooks/whatsapp` entra nessa lista — a Meta/BSP
  nunca terá cookie de sessão; a autenticação da rota é a assinatura HMAC, verificada dentro
  do próprio handler.
- Rationale: descoberto ao testar via `curl` real (§ evidência da task 3.1) — sem isso, todo
  webhook seria bloqueado antes mesmo de a verificação de assinatura rodar.
- Trade-offs: nenhum — a rota já se autentica sozinha (design.md, Error Flow 1); tirá-la do
  gate de sessão não abre superfície nova, só remove uma dupla checagem incompatível com o
  tipo de chamador.

### Decision 6: Normalização de telefone (E.164 + nono dígito BR)
- Decision: `packages/whatsapp/src/phone.ts` normaliza todo telefone recebido para E.164 e,
  ao casar com `findClientByPhone`, tenta a forma recebida e a forma alternativa
  com/sem o nono dígito antes de concluir "não cadastrado".
- Rationale: números brasileiros antigos podem estar cadastrados no CRM sem o nono dígito; um
  casamento ingênuo perderia o vínculo com o cliente.
- Trade-offs: nenhum relevante — é normalização pura, sem ambiguidade de negócio.

## Alternatives Considered

### Alternative 1: Processar a mensagem inline no handler do webhook
- Description: resolver tudo (incluindo a futura IA) dentro do próprio `POST`.
- Why not chosen: viola ADR-0011; a Meta/BSP reentrega sob lentidão, gerando processamento e
  resposta duplicados.

### Alternative 2: Esperar o BSP ser escolhido para começar a implementação
- Description: não escrever nenhum adapter concreto até haver credencial real.
- Why not chosen: o plano de execução e a instrução explícita do Matheus (2026-09-10) pedem
  progresso agora, com configuração de credenciais como última etapa. A interface abstrata
  torna essa espera desnecessária — o adapter dry-run e o adapter de referência (Decision 1)
  cobrem o desenvolvimento e o teste até lá.

## Affected Components
| Component | Change | Reason |
|---|---|---|
| `packages/whatsapp` | Novo pacote | Abstração de provedor (D2/ADR-0004) |
| `packages/db/schema` | +2 tabelas | Conversas e mensagens |
| `packages/db/repositories` | +2 arquivos | Acesso escopado por tenant |
| `apps/web/app/api/webhooks/whatsapp` | Nova rota | Ingestão (ADR-0011) |
| `apps/web/app/conversas` | Nova tela | Leitura de histórico |
| `apps/worker/src/jobs` | +1 job | Consumidor da fila de mensagens recebidas |
| `packages/db/src/repositories/clients.ts` | `deleteClient` estendido | Anonimizar conversas na exclusão LGPD |

## Main Flows

### Flow 1: Mensagem recebida de cliente não cadastrado
1. Provedor envia `POST` assinado ao webhook.
2. Handler verifica assinatura sobre o corpo cru.
3. Handler normaliza o payload (formato de referência: Decision 1).
4. Handler resolve/cria a conversa por (barbershopId, telefone normalizado) — sem cliente
   associado, se não encontrado.
5. Handler persiste a mensagem (dedupe por `wamid`, Decision 3).
6. Handler enfileira `whatsapp.process-inbound` com `singletonKey = conversationId` (Decision 4).
7. Handler responde `200`.
8. Worker processa: atualiza `last_inbound_at` da conversa; nesta change, não há resposta
   automática (isso é `add-atendimento-ia`).

### Flow 2: Barbeiro responde pelo próprio app (coexistência)
1. Barbeiro digita resposta no WhatsApp Business App.
2. Mensagem é espelhada pelo provedor e chega ao webhook como evento de saída não originado
   pelo sistema.
3. Handler persiste a mensagem e enfileira o job.
4. Worker marca `handover = "humano"` na conversa (Decision 5).

### Flow 3: Exclusão LGPD de cliente com conversas associadas
1. Dono solicita exclusão de um cliente (rota existente de `crm-clientes`).
2. `deleteClient` (estendido nesta change) desvincula `client_id` das conversas associadas e
   anonimiza o telefone da conversa, preservando o conteúdo das mensagens.

## Error Flows

### Error Flow 1: Assinatura inválida
1. Handler calcula o HMAC do corpo cru e compara com `X-Hub-Signature-256` (tempo constante).
2. Se não bater: responde `401`, não persiste, não enfileira, não loga o corpo.

### Error Flow 2: Envio fora da janela de 24h
1. Chamador pede `enviarTexto` (usado só internamente/por teste nesta change — envio real de
   confirmação/reativação é change 3/4).
2. `WhatsAppProvider` verifica `last_inbound_at` da conversa antes de qualquer chamada de rede.
3. Se fora da janela: retorna erro de domínio sem tocar o adapter concreto.

### Error Flow 3: Mensagem duplicada por reentrega
1. Handler tenta inserir a mensagem com `wamid` já existente.
2. Repositório captura a violação de unicidade e retorna "já processada" — nenhum novo job é
   enfileirado.

### Error Flow 4: `phone_number_id` não reconhecido *(Decision 7)*
1. Handler normaliza o payload e tenta resolver a barbearia via
   `findBarbershopByWhatsappPhoneNumberId`.
2. Se nenhuma barbearia tiver esse `phone_number_id` configurado: handler loga (sem conteúdo
   de mensagem) e responde `200` mesmo assim — a Meta/BSP não deve reentregar por isso, já que
   não é uma falha transitória; não há conversa nem mensagem para persistir.

## API / Contract Design

`GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
→ `200`, corpo = valor de `hub.challenge` em texto puro, se `verify_token` bater.

`POST /api/webhooks/whatsapp` (assinado)
→ `200` sempre que assinatura válida (mesmo se o evento for ignorado, ex.: tipo não tratado).
→ `401` se assinatura inválida.

`/conversas` e `/conversas/:id` são Server Components (`requireSessionPage`), buscando os
dados direto via `@blademidia/db` — mesmo padrão de `app/clientes/page.tsx` e `app/agenda/
page.tsx`. **Achado durante a implementação:** não há rota `/api/conversations/**` — nenhuma
tela cliente precisa buscar isso via `fetch`, então uma API JSON só duplicaria a mesma leitura
sem consumidor (código morto). Confirmado via `curl` real: `/conversas/:id` de outra barbearia
responde `404`, exatamente a garantia de escopo que a API teria oferecido.

## Data Model and Persistence

```
barbershops               -- tabela existente, estendida (Decision 7)
  whatsapp_phone_number_id  text null, único      -- roteamento do webhook único → tenant

whatsapp_conversations
  id                uuid pk
  barbershop_id     uuid not null → barbershops.id
  client_id         uuid null → clients.id
  phone             text not null            -- E.164, NULL só após anonimização LGPD
  wa_phone_number_id text not null           -- identificador do número/canal do provedor
  last_inbound_at   timestamptz null
  handover          enum('bot','humano') not null default 'bot'
  opted_out_at      timestamptz null
  created_at        timestamptz not null default now()
  índice único (barbershop_id, phone) parcial WHERE phone IS NOT NULL — mesmo padrão de
    clients.phone (ver clients.ts) para permitir múltiplos NULL pós-anonimização

whatsapp_messages
  id                uuid pk
  barbershop_id     uuid not null → barbershops.id
  conversation_id   uuid not null → whatsapp_conversations.id
  wamid             text not null            -- id do provedor
  direction         enum('entrada','saida') not null
  type              text not null            -- 'texto' | 'template' | outro
  body              text null                -- NULL permitido (ex.: mídia não suportada ainda)
  status            text null                -- status de entrega, quando aplicável
  created_at        timestamptz not null default now()
  índice único (wamid) — dedupe garantida pelo banco (Decision 3)
```

Toda função de repositório exige `barbershopId` explícito como primeiro argumento, igual ao
padrão de `packages/db/src/repositories/clients.ts`.

## Authentication and Authorization
- Webhook: autenticado pela assinatura do provedor, não por sessão de usuário.
- `/conversas` e `/api/conversations/**`: `requireSessionApi`/`requireSessionPage` (dono e
  funcionário podem ler — não há mutação nesta capability).

## Security and Privacy
- Corpo de mensagem e telefone completo nunca em log — log estruturado carrega `tenant_id`,
  id da mensagem/conversa e telefone mascarado (`***1234`).
- Segredos do provedor (token de API, segredo de webhook) só via variável de ambiente.
- Exclusão LGPD de cliente anonimiza conversas associadas (Flow 3).

## Observability
### Logs
- `[whatsapp] webhook recebido tenant=<id> tipo=<evento>` — sem corpo, sem telefone completo.
- `[whatsapp] mensagem processada conversation=<id> handover=<bot|humano>`.

### Metrics
- Nenhuma métrica dedicada nesta change (fora do escopo do MVP); contagem de mensagens fica
  disponível via query direta para uso futuro em `relatorios`.

## Testing Strategy
- Unit: normalização de telefone (nono dígito), verificação de assinatura (caso positivo e
  negativo), lógica de janela de 24h.
- Integration: repositórios contra Postgres real — dedupe por `wamid`, isolamento de tenant,
  anonimização na exclusão de cliente.
- Contract: `curl` real contra a rota de webhook (challenge, assinado, não assinado,
  duplicado).
- E2E/Manual: boot real do worker consumindo a fila; tela `/conversas` no navegador.

## Migration Strategy
Migração aditiva (duas tabelas novas) — sem dado existente para migrar. Reversível via
`DROP TABLE` das duas tabelas (nenhuma FK de tabela existente aponta para elas).

## Rollback Plan
Reverter a migração (tabelas novas, sem impacto em dado existente); desligar a rota de
webhook não quebra nenhuma outra capability, porque nada além desta change depende dela ainda.

## Compatibility
Não altera nenhum schema nem contrato existente, exceto a extensão aditiva de `deleteClient`
(mesma assinatura, comportamento estendido).

## Remaining Risks
| Risk | Impact | Mitigation | Owner/Decision |
|---|---|---|---|
| Formato do adapter divergir do BSP real | Retrabalho no adapter concreto | Interface isola; ajuste localizado | Matheus, ao escolher o BSP |
| Detecção de `handover` depender de sinalização específica do payload do provedor | Pode precisar ajuste ao trocar de adapter | Lógica isolada em função testável (Decision 5) | Reavaliar ao integrar o BSP real |

## Open Questions
- Formato exato de sinalização de "mensagem de saída não originada pelo sistema" no payload
  do BSP real — só confirmável após a escolha do BSP (§ 5.9/5.10 do plano).
