# Exploração Crítica — Fidelização de Clientes + Papel de Funcionário (Produto — Fase 4)

## Change ID
`add-fidelizacao-e-funcionarios`

## Ideia original

> Registrada por Vítor em 2026-07-15/16.

Realizar a **Fase 4** do roadmap do produto: fidelização simples de clientes (contagem, não
pontos) e papel de funcionário (barbeiro com login próprio, visão restrita à própria agenda).

## Contexto

O roadmap (`add-crm-clientes/exploration.md:323-326`) definiu a Fase 4 como "Fidelização e
Configurações avançadas", juntando duas ideias:

1. **`fidelizacao-clientes`**: "a cada N visitas, um benefício" — pesquisa de mercado citada na
   Fase 1 apontou que contagem simples ("a cada 6ª visita, um serviço grátis") supera sistemas
   de pontos para o ICP (Rafael não tem paciência para configurar regra de conversão).
2. **Papel de funcionário**: hoje o produto tem exatamente **um usuário por barbearia** (o
   "dono" — `crm_users`, sem coluna de papel). O comentário no schema já antecipava isso:
   *"Quando `auth-tenancy` for especificada de verdade (múltiplos papéis, funcionário), esta
   tabela ganha coluna de papel — não é reescrita."*

## O achado crítico (avaliado e decidido com Vítor)

Estas são **duas capabilities muito diferentes em natureza e risco**:
`fidelizacao-clientes` é uma feature de produto de baixo risco (lê/soma visitas, sem tocar
segurança); `auth-tenancy` é uma mudança **estrutural de autenticação e autorização** que toca
potencialmente toda rota existente do sistema (relatórios, configurações, agenda, clientes) —
o mesmo nível de risco que a Fase 2 tratou para o domínio de agendamento. A regra do workflow
("uma change afeta uma ou poucas capabilities; se afetar muitas, quebre em changes menores")
apontaria para duas changes separadas.

**Decisão de Vítor**: as duas entram **juntas nesta change** (opção "as duas juntas" nas
perguntas bloqueantes abaixo), mesmo com o risco de escopo maior sinalizado. Registrado como
decisão consciente, não omissão.

## Atores / usuários impactados

- **Barbeiro-dono** — continua com acesso total (nada muda para ele, exceto a tela nova de
  gestão de login de funcionários e o resgate de fidelização).
- **Barbeiro-funcionário (NOVO)** — agora pode logar; vê e opera **só a própria agenda**; não
  vê relatórios financeiros nem configurações da barbearia.
- **Cliente final** — sujeito da fidelização; não é usuário do sistema.
- **Operador Blade** — sem mudança de acesso nesta fase (fora de escopo, como já registrado em
  `auth-tenancy` candidata).

## Casos de uso principais

### Fidelização
1. Cliente completa visitas; o sistema conta desde a última vez que resgatou (ou desde que virou
   cliente, se nunca resgatou).
2. Ao atingir o limite configurado (padrão: 6), o perfil do cliente e o dashboard sinalizam
   "meta atingida" — igual ao padrão já existente de "clientes a reativar".
3. Barbeiro decide o que oferecer (fora do sistema — ex.: serviço grátis) e marca "resgate" no
   perfil do cliente; a contagem reinicia a partir desse momento.
4. Barbearia configura o limite de visitas por barbearia (como o limite de inatividade).

### Papel de funcionário
5. Dono cadastra um barbeiro (já existente na Fase 2) e, na mesma tela, define um login/senha
   para ele — vira "funcionário".
6. Funcionário loga e vê uma versão restrita do painel: só a própria agenda (todas as visões —
   dia, semana, grade), só os clientes/atendimentos que ele mesmo realiza; sem acesso a
   relatórios financeiros nem a Configurações (serviços, preços, outros barbeiros/funcionários,
   regras da agenda).
7. Funcionário cria/confirma/conclui/remarca/cancela agendamentos — mas só os dele; não pode
   atribuir um agendamento a outro barbeiro.
8. Dono redefine a senha de um funcionário quando necessário (sem fluxo de "esqueci a senha" —
   não há e-mail configurado no projeto).

