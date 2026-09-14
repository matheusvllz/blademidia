# Exploração Crítica: Canal WhatsApp (Meta Cloud API via BSP)

> Etapas 1-3 do fluxo (Ideia → Refinamento → Discussão).
> As perguntas bloqueantes desta change foram levantadas e respondidas em 2026-09-07,
> registradas em `docs/sdd/06-plano-execucao-fase-5.md` — este documento traz essas respostas
> para o formato padrão da change em vez de reabri-las.

## Ideia original

Dar ao produto um canal real de mensagem no WhatsApp da barbearia, para que o atendimento
automático (Fase 5) tenha por onde falar com o cliente final. Primeira das 4 changes da
Fase 5: `whatsapp-canal` → `atendimento-ia` → `confirmacao-agendamento` → `reativacao-clientes`.

## Entendimento atual

O produto hoje (Fases 1-4) é operável só pelo painel. Nenhuma mensagem de WhatsApp entra ou
sai dele. `packages/ai` e `packages/core/agenda/tools.ts` já preparam o contrato de tools do
bot (Fase 2), mas não há canal para carregar essa conversa. `automation/` (operação da
agência) já tem um motor de atendimento via Evolution API — não-oficial — mas essa change não
o usa: o produto nasce com o provedor oficial (D2/ADR-0004).

## Problema real

