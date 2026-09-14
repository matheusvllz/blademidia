# Tasks: Canal WhatsApp (Meta Cloud API via BSP)

> Marque `[x]` somente com evidência colada (teste passando, saída de `curl`, boot real do
> worker). `pnpm typecheck` verde não é evidência. Branch: `feature/add-whatsapp-canal`.

## 0. Pacote `packages/whatsapp`

- [x] 0.1 Interface `WhatsAppProvider` + tipos de domínio
  - Evidência: `packages/whatsapp/src/provider.ts` (interface `WhatsAppAdapter` + classe
    `WhatsAppProvider`), `src/types.ts`. `pnpm --filter @blademidia/whatsapp typecheck` limpo.
  - Objective: `provider.ts` com a interface (enviarTexto, enviarTemplate, normalizar
    payload recebido, verificar assinatura, responder challenge) e os tipos de evento
    normalizado (mensagem recebida, status de entrega).
  - Likely files/components: `packages/whatsapp/src/provider.ts`, `src/types.ts`,
    `package.json`, `tsconfig.json` (seguir o padrão de `packages/ai`).
  - Depends on: —
  - Validation: unit
  - Completion criteria: pacote compila (`tsc --noEmit`); interface documentada.

- [x] 0.2 Adapter dry-run
  - Evidência: `packages/whatsapp/src/dry-run.ts` + `dry-run.test.ts` — 4/4 testes verdes,
    incluindo prova de que `globalThis.fetch` nunca é chamado e que corpo/telefone completo
    nunca aparecem no log (só `***5432`).
  - Objective: implementação que loga em vez de enviar — usável sem qualquer credencial.
  - Likely files/components: `packages/whatsapp/src/dry-run.ts`.
  - Depends on: 0.1
  - Validation: unit
  - Completion criteria: teste unitário confirma que nenhuma chamada de rede é feita e que o
    log não expõe conteúdo/telefone completo.

- [x] 0.3 Normalização de telefone (E.164 + nono dígito BR)
  - Evidência: `packages/whatsapp/src/phone.ts` + `phone.test.ts` — 8/8 testes verdes,
    cobrindo com/sem nono dígito, com/sem DDI, formatação com símbolos, e não-BR.
  - Objective: função pura que normaliza para E.164 e gera a forma alternativa com/sem o
    nono dígito.
  - Likely files/components: `packages/whatsapp/src/phone.ts`.
  - Depends on: —
  - Validation: unit
  - Completion criteria: teste cobre número com e sem o nono dígito, e formato inválido.

## 1. Schema, migração e repositórios

- [x] 1.1 Schema `whatsapp_conversations` e `whatsapp_messages`
  - Evidência: migração `0004_mute_joshua_kane.sql` aplicada em Postgres real (`pnpm
    db:migrate`); conferido via `psql \d` — tabelas, tipos, índices e FKs exatamente como
    desenhado.
  - Objective: tabelas conforme `design.md` § Data Model — `barbershop_id` obrigatório nas
    duas, `wamid` único em `whatsapp_messages`, índice único parcial em
    `(barbershop_id, phone)` em `whatsapp_conversations`.
  - Likely files/components: `packages/db/src/schema/whatsapp-conversations.ts`,
    `whatsapp-messages.ts`, `schema/index.ts` (exportar).
  - Depends on: —
  - Validation: integration
  - Completion criteria: `pnpm db:generate` produz migração válida; `pnpm db:migrate` aplica
    em Postgres real sem erro.

- [x] 1.2 Repositório `whatsapp-conversations.ts`
  - Evidência: `findOrCreateConversation`, `getConversation`, `listConversations`,
    `linkClientToConversation`, `updateLastInboundAt`, `markHandover`, `markOptOut` — todas
    exercitadas pelos testes de integração (`whatsapp.isolation.test.ts`,
    `whatsapp-messages.test.ts`, `process-inbound.test.ts`) contra Postgres real, e pelo
    fluxo `curl` de ponta a ponta (§ 3.2).
  - Objective: `findOrCreateConversation(barbershopId, phone, waPhoneNumberId)`,
    `getConversation(barbershopId, id)`, `listConversations(barbershopId)`,
    `markHandover(barbershopId, conversationId, handover)`,
    `markOptOut(barbershopId, conversationId)`, `updateLastInboundAt(...)`.
  - Likely files/components: `packages/db/src/repositories/whatsapp-conversations.ts`.
  - Depends on: 1.1
  - Validation: integration
  - Completion criteria: cada função testada contra Postgres real.

