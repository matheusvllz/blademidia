# Capability: whatsapp-canal

> Spec permanente — fonte da verdade do comportamento do canal WhatsApp do produto.
> Não editar diretamente: toda mudança passa por uma change (ver [workflow](../../workflow.md)).
>
> Histórico:
> - Fase 5 (núcleo — ingestão, persistência, envio, handover, leitura) estabelecida pela
>   change `add-whatsapp-canal` (concluída 2026-09-10).
>
> Escopo atual: recepção e envio de mensagem, com o provedor abstraído atrás de
> `WhatsAppProvider` (D2/ADR-0004) e integrado nesta fase via um BSP de mensalidade fixa (o
> adapter concreto segue o formato Meta Cloud API como referência — ver ADR-0004, "Decisão
> final", e o `design.md` arquivado desta change). Conversação de IA
> (`atendimento-ia`), confirmação automática (`confirmacao-agendamento`) e reativação
> (`reativacao-clientes`) são capabilities separadas que consomem este canal — não estão aqui.

## Requirement: Abstração de provedor
O sistema SHALL expor toda comunicação com o WhatsApp através da interface `WhatsAppProvider`
(`packages/whatsapp`) — nenhum código fora desse pacote SHALL importar SDK ou formato
específico de provedor.

#### Scenario: Troca de provedor sem tocar no domínio
- GIVEN um adapter concreto substituído por outro (ex.: mudança de BSP)
- WHEN o domínio (webhook, worker, telas) continua chamando `WhatsAppProvider`
- THEN nenhum código de domínio SHALL precisar mudar — só a implementação do adapter

## Requirement: Recepção assíncrona de mensagens
O sistema SHALL responder ao webhook do provedor em até poucos segundos, persistindo a
mensagem recebida e enfileirando o processamento — nunca executando lógica de resposta
dentro do próprio handler do webhook (ADR-0011).

#### Scenario: Mensagem recebida
- GIVEN um evento de mensagem assinado corretamente pelo provedor
- WHEN o webhook recebe o `POST`
- THEN o sistema SHALL persistir a mensagem e enfileirar um job de processamento
- AND SHALL responder `200` sem esperar o processamento terminar

#### Scenario: Assinatura inválida
- GIVEN um `POST` no webhook sem assinatura válida
- WHEN a verificação de assinatura falha
- THEN o sistema SHALL responder `401` e SHALL NOT persistir nem enfileirar nada

#### Scenario: Verificação do endpoint (challenge)
- GIVEN uma requisição `GET` de verificação do webhook, com `verify_token` correto
- WHEN o sistema recebe a requisição
- THEN o sistema SHALL responder `200` com o valor do desafio em texto puro

#### Scenario: Mensagem para um número não reconhecido
- GIVEN um evento assinado corretamente, cujo identificador de número não corresponde a
  nenhuma barbearia cadastrada
- WHEN o webhook recebe o evento
- THEN o sistema SHALL responder `200` sem persistir nem enfileirar nada, registrando o
  ocorrido em log sem conteúdo de mensagem

## Requirement: Deduplicação de mensagens
O sistema SHALL garantir, por restrição no banco de dados, que a mesma mensagem (identificada
pelo id do provedor) nunca seja processada mais de uma vez, mesmo sob reentrega do webhook.

#### Scenario: Reentrega da mesma mensagem
- GIVEN uma mensagem já persistida com um identificador de provedor
- WHEN o mesmo evento chega novamente pelo webhook
- THEN o sistema SHALL descartar o duplicado sem criar novo registro nem novo processamento

## Requirement: Conversa por telefone, com ou sem cliente cadastrado
O sistema SHALL manter uma conversa por (barbearia, telefone), associando-a a um cliente do
CRM quando existir e permitindo que exista mesmo sem cliente cadastrado.

#### Scenario: Remetente já cadastrado no CRM
- GIVEN um cliente cadastrado com um telefone
- WHEN uma mensagem chega desse telefone (considerando a variação do nono dígito)
- THEN o sistema SHALL associar a conversa ao cliente existente

#### Scenario: Remetente não cadastrado
- GIVEN um telefone sem cliente correspondente no CRM da barbearia
- WHEN uma mensagem chega desse telefone
- THEN o sistema SHALL criar e persistir a conversa e a mensagem normalmente, sem cliente
  associado

## Requirement: Envio respeita a janela de 24 horas
O sistema SHALL impedir o envio de texto livre para uma conversa cuja última mensagem
recebida do cliente tenha mais de 24 horas — apenas mensagens de template SHALL ser aceitas
fora dessa janela.

#### Scenario: Envio de texto livre dentro da janela
- GIVEN uma conversa cuja última mensagem do cliente foi recebida há menos de 24 horas
- WHEN o sistema tenta enviar um texto livre
- THEN o envio SHALL prosseguir

#### Scenario: Envio de texto livre fora da janela
- GIVEN uma conversa cuja última mensagem do cliente foi recebida há mais de 24 horas
- WHEN o sistema tenta enviar um texto livre
- THEN o `WhatsAppProvider` SHALL recusar o envio antes de qualquer chamada de rede ao provedor

## Requirement: Posse da conversa (handover bot/humano)
O sistema SHALL rastrear se uma conversa está sob resposta do bot ou de um humano, mudando
para humano tanto por ação explícita quanto ao detectar, via webhook, uma mensagem enviada
pelo próprio número do negócio que não se origina de um envio do sistema.

#### Scenario: Barbeiro responde pelo próprio aplicativo
- GIVEN uma conversa em andamento e coexistência ativa (número também no WhatsApp Business
  App do barbeiro)
- WHEN o barbeiro responde diretamente no aplicativo
- THEN o sistema SHALL registrar essa mensagem (recebida via espelhamento do webhook) e
  SHALL marcar a posse da conversa como humana

## Requirement: Opt-out do cliente final
O sistema SHALL interromper qualquer envio futuro a uma conversa cujo cliente final tenha
solicitado a interrupção.

#### Scenario: Cliente pede para parar
- GIVEN uma conversa ativa
- WHEN o cliente envia uma mensagem de opt-out (ex.: "PARE" ou "SAIR")
- THEN o sistema SHALL marcar a conversa como opt-out
- AND SHALL impedir qualquer envio futuro para essa conversa até que o opt-out seja revertido

## Requirement: Isolamento de dados entre barbearias
O sistema SHALL escopar toda leitura e escrita de conversas e mensagens por `barbershop_id`,
sem exceção.

#### Scenario: Tentativa de acesso cruzado
- GIVEN conversas de duas barbearias distintas
- WHEN uma consulta é feita com o `barbershopId` de uma delas
- THEN o sistema SHALL retornar apenas as conversas daquela barbearia, nunca da outra

## Requirement: Nenhum dado sensível em log
O sistema SHALL NOT registrar em log o conteúdo de mensagens nem o telefone completo do
cliente final — o telefone, quando logado, SHALL aparecer mascarado (ex.: `***1234`).

#### Scenario: Log de processamento de mensagem
- GIVEN uma mensagem recebida ou enviada
- WHEN o sistema registra um log estruturado do evento
- THEN o log SHALL conter identificadores técnicos (id da mensagem, `tenant_id`, telefone
  mascarado) e SHALL NOT conter o corpo da mensagem nem o telefone completo

## Requirement: Histórico de conversas para leitura no painel
O sistema SHALL exibir, para o dono e para o funcionário autorizado, o histórico de conversas
de WhatsApp da barbearia, sem oferecer envio de mensagem por essa tela nesta capability.

#### Scenario: Consulta do histórico
- GIVEN conversas registradas para a barbearia
- WHEN o dono ou funcionário autenticado acessa a tela de conversas
- THEN o sistema SHALL exibir a lista e o histórico de mensagens escopados à sua barbearia
