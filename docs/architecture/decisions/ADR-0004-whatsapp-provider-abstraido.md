# ADR-0004: Camada WhatsApp abstraída — provedor Meta Cloud API

## Status
**Aceito** (2026-09-07). Ver "Decisão final" abaixo. O restante deste documento — Contexto,
Decisão parcial original e Alternativas — é histórico da fase de exploração (2026-07-03) e
permanece como registro do raciocínio; onde divergir da decisão final, a decisão final vence.

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

---

## Decisão final (2026-09-07)

**Decidido por juízo dos sócios, sem a spike técnica prevista acima.** Matheus optou pela rota
oficial. A abstração `WhatsAppProvider` (`packages/whatsapp`) permanece como definido na Decisão
parcial — só o adapter selecionado muda: **`MetaCloudAdapter`**, sem `EvolutionAdapter` no
produto (a Evolution API continua em uso na operação da agência, `automation/`, fora do produto).

### Riscos aceitos conscientemente, sem a mitigação de dados que a spike traria
- Custo real por barbearia/mês era estimativa, não medição — parcialmente corrigido em 2026-09-07 (ver "Custo confirmado" abaixo), mas o volume de reativação real de um cliente ainda não foi medido (ver `docs/sdd/06-plano-execucao-fase-5.md` § 9).
- Atrito de onboarding é maior do que o "<4h" do plano de ação original — ver "Consequência de UX" abaixo.
- Dependência de aprovação de template pela Meta para toda mensagem iniciada pela barbearia (confirmação e reativação) — prazo fora do controle da Blade.

### Achados confirmados em 2026-09-07 (pesquisa contra a documentação oficial da Meta for Developers, `developers.facebook.com/documentation/business-messaging/whatsapp/`)

**Modelo de cobrança.** Sem mensalidade pela plataforma. Cobrança é **por mensagem entregue**, não por sessão nem por conversa (o modelo antigo de "conversation-based pricing" foi descontinuado em 1º de julho de 2025). Categorias:
- **Service** (respostas de texto livre dentro da janela de 24h aberta pelo cliente) — **gratuito**, sem limite.
- **Utility** (ex.: confirmação de agendamento) — cobrado por mensagem entregue fora da janela, com desconto progressivo por volume mensal; gratuito dentro da janela aberta.
- **Marketing** (ex.: reativação) — cobrado por mensagem entregue, **sem** desconto por volume.
- **Authentication** — cobrado por mensagem entregue, com desconto por volume; fora do escopo da Fase 5.

Faturamento em BRL para o Brasil começou a ser disponibilizado em 1º de julho de 2026 (rollout gradual; migração obrigatória de todas as contas até 30/06/2027). Fontes secundárias convergentes (não a página oficial de rate card, que não expõe valor por país publicamente sem login) apontam ordem de grandeza para o Brasil: marketing ≈ US$0,06/msg, utility ≈ US$0,008/msg, authentication ≈ US$0,02/msg — **tratar como estimativa a confirmar no Business Manager real antes de comprometer preço ao cliente**, nunca repassar este número à venda sem essa confirmação (regra do guia de copy: todo número vem com a conta à vista).

**Consequência para a Fase 5:** `atendimento-ia` (o cliente sempre escreve primeiro) cai inteiramente em *service* — **custo zero de mensageria no lado Meta**, o único custo variável daquela capability é a Claude API (ver ADR-0005). `confirmacao-agendamento` (*utility*) é barata mesmo em volume. `reativacao-clientes` (*marketing*) é a única com custo por mensagem relevante e sem desconto de volume — é o ponto do orçamento que precisa de conta feita com dado real antes do primeiro envio (`docs/sdd/06-plano-execucao-fase-5.md` § 9).

**Coexistência WhatsApp Business App + Cloud API — confirmada, com uma condição nova.** A funcionalidade existe oficialmente, com o nome "Onboarding WhatsApp Business app users" (também chamada "Coexistence" na documentação e no ecossistema de parceiros), disponível desde 2024/2025. Confirma o que Matheus descreveu: **o número pode continuar no aplicativo do celular do barbeiro e ser conectado à Cloud API ao mesmo tempo.** Detalhes técnicos confirmados:
- Requer WhatsApp Business app na versão 2.24.17 ou superior no celular do barbeiro.
- Histórico de até 180 dias é sincronizado **mediante consentimento explícito** durante o onboarding — recusar gera o erro `2593109`. É uma escolha, não automático.
- Mensagens enviadas e recebidas são **espelhadas em tempo real** entre o app e a API nos dois sentidos (webhooks). Chats em grupo **não** sincronizam. Mensagens que desaparecem, visualização única e localização ao vivo são desativadas após o onboarding.
- **Sem trava técnica contra dupla resposta.** A Meta não impede nem avisa se o app e a API respondem à mesma mensagem — a responsabilidade de coordenar quem responde é inteiramente da aplicação. O mecanismo de `handover` já previsto em `docs/sdd/06-plano-execucao-fase-5.md` § 6 continua obrigatório e precisa cobrir também mensagens que o barbeiro mandou pelo app, fora do produto.
- Throughput combinado das duas plataformas juntas é limitado a 20 mensagens por segundo — folgado para o volume desta fase, mas registrar para não ser esquecido se a Blade crescer.

**Achado novo, não previsto no plano original: coexistência exige registro como Meta Tech Provider (ou uso de um BSP que já seja).** A documentação oficial de Solution Providers é explícita: o fluxo de Embedded Signup com coexistência é operado por quem tem status de **Solution Partner** (linha de crédito própria, processo longo) ou **Tech Provider** (sem linha de crédito — cliente paga a própria conta, processo mais leve). Não é um recurso self-service disponível para uma conta de WhatsApp Business Platform "direta" sem esse registro. Alternativa: usar um BSP (Business Solution Provider) já registrado como Tech Provider, que expõe a coexistência para os clientes dele — modelo comum no mercado (ex.: 360dialog, Gupshup, Zenvia, Twilio), normalmente com markup por mensagem sobre a tarifa-base da Meta.

**Resolvido em 2026-09-07, mesma sessão:** Matheus escolheu **BSP com mensalidade fixa** (não markup por mensagem, não Tech Provider direto) — o exemplo de mercado usado na comparação foi o modelo do 360dialog (assinatura fixa por número, sem markup sobre a tarifa-base da Meta), mas **o BSP específico ainda não foi cotado nem contratado**. Detalhe completo, incluindo o que isso muda na arquitetura de `packages/whatsapp`, em `docs/sdd/06-plano-execucao-fase-5.md` § 5.9. Isto é a única peça do desenho de canal que passou a depender de um terceiro comercial (o BSP) além da própria Meta — reavaliar se o BSP escolhido descontinuar o serviço ou mudar de preço.

### Consequência de UX que a decisão final não elimina
Mesmo com coexistência funcionando, a janela de 24h (§ 3.1 do plano de execução) continua valendo tanto para a IA quanto para o barbeiro respondendo pelo app: fora da janela, nenhum dos dois manda texto livre — só template aprovado.
