# Exploração Crítica: Atendimento por IA (loop de conversa no WhatsApp)

> Etapas 1-3 do fluxo (Ideia → Refinamento → Discussão).
> Não gere `proposal.md` enquanto existirem perguntas bloqueantes sem resposta.

## Ideia original
Conectar a Claude API ao canal WhatsApp já existente (`whatsapp-canal`, Fase 5/Change 1):
quando um cliente final escreve para a barbearia, um bot de IA responde — tira dúvida, informa
preço e horário de funcionamento, e usa as tools da agenda (`packages/core/agenda/tools.ts`)
para consultar disponibilidade, criar, remarcar e cancelar agendamento.

## Entendimento atual
Esta é a Change 2 de 4 da Fase 5, e a maior parte das decisões de arquitetura já foi tomada
por Matheus e registrada em
[`docs/sdd/06-plano-execucao-fase-5.md`](../../../docs/sdd/06-plano-execucao-fase-5.md) §§ 4.1–4.3
e § 7, em 2026-09-07. Este documento **não reabre** essas decisões — ele as organiza no formato
do fluxo SDD, confirma que não sobrou pergunta bloqueante nova, e regista o único ponto que
impede a **verificação final** (não a implementação) desta change: não existe ainda
`ANTHROPIC_API_KEY` real configurada neste ambiente.

A fundação que esta change consome já existe e está implementada:
- `packages/whatsapp` + `apps/web/api/webhooks/whatsapp` + `apps/worker/jobs/process-inbound.ts`
  — canal completo, arquivado em `add-whatsapp-canal` (2026-09-10). O job de ingestão hoje só
  atualiza `last_inbound_at`, detecta opt-out e detecta resposta do barbeiro pelo app
  (`handover`) — **não chama IA nenhuma**. É aqui que esta change se conecta.
- `packages/core/src/agenda/tools.ts` — as 4 tools da agenda (Zod, `handler(barbershopId, input)`,
  sempre `source: "bot"`). Único caminho de escrita da agenda pelo bot (ADR-0008).
- `packages/ai/src/client.ts` (`resolveAiConfig`) e `packages/ai/src/tools/index.ts`
  (`getClaudeToolDefinitions`/`executeTool`) — esqueletos da Fase 2, nunca executados em
  runtime. O próprio `tools/index.ts` documenta que mantém JSON Schema à mão como espelho do
  Zod "para reavaliar na Fase 5" — é isto que o plano (§ 4.3) manda reavaliar agora, trocando
  para `betaZodTool`.
- `packages/db/src/repositories/whatsapp-conversations.ts` /
  `whatsapp-messages.ts` — persistência de conversas/mensagens, incluído `handover`.

## Problema real
Sem esta change, o canal WhatsApp entregue na Change 1 só registra e exibe mensagens — não
responde nada. A tese central do produto ("o zap continua atendendo quando o dono não pode")
só passa a existir de fato com este loop ligado.

## Coerência estratégica (portão)

> Fonte: [Guia da Dor](../../../docs/business/dor-central.md) ·
> [Guia da Persona](../../../docs/business/persona-icp.md) ·
> [Guia de COPY](../../../docs/business/guia-de-copy.md)

- **Relação com a dor central:** ataca a tese central diretamente — é o "zap atendendo sem o
  operador" em pessoa. Não é benefício de segunda ordem, é a prova principal.
- **Persona atendida:** ICP (2-4 cadeiras, dono cortando, atende pelo próprio zap hoje). Sem
  ajuste.
- **Impacto em comunicação/copy:** sim, direto — todo texto que o bot manda ao cliente final é
  copy em produção, em tempo real, sem revisão humana antes de sair. § 13.9 do guia é
  **normativa** aqui (voz "barbearia → cliente", não "Blade → barbeiro"). O `design.md` desta
  change grava o system prompt como o artefato de copy que ele é, versionado e revisável.
- **Conflitos identificados com os guias:** nenhum. O guia já antecipa este uso em § 13.9.

## Objetivos
- Loop de conversa de um turno por mensagem recebida, rodando no worker (nunca no webhook,
  ADR-0011), usando `claude-haiku-4-5` com tool use sobre as 4 tools da agenda.
- Responder dúvida (preço do cardápio configurado, horário de funcionamento) sem tool.
- Nunca inventar horário: todo horário ofertado vem de `consultar_disponibilidade`.
- Escalar para humano por gatilho (pedido explícito, frustração, N falhas de entendimento,
  assunto fora de escopo) — grava `handover = humano` e para de responder.
