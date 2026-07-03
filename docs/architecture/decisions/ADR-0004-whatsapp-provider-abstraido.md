# ADR-0004: Camada WhatsApp abstraída — decisão de provedor EM ABERTO

## Status
**Proposto — decisão parcial** (2026-07-03). A abstração está decidida; o provedor será
escolhido após spike técnica (decisão D2 do project.md).

## Contexto
A integração WhatsApp é a decisão técnica mais crítica do produto. Duas rotas:

| | Meta Cloud API (oficial) | Evolution API / Baileys (não-oficial) |
|---|---|---|
| Risco de ban | Nenhum | **Real** — e o número é o ativo do barbeiro |
| Custo | Por conversa (~R$0,04-0,50 conforme categoria; janelas de serviço de 24h gratuitas mudaram ao longo do tempo — verificar na spike) | Zero |
| Setup por cliente | Verificação de negócio Meta, número dedicado ou migração | Escanear QR code do número existente (minutos) |
| Bots/IA | Oficialmente suportado | Tolerado, contra os ToS |
| Recursos | Templates aprovados, botões, catálogo | Tudo que o WhatsApp normal faz |
| Confiabilidade | Alta (SLA Meta) | Depende de engenharia reversa; quebra em updates |

O onboarding < 4h prometido no plano de ação favorece a rota não-oficial; o risco de ban e a
sustentabilidade de longo prazo favorecem a oficial.

## Decisão (parcial)
1. Todo o domínio conversa com WhatsApp **exclusivamente** através da interface `WhatsAppProvider` (`packages/whatsapp`): enviar texto/mídia/botões, receber mensagens (webhook normalizado), status de entrega, saúde da conexão.
2. Dois adapters candidatos: `MetaCloudAdapter` e `EvolutionAdapter`.
3. **Spike técnica obrigatória antes do primeiro design de mensageria**, comparando: custo real por barbearia/mês, prazo e atrito de onboarding, taxa/risco de ban documentado, esforço de implementação de cada adapter, e experiência do barbeiro (usar o número existente vs número novo).
4. O provedor pode ser **por tenant** — a interface deve permitir barbearias em provedores diferentes (ex.: começar não-oficial, migrar para oficial).

## Justificativa
Decidir sem dados violaria o próprio método (regra de parada: risco alto sem mitigação). A abstração torna a decisão reversível e permite estratégia híbrida.

## Consequências
- Nenhum código fora de `packages/whatsapp` importa SDKs de provedor.
- A spike vira uma change própria (`spike-whatsapp-provider`) com relatório comparativo como entregável.
- Critério de saída da spike: recomendação fundamentada + atualização deste ADR para Aceito.

## Alternativas consideradas
- **Escolher a oficial agora** — seguro, mas pode inviabilizar o onboarding <4h e adicionar custo/atrito que mata a venda no ICP. Prematuro.
- **Escolher a não-oficial agora** — rápido, mas aposta o ativo mais valioso do cliente sem medir o risco. Prematuro.
- **Gateway de terceiros (Z-API, Twilio, 360dialog)** — entra na spike como variante das duas rotas (custo adicional por mensagem vs operação própria).