## Decisões da discussão (portão etapa 3 — respondidas por Vítor em 2026-07-15/16)

1. **Escopo** → *As duas capabilities juntas nesta change* (`fidelizacao-clientes` +
   `auth-tenancy`), apesar do risco de escopo maior sinalizado.
2. **Mecânica da recompensa** → *Só informativa*. O sistema nunca aplica desconto/crédito
   automaticamente (coerente com o non-goal "sem processar pagamento" do `project.md`); só
   sinaliza, o barbeiro decide e registra manualmente (já é possível hoje registrar valor
   R$0 ou nenhum valor).
3. **Reinício da contagem** → *Reinicia após resgate*. Exige uma ação explícita "marcar
   resgatado" — não dá para inferir só pelo valor R$0 (atendimento sem valor já existe hoje por
   outro motivo, seria ambíguo).
4. **Retroatividade** → *Começa do zero*. Visitas anteriores à ativação da feature não contam
   para a meta.
5. **Vínculo do funcionário** → *Vinculado a um barbeiro específico do catálogo* (não é um
   usuário "gerente" genérico). Ele só vê a própria agenda/atendimentos.
6. **Restrições do funcionário** → *Sem acesso a relatórios financeiros* e *sem acesso a
   Configurações* (serviços, preços, outros barbeiros/funcionários, regras da agenda).
7. **Criação de conta** → *O dono*, numa tela de Configurações — sem convite por e-mail (não há
   infraestrutura de e-mail no projeto); dono define login e senha e entrega ao funcionário.
8. **Volume esperado** → *1-3 funcionários por barbearia*, coerente com o ICP (1-3 cadeiras) —
   uma lista simples resolve, sem paginação/busca.

## Pontos em aberto — Premissas assumidas (marcadas para validação no proposal)

Duas perguntas não foram feitas explicitamente por já terem uma resposta conservadora e
reversível óbvia; registradas aqui como **Premissa** (não Fato) para revisão no portão de
validação:

- **Exclusão de cliente (LGPD)**: assumido que **só o dono** pode excluir/anonimizar um cliente
  a pedido do titular — ação semi-irreversível, tratada com o mesmo rigor de "relatórios
  financeiros"/"configurações". Não foi perguntado diretamente; se Vítor discordar, é reversível
  sem custo de migração (é só uma flag de permissão).
- **Cadastro/edição de cliente (CRM)**: assumido que o **cadastro de clientes continua
  compartilhado** entre todos os logins da barbearia (dono e funcionários veem o mesmo cliente,
  criam/editam normalmente) — cliente não "pertence" a um barbeiro específico, é da barbearia.
  A restrição "só vê a própria agenda" (decisão 5) se aplica à **agenda** (agendamentos), não ao
  cadastro/histórico do cliente em si — do contrário um funcionário não conseguiria nem
  consultar o histórico de um cliente que ele vai atender pela primeira vez.

## Regras de negócio

### Fidelização
- Contagem = nº de atendimentos (`visits`) do cliente desde o último resgate (ou desde a
  ativação da feature, se nunca resgatou) — todos os serviços contam igualmente (sem
  distinção por tipo, coerente com "a cada 6ª visita" da pesquisa).
- Limite configurável por barbearia, com padrão 6 (mesmo padrão de `crm_settings`/
  `agenda_settings`: valor default até a barbearia configurar o próprio).
- Resgate é uma ação explícita e não pode ser desfeita automaticamente (reversível só por
  suporte/dado bruto, como qualquer outro evento de negócio já registrado no sistema).
- Exclusão de cliente (LGPD, já existente) remove também o histórico de resgates vinculado à
  identidade removida, preservando agregados sem religar à pessoa.

### Papel de funcionário
- `barbershop_id` continua escopando tudo (ADR-0007) — a restrição de funcionário é uma camada
  **adicional** sobre o isolamento de tenant já existente, nunca uma substituição dele.
- Funcionário só pode criar/gerenciar agendamento com `barberId` = o próprio; tentar atribuir a
  outro barbeiro é recusado (mesmo nível de rigor que "cliente de outra barbearia" já recusa
  hoje).