- [x] 1.3 Repositório `whatsapp-messages.ts`
  - Evidência: `whatsapp-messages.test.ts` — 2/2 testes verdes contra Postgres real: mesma
    `wamid` inserida duas vezes retorna `alreadyProcessed: true` na segunda vez, sem lançar
    erro e sem criar segunda linha (`23505` capturado).
  - Objective: `createMessage(barbershopId, input)` com tratamento do erro de unicidade de
    `wamid` (retorna "já processada", não lança), `listMessages(barbershopId, conversationId)`.
  - Likely files/components: `packages/db/src/repositories/whatsapp-messages.ts`.
  - Depends on: 1.1
  - Validation: integration
  - Completion criteria: teste prova que inserir o mesmo `wamid` duas vezes não cria segunda
    linha nem lança erro não tratado.

- [x] 1.4 Teste de isolamento de tenant
  - Evidência: `whatsapp.isolation.test.ts` — 4/4 testes verdes contra Postgres real: conversa
    de A não aparece nem é buscável por B; mensagem de A não vaza pela consulta de B; mesmo
    telefone em barbearias diferentes não colide; exclusão LGPD de cliente de A não afeta B.
  - Objective: provar que conversas/mensagens de uma barbearia nunca aparecem para outra.
  - Likely files/components: `packages/db/src/repositories/whatsapp.isolation.test.ts`
    (padrão de `agenda.isolation.test.ts`).
  - Depends on: 1.2, 1.3
  - Validation: integration
  - Completion criteria: teste verde contra Postgres real.

- [x] 1.5 *(achado durante a implementação, design.md Decision 7)* Coluna de roteamento em `barbershops`
  - Evidência: `barbershops.whatsapp_phone_number_id` (nullable, único), migração
    `0005_dear_katie_power.sql` aplicada em Postgres real; `findBarbershopByWhatsappPhoneNumberId`
    e `setWhatsappPhoneNumberId` em `packages/db/src/repositories/barbershops.ts`.
  - Objective: resolver `barbershop_id` a partir do `phone_number_id` recebido no webhook
    único e compartilhado — faltava no design original.
  - Likely files/components: `packages/db/src/schema/barbershops.ts`,
    `packages/db/src/repositories/barbershops.ts`.
  - Depends on: —
  - Validation: integration (coberta pelos testes de 3.2)
  - Completion criteria: coluna existe e é consultável; `design.md` e a spec atualizados
    (Decision 7, Error Flow 4).

## 2. Verificação de assinatura e adapter Cloud API

- [x] 2.1 Verificação HMAC sobre corpo cru
  - Evidência: `signature.test.ts` — 5/5 testes verdes: assinatura válida aceita, segredo
    errado recusado, corpo alterado após assinar recusado, sem header recusado, header em
    formato inesperado recusado. Confirmado de novo via `curl` real (openssl HMAC) na § 3.2.
  - Objective: função que recebe corpo cru (string/Buffer) + header + segredo e retorna
    válido/inválido, com comparação de tempo constante.
  - Likely files/components: `packages/whatsapp/src/cloud-api/signature.ts`.
  - Depends on: 0.1
  - Validation: unit
  - Completion criteria: teste com payload e assinatura conhecidos (válido) e um caso
    negativo (assinatura errada).

- [x] 2.2 Normalização de payload recebido
  - Evidência: `normalize.test.ts` — 5/5 testes verdes com payload no formato real da
    documentação da Meta: mensagem de cliente normalizada corretamente; mensagem espelhada do
    próprio número do negócio reconhecida como `negocio_via_app`; evento de status (sem
    `messages[]`) ignorado; payload não reconhecível ignorado; mensagem sem id ignorada.
  - Objective: payload da Cloud API (`entry[].changes[].value`) → evento interno
    normalizado (mensagem recebida, `phone_number_id`, remetente, corpo, id da mensagem).
  - Likely files/components: `packages/whatsapp/src/cloud-api/normalize.ts`.
  - Depends on: 0.1
  - Validation: unit
  - Completion criteria: teste com payload real de exemplo da documentação da Meta.