- Degradar sem IA: se a Anthropic estiver fora do ar, a conversa vira humana com aviso, não
  trava nem perde a mensagem.
- Registrar toda a conversa (mensagens do modelo, não só do cliente) e o custo (`usage`) por
  tenant, desde o primeiro dia.
- Corrigir o ADR-0005 nos dois pontos que o plano (§ 4.1/4.2) já apurou como equivocados:
  `thinking` não se aplica ao Haiku 4.5 nesta tarefa; prompt caching não liga com um system
  prompt deste tamanho.

## Fora de escopo inicial
- Envio iniciado pela barbearia fora da janela de 24h (confirmação, reativação) — Changes 3 e 4.
- Qualquer UI de responder pelo painel — o barbeiro continua respondendo pelo app dele
  (`whatsapp-canal`, coexistência).
- Cadastro de cliente novo via conversa — a tool `criar_agendamento` exige `clientId` já
  existente; se o telefone não tem cliente associado, o gatilho de "fora de escopo" (ou um
  fluxo simples de pedir nome, a decidir no design) resolve — ver Pontos em aberto.
- Multilíngue — só PT-BR.

## Atores e stakeholders
- Cliente final da barbearia (quem conversa com o bot).
- Barbeiro-dono / funcionário (quem recebe a devolução quando o bot escala).
- Operador Blade (Matheus) — dono do custo por tenant e do portão de qualidade.

## Capabilities afetadas ou candidatas
- `atendimento-ia` (nova — já candidata em `openspec/specs/README.md`).
- Nenhum delta em `whatsapp-canal`: a spec permanente já declara que IA é capability separada
  que consome o canal (ver cabeçalho de `openspec/specs/whatsapp-canal/spec.md`), e o contrato
  do job de ingestão não muda de forma observável — só passa a, adicionalmente, disparar o loop
  quando `handover = bot` e a conversa não está em opt-out.

## Casos de uso principais
1. Cliente pergunta preço de um serviço do cardápio → bot responde com o valor configurado.
2. Cliente pede para agendar → bot consulta disponibilidade, oferece horários reais, confirma.
3. Cliente pede para remarcar/cancelar um agendamento existente → bot usa a tool
   correspondente.
4. Cliente pergunta horário de funcionamento → bot responde com dado configurado da barbearia.
5. Cliente manda mensagem ambígua → bot pede esclarecimento; se insistir sem entender (N
   falhas), escala.
6. Cliente demonstra frustração ou pede humano explicitamente → escala na hora.
7. Cliente pergunta algo fora do escopo da barbearia → bot recusa educadamente e, se insistir,
   escala.
8. Cliente tenta agendar horário ocupado ou no passado → bot recusa via retorno da tool
   (`AgendaService` já valida), nunca inventa alternativa não verificada.
9. Anthropic indisponível (erro de rede/rate limit/5xx) → conversa marcada humana, barbeiro
   notificado (mecanismo exato: ver Pontos em aberto / design), mensagem do cliente não se perde.

## Edge cases e falhas relevantes
- Duas mensagens do mesmo cliente em sequência rápida → já resolvido na Change 1
  (`singletonKey` do pg-boss por conversa); esta change só precisa não quebrar essa garantia.
- Cliente sem cadastro no CRM (`clientId` nulo na conversa) tenta agendar → tool
  `criar_agendamento` exige `clientId`. Tratamento: ver Pontos em aberto.
- Loop de tool-use sem terminar (o modelo insiste em chamar tools) → precisa de limite de
  iterações explícito.
- Injeção de instrução pelo cliente final ("ignore as regras anteriores e...") → a defesa
  estrutural é que nada acontece sem passar pelas tools (que validam tenant/conflito/passado no
  `AgendaService`); mesmo assim o system prompt precisa de instrução de escopo e a spec precisa
  de cenário de teste para isso.
- Handover para humano no meio de uma tool call em andamento → não deve haver concorrência:
  o worker processa uma mensagem por vez por conversa (já garantido pela Change 1).
- Conversa já em `handover = humano` recebe nova mensagem do cliente → bot NÃO deve responder
  (silêncio do bot é o comportamento correto; quem responde é o humano pelo app).

## Regras de negócio

### Confirmadas (Matheus, 2026-09-07, via o plano de execução)
- Modelo `claude-haiku-4-5`, sem `thinking`, `max_tokens: 1024` (§ 4.1).
- Tool runner com Zod (`betaZodTool` / `client.beta.messages.toolRunner`), substituindo o JSON
  Schema mantido à mão em `packages/ai/src/tools/index.ts` (§ 4.3).