- Um barbeiro (`barbers`) pode ou não ter login; ter login não é obrigatório (barbearias que não
  quiserem funcionário com acesso continuam operando com um usuário só, como hoje).
- Dono nunca perde acesso a nada; papel de funcionário é estritamente um subconjunto restrito do
  que o dono já pode fazer.

## Riscos e mitigações

| Risco | Tipo | Impacto | Prob. | Mitigação |
|---|---|---|---|---|
| Retrofit de autorização esquecer uma rota existente (funcionário acessa algo que não deveria) | Segurança | Alto | Média | `design.md` traz uma **matriz de autorização** cobrindo toda rota existente; `tasks.md` percorre sistematicamente cada arquivo de rota, um a um, com validação HTTP real (tentar como funcionário → 403) |
| Escopo grande (duas capabilities) atrasar a entrega ou aumentar risco de regressão | Processo | Médio | Média | Aceito conscientemente por Vítor; mitigado com ordem de implementação que isola fidelização (baixo risco) de auth-tenancy (alto risco) em grupos de tasks distintos, cada um com suíte verde antes do próximo |
| Sessão antiga (cookie assinado antes desta change, sem `role`/`barberId`) causar comportamento indefinido após o deploy | Compatibilidade | Médio | Alta (todo usuário logado no momento do deploy) | Sessão sem `role` é tratada como `role: "dono"` na leitura (todo usuário existente hoje É dono) — compatível sem forçar logout; nova sessão sempre inclui os campos |
| Funcionário conseguir ver cliente/histórico de fora da barbearia via manipulação de parâmetro | Segurança | Alto | Baixa | Mesma proteção de `barbershop_id` já testada (ADR-0007) — não é reescrita, só uma camada a mais |
| Contagem de fidelização divergir entre o que o perfil mostra e o dashboard | Correção | Baixo | Baixa | Uma única função de cálculo (`packages/core` ou repositório único), mesmo padrão do ADR-0010 (fonte única) |

## Premissas

- Sem sistema de e-mail no projeto → nenhum fluxo de convite/recuperação de senha por e-mail
  nesta fase; dono sempre define/redefine a senha manualmente.
- Volume de funcionários pequeno (1-3) → sem paginação/busca na tela de gestão.
- `packages/ai`/contrato de tools (Fase 5, bot) não é afetado por papel de funcionário nesta
  fase — quando a Fase 5 chegar, decide-se separadamente se o bot atua "como dono" ou por
  barbeiro.

## Fronteiras com outras capabilities

- **`agendamento`** — o requisito "Barbeiro não é usuário do sistema" (Fase 2) é MODIFICADO:
  login passa a ser opcional. A propriedade do recurso `barbers` (grade, exceções,
  disponibilidade) continua 100% em `agendamento`; só a existência de credenciais de login
  passa a ser possível, definida por `auth-tenancy`.
- **`crm-clientes`** — sem mudança de requisito (cadastro/histórico continuam compartilhados,
  ver Premissa acima); a exclusão LGPD ganha a restrição de "só dono" via `auth-tenancy`, não
  uma mudança na spec de `crm-clientes` em si.
- **`relatorios`** — sem mudança de requisito de conteúdo; ganha restrição de acesso (só dono)
  via `auth-tenancy`.
- **`auth-tenancy`** — nasce como capability especificada nesta change (antes só candidata).

## Escopo desta change / Non-Goals

**In scope:** capability `fidelizacao-clientes` (contagem, sinalização, resgate, configuração);
capability `auth-tenancy` (papel dono/funcionário, login vinculado a barbeiro, matriz de
autorização retrofitada em toda rota existente, telas de gestão de funcionário).

**Non-Goals:** sistema de pontos por valor; qualquer desconto/crédito automático; convite por
e-mail; recuperação de senha self-service; papéis além de dono/funcionário (ex.: gerente
intermediário); múltiplas barbearias por login; acesso de suporte do operador Blade a tenants
(fica para quando `auth-tenancy` evoluir de novo); qualquer mudança em `packages/ai`/Fase 5.