- [x] 2.3 Adapter concreto — envio de texto e de template
  - Evidência: `adapter.test.ts` — 5/5 testes verdes: corpo e URL montados corretamente para
    texto e template (com parâmetros posicionais), erro HTTP não-ok tratado, `respondToChallenge`
    aceita/recusa por `verify_token`. **Sem credencial real ainda** (BSP não contratado, §
    5.9/5.10 do plano) — teste de contrato com `fetch` mockado, não envio real. Fica para a
    task 9.2.
  - Objective: implementa `WhatsAppProvider` contra o formato documentado (design.md,
    Decision 1); checa a janela de 24h antes de enviar texto livre.
  - Likely files/components: `packages/whatsapp/src/cloud-api/adapter.ts`.
  - Depends on: 2.1, 2.2
  - Validation: contract
  - Completion criteria: teste de contrato do corpo montado (texto e template); SEM
    credencial real ainda — se ao final da change 5.10 do plano houver credencial, repetir
    contra o BSP real e registrar qual dos dois foi feito.

## 3. Rota de webhook

- [x] 3.1 `GET /api/webhooks/whatsapp` (challenge)
  - Evidência: `curl` real — `verify_token` correto: `200`, corpo `meu-desafio-123` (igual ao
    `hub.challenge` enviado), `content-type: text/plain`. `verify_token` errado: `403`.
    **Achado durante a implementação (design.md Decision 8)**: o `middleware.ts` de sessão
    bloqueava a rota antes mesmo da verificação de assinatura rodar (`401 não autenticado`) —
    corrigido adicionando `/api/webhooks/whatsapp` a `PUBLIC_PATHS`.
  - Objective: responde o desafio em texto puro quando `verify_token` bate.
  - Likely files/components: `apps/web/app/api/webhooks/whatsapp/route.ts`,
    `apps/web/middleware.ts`.
  - Depends on: 0.1
  - Validation: contract
  - Completion criteria: `curl` real confirma `200` com o corpo igual ao `hub.challenge`
    enviado.

- [x] 3.2 `POST /api/webhooks/whatsapp` (ingestão — ADR-0011)
  - Evidência: `curl` real com payload assinado via HMAC (openssl) contra barbearia de teste
    real em Postgres: (1) assinado → `200`, conversa e mensagem persistidas (conferido via
    `psql` direto: telefone normalizado `+5511998887777`, corpo e `wamid` corretos); (2) não
    assinado → `401`, contagem de mensagens inalterada; (3) mesmo `wamid` reenviado, assinado
    → `200`, mas SEM segunda linha (dedupe real); (4) `phone_number_id` não cadastrado em
    nenhuma barbearia → `200`, nada persistido, log sem conteúdo (Error Flow 4). **Achado
    durante a implementação (design.md Decision 7)**: faltava o roteamento webhook único →
    barbearia — resolvido com `barbershops.whatsapp_phone_number_id` (task 1.5).
  - Objective: lê corpo cru → verifica assinatura → normaliza → resolve/cria conversa →
    persiste mensagem (dedupe) → enfileira job com `singletonKey = conversationId` →
    responde `200`. Nunca processa a mensagem inline.
  - Likely files/components: `apps/web/app/api/webhooks/whatsapp/route.ts`.
  - Depends on: 1.2, 1.3, 2.1, 2.2
  - Validation: contract
  - Completion criteria: `curl` real — assinado persiste e responde 200; não assinado
    responde 401; duplicado não cria segunda linha (conferido por query direta).

## 4. Worker