Comprovado pelas 3 changes de produto já entregues e pela dor central documentada: sem canal
de mensagem, o produto não ataca a tese central da Blade ("seu zap fica sem ninguém e você
perde cliente sem saber"). É pré-requisito estrutural — nenhuma das outras 3 changes da Fase 5
existe sem esta.

## Coerência estratégica (portão — preencher antes de seguir)

> Fonte: [Guia da Dor](../../docs/business/dor-central.md) ·
> [Guia da Persona](../../docs/business/persona-icp.md) ·
> [Guia de COPY](../../docs/business/guia-de-copy.md)

- **Relação com a dor central:** ataca a tese diretamente — é o canal que sustenta a promessa
  central da Blade. Sem ele, não existe "atendente no zap".
- **Persona atendida:** o ICP (barbearia 2-4 cadeiras). Nenhuma mudança de escopo de público.
- **Impacto em comunicação/copy:** esta change em si não gera texto visível ao cliente final
  (isso é a change `atendimento-ia`) — mas o webhook grava mensagens que a change 2 vai usar
  para gerar respostas seguindo a § 13.9 do guia. O runbook de onboarding (`docs/operations/
  onboarding-produto.md`) é texto interno/operacional, não precisa do checklist § 14 (não é
  peça de mercado), mas segue o vocabulário do barbeiro nas telas (`/conversas`).
- **Conflitos identificados com os guias:** nenhum.

## Objetivos

- Interface `WhatsAppProvider` (`packages/whatsapp`), desacoplada de provedor concreto.
- Webhook que recebe mensagens, verifica assinatura, persiste e enfileira (ADR-0011) — nunca
  processa inline.
- Persistência de conversas e mensagens, escopada por tenant, com deduplicação por `wamid`.
- Envio de texto livre (dentro da janela de 24h) e de template (fora dela).
- `handover`: saber quando o barbeiro assumiu a conversa (pelo app, via coexistência) para o
  bot silenciar.
- Anonimização das mensagens na exclusão LGPD de cliente (delta em `crm-clientes`).
- Tela `/conversas` de leitura (histórico), não caixa de entrada completa.

## Fora de escopo inicial

- Qualquer chamada à Claude API / loop de conversa (`atendimento-ia`, change 2).
- Envio automático agendado (confirmação, reativação — changes 3 e 4).
- UI de resposta pelo painel (o barbeiro responde pelo próprio app, via coexistência —
  ver Riscos/Premissas).
- Escolha e contratação do BSP concreto (decisão comercial do Matheus, § 5.9/5.10 do plano).

## Atores e stakeholders

- Cliente final da barbearia (quem manda/recebe mensagem).
- Barbeiro-dono / funcionário (responde pelo próprio WhatsApp Business App).
- Operador Blade (Matheus) — provisiona o BSP, aprova templates nas changes seguintes.
- Sistema externo: BSP escolhido (mensalidade fixa, § 5.9), que fala com a Meta Cloud API.

## Capabilities afetadas ou candidatas

- `whatsapp-canal` (nova — nasce aqui).
- `crm-clientes` (delta — LGPD passa a cobrir mensagens de WhatsApp).

## Casos de uso principais

- Cliente manda mensagem pela primeira vez → sistema cria conversa (mesmo sem cliente
  cadastrado no CRM), persiste a mensagem, enfileira job.
- Cliente já conhecido manda mensagem → sistema casa por telefone (`findClientByPhone`,
  tratando o nono dígito) e associa `clientId`.
- Barbeiro responde pelo próprio WhatsApp Business App → mensagem chega espelhada pelo
  webhook (coexistência) → sistema marca `handover = humano`.
- Sistema envia mensagem de texto livre dentro da janela de 24h (usado pela change 2).
- Sistema tenta enviar texto livre fora da janela → recusado no `WhatsAppProvider`, não sai.
- Cliente manda `PARE`/`SAIR` → `opted_out_at` marcado, envios futuros interrompidos.
- Dono exclui cliente (LGPD) → mensagens permanecem, mas telefone/vínculo são anonimizados.
- Mesma mensagem chega duas vezes (reentrega da Meta/BSP) → segunda é descartada por `wamid`
  duplicado, sem novo processamento.

## Edge cases e falhas relevantes

- Duas mensagens do mesmo cliente em sequência rápida → não pode gerar dois processamentos
  paralelos (ADR-0011) — precisa de teste dedicado.
- Webhook assinado incorretamente → 401, nunca processa.
- Remetente sem cliente cadastrado no CRM → conversa criada com `client_id = NULL`, mensagem
  registrada normalmente.
- Telefone brasileiro com/sem o nono dígito → precisa casar com o cliente correto.
- Corpo de webhook lido como JSON antes da verificação de assinatura → quebra o HMAC (ver
  design.md, Decision de verificação).

## Regras de negócio

### Confirmadas
- Um número de WhatsApp por barbearia (§ 6 do plano, tabela "Respostas já registradas").
- `client_id` nullable — mensagem não bloqueia por falta de cadastro.
- Exclusão LGPD anonimiza (não apaga) as mensagens — mesmo padrão de `clients.phone`.
- Nenhum texto livre fora da janela de 24h — regra da Meta, aplicada no `WhatsAppProvider`.
- `wamid` único — deduplicação garantida pelo banco.

### Inferidas (validar)
- O adapter concreto segue o formato documentado da Meta Cloud API (§ 4.4 do plano) como
  referência de contrato, já que o BSP específico (§ 5.9) ainda não foi escolhido e muitos
  BSPs espelham esse formato. **Precisa reconfirmação contra a documentação do BSP real antes
  de qualquer envio de produção** — tratado como Risco abaixo, não como fato.

### Em aberto
- Qual BSP específico será contratado (§ 5.9/5.10 do plano) — não bloqueia esta spec, bloqueia
  a configuração final de credenciais e a validação de formato do adapter em produção.

## Restrições técnicas conhecidas

- ADR-0007: toda query escopada por `barbershop_id`.
- ADR-0011: ingestão assíncrona — webhook nunca processa inline.
- ADR-0008: nenhuma escrita de agenda fora do `AgendaService` (não é tocado nesta change, mas
  vale para quando a change 2 conectar as tools).
- D4: sem custo de mensageria adicional nesta change (webhook/persistência/envio de texto
  dentro da janela são gratuitos — § 3.5 do plano); mensalidade do BSP é custo novo, ainda não
  cotado, fora do escopo desta change (decisão comercial do Matheus).

## Requisitos não funcionais relevantes

- **LGPD**: mensagens de WhatsApp são dado pessoal de terceiro. Anonimização na exclusão de
  cliente, nunca log de conteúdo/telefone completo (regra herdada do repositório).
- **Risco de ban do WhatsApp**: mitigado pela escolha do provedor oficial (D2) — não pela
  arquitetura desta change especificamente, mas vale registrar que o número da barbearia é o
  ativo mais valioso do barbeiro.

## Riscos

| Risco | Tipo | Impacto | Probabilidade | Mitigação | Decisão necessária |
|---|---|---:|---:|---|---|
| Formato do adapter (Meta Cloud API "pura") divergir do BSP real escolhido | Técnico | Médio | Média | Interface `WhatsAppProvider` isola o domínio do formato de wire; ajustar só o adapter quando o BSP for escolhido | Matheus escolhe o BSP (§ 5.9/5.10) |
| Duas respostas simultâneas (bot + barbeiro pelo app) | Produto | Alto (cliente confuso) | Média | `handover` + lock por conversa no enfileiramento (ADR-0011) | — |
| Processamento duplicado de mensagem por reentrega | Técnico | Médio | Média | `wamid` único no banco | — |
| Vazamento de conteúdo de mensagem em log | LGPD | Alto | Baixa (se seguir a regra) | Log estruturado nunca inclui `body`; telefone sempre mascarado | — |

## Premissas

- O BSP escolhido eventualmente vai expor endpoint de envio e webhook de recebimento
  compatíveis (ou próximos) do formato Meta Cloud API documentado — premissa a validar contra
  a documentação real do BSP antes de ligar credenciais de produção (ver Riscos).
- A tela `/conversas` desta change é suficiente como MVP de leitura — não é a caixa de entrada
  completa, que fica para uma change futura se fizer sentido de produto.

## Perguntas críticas

### Bloqueantes
Nenhuma sem resposta — todas respondidas em 2026-09-07 (ver `docs/sdd/06-plano-execucao-fase-5.md`
§ 2 e § 6, tabela "Respostas já registradas").

### Importantes, não bloqueantes
1. Qual BSP específico será contratado — não bloqueia a spec (a interface abstrai o provedor),
   mas bloqueia a validação final do adapter contra credenciais reais.

## Decisões da discussão

| Pergunta | Decisão | Quem | Data |
|---|---|---|---|
| Provedor WhatsApp (D2) | Meta Cloud API, via coexistência | Matheus | 2026-09-07 |
| Número por barbearia ou compartilhado | Um por barbearia, o que a barbearia já usa | Matheus | 2026-09-07 |
| Barbeiro responde pelo painel? | Não — responde pelo próprio app (coexistência); painel é leitura | Matheus | 2026-09-07 |
| Exclusão LGPD apaga mensagens? | Não — anonimiza (telefone → NULL, vínculo cai) | Matheus | 2026-09-07 |
| Tech Provider direto ou BSP? | BSP com mensalidade fixa | Matheus | 2026-09-07 |
| Prosseguir para implementação desta change | Sim — "faça a próxima etapa do projeto" | Matheus | 2026-09-10 |
