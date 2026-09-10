# Delta for atendimento-ia

> Capability nova — este delta contém apenas `ADDED Requirements` e, na conclusão da change,
> vira a spec inicial em `openspec/specs/atendimento-ia/spec.md`.

## ADDED Requirements

### Requirement: Loop de conversa roda no worker, nunca no webhook
O sistema SHALL processar toda resposta automática de IA dentro de um job assíncrono
(`apps/worker`), nunca dentro do handler HTTP do webhook.

#### Scenario: Mensagem do cliente aciona o loop
- GIVEN uma mensagem de cliente final persistida e enfileirada pelo canal (`whatsapp-canal`)
- WHEN o worker processa o job de ingestão e a conversa está com `handover = bot` e sem opt-out
- THEN o sistema SHALL rodar o loop de conversa e, se houver resposta, SHALL enviá-la pelo
  `WhatsAppProvider`

#### Scenario: Conversa sob posse humana não recebe resposta do bot
- GIVEN uma conversa com `handover = humano`
- WHEN uma nova mensagem do cliente chega
- THEN o sistema SHALL NOT rodar o loop de IA nem enviar qualquer resposta automática

## Requirement: Ações estruturadas só acontecem via tool, nunca por texto livre do modelo
O sistema SHALL executar qualquer efeito colateral (consultar disponibilidade, criar/remarcar/
cancelar agendamento, cadastrar cliente básico) exclusivamente através de tools validadas por
schema, nunca inferindo uma ação a partir do texto gerado pelo modelo.

#### Scenario: Horário oferecido ao cliente sempre vem de tool
- GIVEN uma conversa em que o cliente pede para agendar
- WHEN o bot oferece horários disponíveis
- THEN todo horário oferecido SHALL ter sido obtido por uma chamada à tool
  `consultar_disponibilidade`

#### Scenario: Tool nunca recebe o tenant como argumento livre
- GIVEN uma chamada de tool feita pelo modelo com um campo extra tentando indicar outro tenant
- WHEN o sistema executa a tool
- THEN o sistema SHALL usar exclusivamente o `barbershopId` da conversa em processamento,
  ignorando qualquer valor de tenant presente no input do modelo

## Requirement: Cliente sem cadastro pode ser atendido e cadastrado pelo bot
O sistema SHALL permitir que uma conversa sem `client_id` associado prossiga para agendamento,
cadastrando um cliente básico (nome informado + telefone da conversa) antes de criar o
agendamento.

#### Scenario: Primeira mensagem de um telefone desconhecido pede agendamento
- GIVEN uma conversa sem `client_id` associado
- WHEN o cliente final informa o nome e pede para agendar
- THEN o sistema SHALL cadastrar o cliente com o telefone já resolvido da conversa e SHALL
  associar a conversa ao cliente criado antes de prosseguir com o agendamento

## Requirement: Escalação para atendimento humano
O sistema SHALL passar a posse de uma conversa para humano (`handover = humano`) quando o
modelo identificar pedido explícito, frustração ou assunto fora do escopo da barbearia, e
também quando a conversa não progredir por um número determinado de turnos consecutivos sem
nenhuma tool de domínio executada com sucesso.

#### Scenario: Escalação explícita pelo modelo
- GIVEN uma conversa em andamento
- WHEN o modelo identifica pedido direto de atendimento humano, frustração ou assunto fora do
  escopo da barbearia
- THEN o sistema SHALL marcar `handover = humano` e SHALL enviar uma mensagem fixa de devolução
  ao cliente, e o bot SHALL parar de responder àquela conversa

#### Scenario: Conversa não progride por falhas de entendimento consecutivas
- GIVEN uma conversa em que N turnos consecutivos terminam sem nenhuma tool de domínio
  executada com sucesso e sem escalação explícita
- WHEN o N-ésimo turno consecutivo nessa condição termina
- THEN o sistema SHALL marcar `handover = humano` e SHALL enviar a mensagem fixa de devolução,
  independentemente do texto que o modelo tenha gerado nesse turno

#### Scenario: Tool de domínio bem-sucedida reseta o contador de estagnação
- GIVEN uma conversa com turnos anteriores contabilizados como estagnados
- WHEN um novo turno executa com sucesso qualquer tool de domínio (agenda ou cadastro)
- THEN o sistema SHALL zerar o contador de estagnação daquela conversa

## Requirement: Degradação sem interromper o canal quando a IA está indisponível
O sistema SHALL, ao falhar a chamada ao provedor de IA (erro de rede, limite de taxa ou erro do
provedor), marcar a conversa como `handover = humano` sem lançar exceção não tratada e sem
perder a mensagem do cliente, que já foi persistida pelo canal.

#### Scenario: Provedor de IA indisponível
- GIVEN uma mensagem de cliente que deveria acionar o loop de IA
- WHEN a chamada ao provedor de IA falha (erro de rede, limite de taxa ou erro do provedor)
- THEN o sistema SHALL marcar `handover = humano`, SHALL registrar o tipo de erro em log
  estruturado sem conteúdo de mensagem, e SHALL NOT propagar exceção não tratada para o job

## Requirement: Custo de IA registrado por barbearia
O sistema SHALL registrar, para cada turno de conversa processado pelo provedor de IA, o
consumo de tokens (entrada, saída e cache), escopado por `barbershop_id`.

#### Scenario: Turno de conversa concluído
- GIVEN um turno de conversa processado com sucesso ou com erro do provedor após ter recebido
  uso reportado
- WHEN o sistema finaliza o processamento desse turno
- THEN o sistema SHALL persistir um registro de uso de tokens associado à barbearia e à
  conversa

## Requirement: Voz do atendimento automático é a da barbearia
Todo texto enviado ao cliente final pelo bot SHALL seguir a voz "barbearia fala com o cliente
dela" (informal, direto, no máximo um emoji), nunca a voz institucional da Blade, nunca se
apresentando como robô nem fingindo ser uma pessoa específica se perguntado diretamente, e
nunca citando valor fora do cardápio configurado da barbearia.

#### Scenario: Mensagem de devolução para humano
- GIVEN uma escalação (explícita ou por estagnação)
- WHEN o sistema envia a mensagem fixa de devolução
- THEN o texto SHALL estar no registro do tom informal do atendimento automático, sem jargão
  institucional

#### Scenario: Pergunta direta sobre ser um robô
- GIVEN o cliente pergunta diretamente se está falando com um robô
- WHEN o bot responde
- THEN o sistema SHALL NOT afirmar ser uma pessoa específica, mantendo a instrução de escopo do
  system prompt

## Requirement: Isolamento de dados entre barbearias
O sistema SHALL escopar toda leitura e escrita de uso de IA e de estado de estagnação/handover
por `barbershop_id`, sem exceção.

#### Scenario: Tentativa de leitura cruzada de uso de IA
- GIVEN registros de uso de IA de duas barbearias distintas
- WHEN uma consulta é feita com o `barbershopId` de uma delas
- THEN o sistema SHALL retornar apenas os registros daquela barbearia
