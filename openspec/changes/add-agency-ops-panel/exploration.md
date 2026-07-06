# Exploração Crítica: Painel de Operação da Agência (gestão de keys, tenants e cobrança WhatsApp)

> Etapas 1-3 do fluxo (Ideia → Refinamento → Discussão).
> Não gere `proposal.md` enquanto existirem perguntas bloqueantes sem resposta.

## Ideia original

Criar uma forma de os clientes dependerem do ecossistema Blade Mídia para o atendimento
automatizado via WhatsApp (oficial ou não-oficial). A agência arca com os custos de operação
e infraestrutura e cobra uma mensalidade de gestão. Precisa de um painel interno (da agência,
não do barbeiro) para gerenciar as keys/credenciais e os tenants, com controle de entregas.
Cliente com máxima autonomia operacional, mas dependente do ecossistema técnico da agência.

## Entendimento atual

Isto reposiciona a Blade Mídia de "fornecedora de um SaaS" para operadora de um serviço
gerenciado de mensageria (papel equivalente ao de um BSP/reseller — Take/Zenvia/Gupshup na
rota oficial, ou Z-API/W-API/UltraMsg na rota não-oficial): a agência compra/opera a conexão
WhatsApp por atacado (custo Meta ou infraestrutura de sessão) e revende no varejo (mensalidade
fixa), retendo a custódia técnica da conexão como mecanismo de retenção deliberado.

A abstração `WhatsAppProvider` (ADR-0004) já previa provedor por tenant — este painel pode ser
especificado contra essa interface, sem depender do resultado da spike D2.

## Problema real

Não é dor comprovada de um usuário — é uma decisão estratégica de modelo de negócio, com três
motivações distintas:

1. **Comercial**: nova fonte de receita recorrente (taxa de gestão) além da mensalidade Pro.
2. **Operacional**: a partir de mais de 1-2 clientes, não existe hoje visibilidade centralizada
   do estado de cada conexão WhatsApp (conectada/banida/precisa reautenticar).
3. **Estratégica**: lock-in deliberado — o cliente não deve conseguir operar a conexão WhatsApp
   fora do ecossistema Blade Mídia.

## Objetivos

- Visibilidade centralizada do estado de cada instância/conexão WhatsApp por barbearia.
- Custódia e gestão segura de credenciais/keys, concentrada na agência.
- Vínculo entre estado de cobrança (em dia/atrasado/suspenso) e estado operacional do tenant.
- Nova taxa mensal de gestão de keys/atendimento/suporte diário.
- Preservar a abstração de provedor por tenant (ADR-0004) — nada aqui pode depender de um
  adapter específico.

## Fora de escopo inicial

- Self-service de onboarding pelo cliente (v1 é operação manual assistida — decisão do sócio).
- Provisionamento automatizado ponta a ponta (v1 é manual/scripted).
- Ferramenta de helpdesk/ticketing dedicada.
- Escolha do provedor WhatsApp (oficial vs não-oficial) — segue a spike do ADR-0004, não decidida aqui.
- Suporte simultâneo a múltiplos provedores por tenant dentro desta change.

## Atores e stakeholders

- Vítor Machado — opera o painel da agência.
- Matheus Vellozo — sócio comercial; precisa ratificar decisões comerciais/jurídicas abaixo.
- Barbeiro-dono — cliente final da Blade Mídia; não acessa este painel, só o `painel-web`.
- Cliente final do barbeiro — titular dos dados protegidos por LGPD; nunca ator direto.

## Capabilities afetadas ou candidatas

- `painel-agencia` (nova — superfície de acesso interna, distinta do `painel-web`)
- `billing` (já registrada em `specs/README.md` como "futura, fora da v1" — está sendo
  antecipada para escopo agora; ver risco de escopo abaixo)
- `whatsapp-canal` (delta — modelo de dados de credencial/sessão por tenant e estado de saúde)

## Casos de uso principais

- Cadastrar uma nova barbearia (tenant) e associar sua instância/sessão WhatsApp.
- Visualizar, por tenant, status da conexão (conectado/desconectado/banido/precisa
  reautenticar) e volume/erro de mensagens recentes.
- Registrar pagamento/atraso de uma cobrança e refletir isso no estado operacional do tenant.
- Acompanhar custo real (Meta/infra) vs receita por tenant, para visibilidade de margem.
- Em caso de ban ou queda, iniciar procedimento de substituição de número/sessão — **e assumir
  o custo e a responsabilidade integralmente perante o cliente** (ver regra confirmada abaixo).

## Edge cases e falhas relevantes

- Número banido ou WhatsApp fora do ar durante atendimento ativo do cliente final.
- Barbeiro cancela o contrato — o que acontece com histórico de conversas e com a sessão,
  dado que a custódia é 100% da agência.
- Inadimplência do barbeiro — momento e forma de suspensão do atendimento automático.
- Comprometimento de uma credencial no vault — equivale a sequestro de conta WhatsApp de um
  cliente.
- Falha do provedor (Meta) ou queda geral do WhatsApp fora do controle da Blade Mídia — a
  responsabilidade assumida (ver abaixo) cobre isso também, ou só falhas atribuíveis à
  operação da agência? (pergunta aberta, não bloqueante).