- Prompt caching não liga no Haiku 4.5 com este tamanho de prompt; não inflar artificialmente
  para atingir o mínimo; escrever como se fosse ligar um dia (system prompt congelado, nada
  volátil nele) (§ 4.2).
- Tools são o único caminho de ação — nenhum efeito colateral em texto livre (ADR-0005/0008).
- Escalação por gatilho: pedido direto, frustração detectada, N falhas de entendimento, assunto
  fora de escopo (§ 7, decisão 4).
- Registro completo de conversa e custo (`usage`) por tenant desde a v1 (§ 7, decisão 5;
  ADR-0005).
- Voz do atendimento automático é a da barbearia, nunca a da Blade (§ 13.9 do guia de copy,
  normativa).
- Portão de qualidade: bateria de conversas reais em PT-BR contra `claude-haiku-4-5`; se
  reprovar, troca para `AI_MODEL=claude-sonnet-5` por variável de ambiente, sem mudar código,
  e a reprovação é levada ao Matheus (custo triplica) (§ 7).
- Degradação sem IA: cai para atendimento humano com aviso — já previsto no ADR-0005, "implemente,
  não deixe como intenção" (§ 7, Riscos).
- Custo desta capability é **zero do lado Meta** (mensagem dentro da janela do cliente é
  categoria *service*, gratuita) — o único custo variável é a Claude API, já orçado dentro do
  D4 (§ 3.5, § 4.2: ordem de R$40-50/mês na estimativa refeita).

### Inferidas (validar no design, não é pergunta bloqueante ao Matheus)
- **N (número de falhas de entendimento antes de escalar):** o plano cita "N falhas" sem fixar
  o número. Decisão de parâmetro de implementação, não de produto — proponho **2** (a terceira
  tentativa sem entender já escala) e registro como Decision no `design.md`, ajustável por
  configuração se necessário.
- **Limite de iterações do tool runner por turno:** não especificado no plano. Proponho
  **6** (folga generosa acima do caminho feliz mais longo: consultar disponibilidade → criar
  agendamento é 2 chamadas; 6 cobre idas e vindas de esclarecimento sem permitir loop
  descontrolado).
- **Cliente sem cadastro tenta agendar:** a tool `criar_agendamento` exige `clientId`. Menor
  mudança de escopo possível: o bot, ao identificar que não há `clientId` associado à conversa
  e o cliente quer agendar, **pede o nome** e cria o cliente via repositório de CRM já existente
  (`packages/db/repositories/clients.ts`, que já é usado por `add-crm-clientes`) antes de
  chamar `criar_agendamento` — sem tool nova dedicada, reaproveitando repositório existente
  atrás de uma tool pequena (`cadastrar_cliente_basico` ou similar). Registrar como Decision no
  design, não como pergunta ao Matheus, porque não muda regra de negócio já aprovada em
  `crm-clientes` (o cliente sempre pode ser criado com nome+telefone).
- **Mecanismo exato de "aviso ao barbeiro" na degradação sem IA:** o ADR-0005 diz "com aviso ao
  barbeiro" sem especificar o canal do aviso. Nesta fase o produto não tem push/e-mail para o
  barbeiro-dono fora do próprio WhatsApp dele. Proposta mais simples e consistente com o que já
  existe: a própria mensagem do cliente aparece no WhatsApp Business App do barbeiro
  (coexistência, já ativa) mesmo sem o bot responder — então "aviso" nesta change é
  **silêncio do bot + `handover = humano` + log estruturado do incidente**, sem canal de
  notificação novo. Se isso for insuficiente, é melhoria de UX para change futura, não bloqueio
  desta.

### Em aberto
- **Não há pergunta bloqueante de negócio pendente** para esta change — todas as decisões de
  arquitetura, modelo, custo e voz já foram tomadas por Matheus em 2026-09-07 e estão citadas
  acima com a seção do plano de origem.
- **Achado operacional (não bloqueia a implementação, bloqueia só a verificação final):** não
  existe `ANTHROPIC_API_KEY` configurada neste ambiente (`.env` não tem a variável definida).
  Isso significa que o **portão de qualidade** (bateria de conversas reais contra
  `claude-haiku-4-5`) e a correção definitiva do ADR-0005 para `Aceito` **não podem ser
  concluídos nesta sessão** — mesmo padrão já usado em `add-whatsapp-canal` para as credenciais
  do BSP (grupo 9, deliberadamente por último, por instrução explícita do Matheus: "por último
  configurar chaves, assinaturas, etc"). A implementação inteira (prompts, loop, tools,
  escalação, degradação) será construída e testada com o SDK da Anthropic **mockado por
  injeção de dependência** (mesmo padrão do `WhatsAppAdapter` — o cliente Anthropic concreto
  nunca é importado fora de `packages/ai`), com evidência real de todo o caminho exceto a
  chamada de rede de fato. O grupo de tarefas correspondente à bateria de qualidade fica
  registrado como pendente, bloqueado por essa credencial.