- [x] 4.1 Job `whatsapp.process-inbound`
  - Evidência: boot real do worker (`pnpm worker`) — log `[worker] up — pg-boss iniciado,
    jobs registrados`; `whatsapp.process-inbound` confirmado em `pgboss.queue` via `psql`
    direto. `singletonKey = conversationId` no `enqueue` de `apps/web/lib/queue.ts` — usa a
    primitiva nativa do pg-boss (não lock manual). `process-inbound.test.ts` — 15/15 testes
    verdes contra Postgres real.
  - Objective: consome a fila, atualiza `last_inbound_at`, detecta e marca `handover`
    (design.md, Decision 5) quando a mensagem de saída não se origina do próprio sistema.
  - Likely files/components: `apps/worker/src/jobs/process-inbound.ts`,
    `apps/worker/src/jobs/index.ts` (registrar).
  - Depends on: 3.2
  - Validation: integration
  - Completion criteria: boot real do worker (`pnpm worker`); fila visível em
    `pgboss.queue`; teste prova que duas mensagens em sequência rápida da mesma conversa não
    geram dois processamentos paralelos (singleton).

- [x] 4.2 Detecção de resposta humana via app + `handover`
  - Evidência: teste de integração real (`process-inbound.test.ts`) E fluxo `curl` ponta a
    ponta: mensagem simulando o barbeiro respondendo pelo app (remetente = número do negócio)
    → normalizada como `negocio_via_app` → worker marca `handover = "humano"` → confirmado via
    `psql` direto e via a tela `/conversas` (badge "com o barbeiro" renderizado de verdade).
    Sem credencial real de BSP ainda — o teste com aparelho físico fica para a task 9.2.
  - Objective: mensagem espelhada do WhatsApp Business App (não originada pelo sistema) marca
    `handover = "humano"`.
  - Likely files/components: `apps/worker/src/jobs/process-inbound.ts`.
  - Depends on: 4.1
  - Validation: integration | manual
  - Completion criteria: teste de integração cobre o cenário; se houver credencial real ao
    final, confirmar respondendo pelo app de um número de teste e observando o `handover`
    mudar — registrar qual dos dois foi feito.

## 5. Opt-out e janela de 24h

- [x] 5.1 Opt-out por mensagem do cliente
  - Evidência: `isOptOutMessage` (`process-inbound.ts`) + `process-inbound.test.ts` — testes
    parametrizados cobrindo "PARE"/"pare"/"Sair"/"  sair  "/"pare!"/"SAIR." como opt-out e
    frases com a palavra embutida ("pare de me ligar") como NÃO-opt-out; teste de integração
    real prova que `opted_out_at` é marcado, e que a MESMA frase vinda de `negocio_via_app`
    NÃO marca opt-out (só vale para o cliente). `WhatsAppProvider.sendText/sendTemplate`
    recusam com `opt_out` sem chamar o adapter (`provider.test.ts`).
  - Objective: mensagens `PARE`/`SAIR` (case-insensitive) marcam `opted_out_at`; provider
    recusa envio a conversa com opt-out.
  - Likely files/components: `apps/worker/src/jobs/process-inbound.ts`,
    `packages/whatsapp/src/provider.ts`.
  - Depends on: 4.1, 2.3
  - Validation: integration
  - Completion criteria: teste prova que, após opt-out, uma tentativa de envio é recusada
    sem chamada de rede.

- [x] 5.2 Recusa de texto livre fora da janela de 24h
  - Evidência: `provider.test.ts` — recusa fora da janela e por opt-out SEM chamar
    `adapter.sendText`/`sendTemplate` (`expect(adapter.sendText).not.toHaveBeenCalled()`);
    envio dentro da janela chama o adapter normalmente; template sai mesmo fora da janela
    (só opt-out bloqueia template). 8/8 testes verdes.
  - Objective: `WhatsAppProvider.enviarTexto` verifica `last_inbound_at` antes de delegar ao
    adapter concreto.
  - Likely files/components: `packages/whatsapp/src/provider.ts`.
  - Depends on: 2.3
  - Validation: unit
  - Completion criteria: teste prova recusa fora da janela e envio dentro dela, sem tocar o
    adapter no caso de recusa.

## 6. Tela `/conversas` (leitura)