## Regras de negócio

### Confirmadas
- Custódia das credenciais/sessões WhatsApp é 100% da Blade Mídia (decisão de Vítor,
  2026-07-06 — pendente ratificação de Matheus por ser decisão com implicação contratual).
- **A Blade Mídia assume integralmente a responsabilidade operacional e financeira por
  qualquer falha, queda ou banimento da conexão WhatsApp — não repassa culpa nem prejuízo ao
  barbeiro** (decisão de Vítor, 2026-07-06). Isto eleva a mitigação do risco de ban de "a
  decidir" para "aceite explícito com obrigação de mitigação concreta": a agência precisa de
  um runbook de substituição rápida de número/sessão e, possivelmente, de uma reserva
  operacional/financeira para absorver o custo de reprovisionamento sem repassar ao cliente.
- **Provedor decidido pragmaticamente (não pela spike formal): Evolution API (não-oficial,
  self-hosted em Docker)** — decisão de Vítor, 2026-07-06, **revertendo** a escolha
  registrada mais cedo no mesmo dia (Meta Cloud API). Motivo da reversão: a rota oficial
  tem atrito real que a análise anterior subestimou — (1) verificação de negócio Meta é
  aprovação externa, dias não horas; (2) mesmo via Embedded Signup, depende do cliente
  clicar no fluxo e da revisão de nome/qualidade da Meta; (3) migrar o número do barbeiro
  pro Cloud API tipicamente tira dele o uso normal do WhatsApp nesse número (coexistência é
  limitada) — contradiz o próprio `project.md` ("o número é o ativo mais valioso do
  barbeiro"). Evolution resolve isso: o barbeiro continua usando o app normalmente
  (dispositivo vinculado), sem aprovação externa, onboarding em minutos.
- **Trade-off aceito conscientemente com esta reversão**: risco de ban deixa de ser ~zero
  e passa a ser real. Como a Blade Mídia já assumiu arcar com toda queda/banimento (regra
  acima), isso precisa de mitigação operacional concreta, não só da promessa: warm-up de
  volume por número novo, rate limit, evitar padrão de broadcast, diversificar IP/VPS
  conforme a base cresce (para não concentrar risco de ban de portfólio em uma única
  infra), runbook de reconexão (Baileys quebra com updates do WhatsApp — manutenção
  contínua esperada, não exceção).
- **Hospedagem**: volta ao padrão original da ADR-0006 — VPS + Docker Compose (Evolution
  API + Postgres + Redis + Caddy) para o gateway WhatsApp. O painel (`apps/web`) pode
  continuar em Netlify/Vercel — só o gateway Evolution precisa de processo persistente;
  comunicação entre os dois via REST + webhook.
- v1 do painel é operação manual assistida, não self-service.

### Inferidas (validar)
- A nova taxa mensal de gestão é adicional à mensalidade Pro (R$697), não substitui —
  precisa confirmação com Matheus (pricing é decisão comercial dele).
- Suspensão automática por inadimplência é desejada, mas prazo de carência/aviso não definido.
- Assumir "responsabilidade integral" provavelmente inclui compensação/crédito ao cliente por
  tempo de indisponibilidade, não só o conserto técnico — a validar.

### Em aberto
- O que acontece contratualmente quando um barbeiro cancela (recupera o número? os dados de
  conversa?) — depende também da rota de provedor escolhida na spike.
- Existe obrigação de portabilidade de dados de conversa (LGPD) mesmo com custódia técnica
  integral da agência?
- "Assumir tudo" cobre falhas de terceiros fora do controle da Blade Mídia (outage global do
  WhatsApp/Meta), ou só falhas atribuíveis à própria operação?

## Restrições técnicas conhecidas

- Deve respeitar ADR-0004 (interface `WhatsAppProvider`, provedor por tenant) — nenhum código
  deste painel importa SDK de provedor diretamente.
- Deve respeitar ADR-0007 (escopo por `barbershop_id` via camada de repositório).
- CLAUDE.md do repo: nunca logar conteúdo de mensagens de clientes finais nem telefones
  completos — o painel de saúde trabalha só com metadados (status, contagem, timestamps).
- D4 (teto de infra R$150-200/mês) foi definido para custo fixo total; este painel introduz
  custo variável por tenant e uma possível reserva para incidentes, que não estavam
  modelados — precisa revisão explícita antes de fechar o preço da nova taxa mensal.

## Requisitos não funcionais relevantes

- **Segurança de credenciais**: sessão/token por tenant é equivalente a posse de conta —
  exige criptografia em repouso, acesso restrito (só worker + painel da agência, nunca o
  painel do barbeiro) e trilha de auditoria de acesso/rotação.
- **LGPD**: camada adicional ao que já está em `project.md` — a Blade Mídia é custodiante
  técnica integral da comunicação de terceiros com os clientes finais deles.
- **Continuidade de negócio**: com custódia total + responsabilidade assumida, uma falha da
  própria Blade Mídia tira do ar N clientes simultaneamente e o custo de remediar é da
  agência — risco de concentração que não existia antes desta decisão.

## Riscos

| Risco | Tipo | Impacto | Probabilidade | Mitigação | Decisão necessária |
|---|---|---:|---:|---|---|
| Ban/queda vira incidente multi-cliente, e a agência assumiu arcar com tudo | Técnico/financeiro | Crítico (real com Evolution, não ~zero como seria na rota oficial) | Média | Warm-up de volume por número novo, rate limit, evitar padrão de broadcast, runbook de reconexão, diversificar IP/VPS conforme a base cresce | Sim — mitigação precisa estar no design, não só na promessa |
| Vazamento de credencial no vault = sequestro de conta de cliente | Segurança | Crítico | Baixa (se bem implementado) | Criptografia em repouso, controle de acesso, auditoria | Sim — parte do design técnico |
| D4 (teto de infra) não contempla custo variável por tenant nem reserva de incidente | Financeiro | Alto | Alta (já é real hoje) | Modelar custo por tenant e reserva de contingência separados do custo fixo de plataforma | Sim — antes de precificar a nova taxa |
| Falta de cláusula contratual sobre custódia, saída e limites da "responsabilidade integral" | Jurídico/negócio | Alto | Alta (nada formalizado ainda) | Contrato revisado com Matheus (idealmente com advogado) antes de vender a nova taxa | Sim — bloqueante para venda, não para a exploração técnica |
| `billing` puxada para escopo antes do previsto em `specs/README.md` | Processo | Médio | Certa | Confirmar conscientemente com os sócios; atualizar `specs/README.md` quando a change concluir | Sim — decisão de escopo |

## Premissas

- A nova taxa mensal cobre gestão de keys + suporte, adicional ao Pro R$697/mês (a confirmar).
- v1 atende a escala atual (poucos clientes, operação manual) — não precisa suportar dezenas
  de tenants simultâneos ainda.
- O painel da agência é superfície de acesso nova, separada do `painel-web`, com autenticação
  e permissões distintas.
- "Assumir responsabilidade integral" implica, no mínimo, um runbook operacional de resposta a
  incidente — o escopo financeiro exato (crédito/reembolso) fica para o `design.md`.

## Perguntas críticas

### Bloqueantes
1. A nova taxa mensal é adicional ou substitui parte do pricing atual (R$697 Pro)? — Matheus.
2. Procedimento contratual em caso de cancelamento do barbeiro, dada a custódia total da
   agência — Matheus + revisão jurídica antes de formalizar a spec.
3. Regra de suspensão por inadimplência (quando, com que aviso prévio) — decisão comercial
   dos dois sócios.
4. **Reaberta com a reversão para Evolution**: isolamento de infraestrutura por tenant
   (quantas instâncias por VPS, diversificar IP) é decisão técnica de v1 ou fica para
   quando a base crescer? Proposta pragmática: 1 VPS pequeno cobre o volume inicial (poucos
   clientes); reavaliar diversificação a partir de ~10-15 números ativos.
5. "Assumir tudo" inclui compensação financeira ao cliente por indisponibilidade, e cobre
   falhas de terceiros (outage/ban do WhatsApp) ou só falhas atribuíveis à própria operação?
   Com Evolution, "falha de terceiro" e "falha nossa" se confundem mais (o ban pode ser
   causado por padrão de uso nosso, mesmo sem culpa direta) — vale alinhar isso com o
   Matheus com essa nuance em mente.

### Importantes, não bloqueantes
1. Gateway de pagamento/cobrança recorrente (ex.: Asaas, Pagar.me, Stripe) — recomenda-se
   integrar um provedor em vez de construir motor de assinatura do zero.
2. Painel da agência precisa de múltiplos níveis de permissão (Vítor vs Matheus vs futuro
   suporte) desde já, ou um papel único "admin" resolve na v1?

## Decisões da discussão

| Pergunta | Decisão | Quem | Data |
|---|---|---|---|
| Custódia da credencial/sessão WhatsApp | Agência detém tudo (custódia total) | Vítor | 2026-07-06 |
| Responsabilidade por falha/ban/queda | Blade Mídia assume integralmente, sem repassar ao cliente | Vítor | 2026-07-06 |
| Timing da decisão de provedor (D2/ADR-0004) | Mantém a spike como estava; painel construído contra a interface | Vítor | 2026-07-06 |
| Escopo v1 do painel | Mínimo, provisionamento manual assistido (SLC) | Vítor | 2026-07-06 |
| Provedor WhatsApp (substitui a spike formal) | ~~Meta Cloud API~~ → **Evolution API self-hosted** (revertido no mesmo dia após análise de atrito da rota oficial) | Vítor | 2026-07-06 |
| Hospedagem v1 | Netlify/Vercel (painel) + **VPS/Docker Compose para o gateway Evolution** (Postgres + Redis + Caddy) | Vítor | 2026-07-06 |

> Pendente: ratificação de Matheus Vellozo para as decisões acima — especialmente custódia e
> responsabilidade integral (implicação contratual/legal direta) — e para as perguntas
> bloqueantes 1-3, por exigência do `project.md` (linha 5: "Alterações aqui exigem aprovação
> explícita dos sócios").