## Restrições técnicas conhecidas
- O loop roda no worker, nunca no webhook (ADR-0011) — o handler HTTP já responde 200 antes de
  qualquer IA rodar.
- `AgendaService` já valida tenant, conflito, passado e transição — as tools são a única porta
  de escrita (ADR-0008).
- Modelo e parâmetros exatos são os do plano § 4.1 — não improvisar formato de `thinking` (dá
  erro no Haiku 4.5) nem usar `effort`.
- `.npmrc` com `node-linker=hoisted` já resolve o Next.js; não mexer.
- Testes de `packages/ai`, `packages/db`, `packages/core` e `apps/worker` usam Vitest com
  Postgres real quando tocam banco; suíte verde sem Docker não prova nada (armadilha já
  documentada no plano § 4.6).

## Requisitos não funcionais relevantes
- **LGPD:** o histórico de conversa (incluindo o que o modelo "pensou" em texto, se exposto)
  é dado pessoal do cliente final — mesma política de anonimização já implementada em
  `whatsapp-canal` (a exclusão de cliente já anonimiza `whatsapp_conversations`/
  `whatsapp_messages`; esta change não cria tabela nova de dado pessoal, só grava mais
  mensagens nas tabelas já existentes, então o comportamento de anonimização já cobre o que
  esta change adiciona — a confirmar no design).
- **Custo por tenant monitorado:** requisito explícito do ADR-0005 desde a v1; sem isso, não
  tem como validar a conta do § 4.2 nem cobrar certo no futuro.
- **Risco de reputação do número:** uma resposta ruim do bot é visível para o cliente final da
  barbearia e para o barbeiro no próprio app — maior motivo para os cenários de teste do
  portão de qualidade (§ 7 do plano) serem levados a sério antes de qualquer uso real.

## Riscos

| Risco | Tipo | Impacto | Probabilidade | Mitigação | Decisão necessária |
|---|---|---:|---:|---|---|
| Alucinação de horário | Produto | Alto (cliente aparece em horário errado) | Baixa (mitigado por design) | Horário só sai de `consultar_disponibilidade`; cenário de teste dedicado | Nenhuma — já decidido |
| Anthropic fora do ar | Operacional | Médio | Baixa | Degradação para humano, sem perder mensagem | Nenhuma — já decidido |
| Loop infinito de tool-use | Técnico | Médio (custo, latência) | Baixa | Limite de iterações no runner (proposto: 6) | Nenhuma — parâmetro de implementação |
| Prompt injection pelo cliente final | Segurança | Médio (mitigado estruturalmente) | Média | Tools validam tudo no domínio; instrução de escopo no prompt; cenário de teste | Nenhuma — já decidido |
| Portão de qualidade não pode ser executado nesta sessão | Processo | Alto para "Done" completo da change | Certa | Implementar e testar tudo exceto a chamada real; registrar grupo de tarefas bloqueado por `ANTHROPIC_API_KEY`, igual ao padrão do BSP na Change 1 | Nenhuma — instrução explícita do Matheus ("por último configurar chaves") |
| ADR-0005 ficar "Proposto" em vez de "Aceito" até a chave existir | Processo | Baixo | Certa | Atualizar o ADR com as correções técnicas (§ 4.1/4.2) e deixar o status como "Aceito, pendente de portão de qualidade" — não inventar aprovação que não aconteceu | Nenhuma |

## Referências
- `docs/sdd/06-plano-execucao-fase-5.md` §§ 4.1–4.3, 4.5, 7 — decisões técnicas congeladas.
- `docs/architecture/decisions/ADR-0005-ia-claude-api.md` — a corrigir nesta change.
- `docs/architecture/decisions/ADR-0008` (tools como único caminho de escrita da agenda).
- `docs/business/guia-de-copy.md` §§ 13.9, 14 — voz e checklist.
- `openspec/specs/whatsapp-canal/spec.md` — contrato do canal que esta change consome.
- `openspec/changes/archive/add-whatsapp-canal/` — padrão de rigor de evidência a repetir.