- [x] 6.1 *(simplificado durante a implementação — ver design.md § API/Contract Design)* Telas `/conversas` e `/conversas/[id]`
  - Evidência: Server Components buscando direto via `@blademidia/db` (mesmo padrão de
    `app/clientes/page.tsx`) — sem rota `/api/conversations/**`, que seria código morto sem
    consumidor. `curl` real autenticado confirma: lista renderiza dados reais (nome do
    cliente/"Cliente não cadastrado", badge "com o barbeiro" quando `handover=humano`);
    detalhe renderiza as mensagens reais na ordem certa; acesso a conversa de outra barbearia
    responde `404` (isolamento de tenant, mesma garantia que a API teria oferecido).
  - Objective: lista + histórico, leitura apenas — deixar explícito na UI que não é caixa de
    entrada (sem campo de resposta).
  - Likely files/components: `apps/web/app/conversas/page.tsx`,
    `apps/web/app/conversas/[id]/page.tsx`, `apps/web/components/nav-bar.tsx` (link).
  - Depends on: 1.2, 1.3
  - Validation: contract (curl autenticado)
  - Completion criteria: telas legíveis no celular (Tailwind responsivo, mesmo padrão do
    design system Ink/Gold), vocabulário do barbeiro ("conversas" não é jargão banido pelo
    guia de copy § 8).

## 7. LGPD — anonimização de conversas na exclusão de cliente

- [x] 7.1 Estender `deleteClient`
  - Evidência: `deleteClient` (`clients.ts`) envolvido em `db.transaction` — anonimiza cliente
    E conversas associadas atomicamente (mesmo padrão de `completeAppointmentWithVisit`).
    Teste real em `whatsapp.isolation.test.ts`: cliente com conversa + mensagem → exclusão →
    conversa fica com `client_id: null` e `phone: null`, mensagem PRESERVADA (`body` intacto),
    e barbearia B não afetada.
  - Objective: ao excluir cliente, desvincular `client_id` e anonimizar `phone` nas
    conversas associadas, preservando as mensagens.
  - Likely files/components: `packages/db/src/repositories/clients.ts` (ou um repositório de
    orquestração que chame `clients.ts` + `whatsapp-conversations.ts` na mesma transação).
  - Depends on: 1.2
  - Validation: integration
  - Completion criteria: teste prova que, após excluir um cliente com conversas, as
    conversas ficam sem `client_id` e sem telefone, mas as mensagens continuam existindo.

- [x] 7.2 Delta aplicado à spec permanente de `crm-clientes`
  - Evidência: `openspec/specs/crm-clientes/spec.md` — requisito "Exclusão de cliente (LGPD)"
    estendido com o novo cenário "Exclusão anonimiza conversas de WhatsApp associadas";
    bloco de histórico atualizado.
  - Objective: ao fechar a change, aplicar o delta já escrito em
    `specs/crm-clientes/spec.md` (MODIFIED Requirement) à spec permanente.
  - Likely files/components: `openspec/specs/crm-clientes/spec.md`.
  - Depends on: 7.1
  - Validation: manual
  - Completion criteria: spec permanente atualizada, change arquivada referenciando o delta.

## 8. Runbook e fechamento

- [x] 8.1 Runbook de onboarding (Embedded Signup + coexistência)
  - Evidência: `docs/operations/onboarding-produto.md` ganhou a seção "Passo a passo — canal
    WhatsApp (Fase 5, add-whatsapp-canal)", genérica por BSP (nota explícita de onde plugar
    as telas específicas quando contratado), cobrindo versão mínima do app, consentimento de
    histórico, teste antes do número real, e as limitações confirmadas da coexistência (grupo
    não sincroniza, throughput combinado 20 mps). Não mexi na landing (`site/`) — checagem de
    divergência de promessa fica para o Matheus decidir, não é ajuste automático desta task.
  - Objective: reescrever `docs/operations/onboarding-produto.md` cobrindo o fluxo real de
    coexistência (consentimento de sincronização de histórico de 180 dias, versão mínima do
    app) — genérico o bastante para não depender do BSP específico ainda não escolhido, com
    nota clara de onde plugar as instruções específicas do BSP quando contratado.
  - Likely files/components: `docs/operations/onboarding-produto.md`.
  - Depends on: —
  - Validation: manual
  - Completion criteria: documento revisado, sem prometer nada que o caminho Meta não
    entrega (checar contra `site/` — se a landing prometer algo divergente, reportar ao
    Matheus, não corrigir a copy sozinho).

- [x] 8.2 `.env.example` atualizado
  - Evidência: seção "Fase 5 (whatsapp-canal...)" em `.env.example` com as 4 variáveis
    (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`,
    `WHATSAPP_API_BASE_URL`), comentário explicando o fallback para dry-run e o aviso
    explícito de não chutar a versão da API.
  - Objective: variáveis novas do provedor, com nomes genéricos (a confirmar/renomear quando
    o BSP for escolhido) e comentário claro de que ainda não há credencial real.
  - Likely files/components: `.env.example`.
  - Depends on: 2.3
  - Validation: manual
  - Completion criteria: toda variável nova documentada com comentário do que é e de onde
    viria (BSP).

- [x] 8.3 Fechamento formal da change
  - Evidência: `openspec/specs/whatsapp-canal/spec.md` criada; delta aplicado em
    `openspec/specs/crm-clientes/spec.md`; `openspec/specs/README.md` atualizado (capability
    promovida de candidata a especificada); `CHANGELOG.md` com entrada completa
    `[add-whatsapp-canal]`; change arquivada em
    `openspec/changes/archive/add-whatsapp-canal/`. `pnpm -r typecheck` e `pnpm -r test`
    limpos em todo o monorepo (189 testes) antes do fechamento.
  - Objective: specs permanentes atualizadas (`whatsapp-canal` nova, `crm-clientes` com
    delta), `CHANGELOG.md` atualizado, change arquivada em
    `openspec/changes/archive/add-whatsapp-canal/`.
  - Likely files/components: `openspec/specs/whatsapp-canal/spec.md` (novo),
    `openspec/specs/crm-clientes/spec.md`, `CHANGELOG.md`.
  - Depends on: todas as anteriores
  - Validation: manual
  - Completion criteria: checklist do avaliador (`docs/sdd/04-checklist-avaliador.md`)
    aprovado; PR aberto.

## 9. Configuração de chaves e assinaturas (última etapa — depende de decisão comercial do Matheus)

> Grupo deliberadamente por último, conforme instrução do Matheus em 2026-09-10. **Não
> bloqueia o fechamento técnico dos grupos 0-8** (que funcionam em modo dry-run/contrato) —
> bloqueia apenas o primeiro envio real em produção.

- [ ] 9.1 BSP contratado e credenciais emitidas
  - Objective: registrar, quando existir, o BSP escolhido e as credenciais necessárias
    (nome final das variáveis de ambiente).
  - Likely files/components: `.env` (nunca commitado), `.env.example` (nomes finais).
  - Depends on: decisão comercial do Matheus (§ 5.9/5.10 do plano — fora desta change)
  - Validation: manual
  - Completion criteria: `.env` local preenchido; adapter troca de dry-run para real sem
    mudança de código (só configuração).

- [ ] 9.2 Confirmar formato do adapter contra a documentação real do BSP
  - Objective: validar/ajustar `cloud-api/adapter.ts`, `cloud-api/signature.ts`,
    `cloud-api/normalize.ts` contra a documentação do BSP efetivamente contratado (design.md,
    Decision 1 e Remaining Risks).
  - Likely files/components: `packages/whatsapp/src/cloud-api/*`.
  - Depends on: 9.1
  - Validation: contract
  - Completion criteria: envio real de teste para um número de teste, mensagem chegando no
    aparelho.

- [ ] 9.3 Ativar coexistência no número real da barbearia
  - Objective: conduzir o Embedded Signup do BSP com o número real, com consentimento de
    sincronização de histórico.
  - Likely files/components: — (operacional, fora do código)
  - Depends on: 9.1
  - Validation: manual
  - Completion criteria: número aparece ativo no BSP; mensagem de teste recebida no webhook
    de produção; resposta do barbeiro pelo app aparece espelhada.
