# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/) (v0.x até o primeiro cliente em produção).

## [Unreleased]

### Added
- **Canal WhatsApp (Fase 5)** (`add-whatsapp-canal`), aprovada e implementada — primeira das
  4 changes da Fase 5 (canal WhatsApp + atendimento por IA), fundação de que as outras três
  (`atendimento-ia`, `confirmacao-agendamento`, `reativacao-clientes`) dependem inteiramente.
  D2/ADR-0004 resolvida: Meta Cloud API, integrada via **coexistência** (o número continua no
  WhatsApp Business App do barbeiro, respondendo também pela Cloud API ao mesmo tempo — não é
  mais necessário tirar o número do celular), via BSP de mensalidade fixa ainda a contratar.
  - **`packages/whatsapp`** (novo pacote): interface `WhatsAppProvider` desacoplada de
    provedor; adapter dry-run (loga em vez de enviar, usado sem credencial); adapter contra o
    formato Meta Cloud API (assinatura HMAC sobre corpo cru, verificação de challenge,
    envio de texto e template); normalização de telefone BR (E.164 + nono dígito).
  - **`whatsapp-canal`** (capability nova): ingestão assíncrona (webhook só persiste e
    enfileira — ADR-0011 novo; loop de IA nunca roda inline, entra na Fase 5.2); deduplicação
    de mensagem por restrição de unicidade no banco (`wamid`); conversa por telefone, com ou
    sem cliente cadastrado; janela de 24h aplicada no domínio, não só na UI; `handover`
    bot/humano, detectando quando o barbeiro responde pelo próprio app (mensagem espelhada
    pela coexistência); opt-out (`PARE`/`SAIR`); tela `/conversas` de leitura (não é caixa de
    entrada — o barbeiro responde pelo próprio WhatsApp).
  - **`crm-clientes`** (delta): exclusão LGPD de cliente passa a anonimizar também as
    conversas de WhatsApp associadas (telefone → NULL, vínculo removido), preservando o
    conteúdo das mensagens — mesma transação da anonimização do cliente.
  - **Achados de arquiteto durante a pesquisa que precedeu a implementação**: custo de
    mensageria confirmado contra a documentação oficial da Meta (`atendimento-ia` e
    `confirmacao-agendamento` saem baratos/grátis; `reativacao-clientes`, categoria
    marketing, é o único ponto real de atenção de orçamento); coexistência confirmada como
    real e oficial (corrigindo uma hipótese anterior de que o número sairia do celular);
    achado novo não previsto na decisão original — ativar a coexistência exige status de
    Meta Tech Provider ou um BSP que já tenha, resolvido pela escolha de BSP com mensalidade
    fixa.
  - **Achados durante a implementação, corrigidos no próprio design**: faltava o mecanismo de
    roteamento do webhook único (compartilhado por todas as barbearias) até a barbearia dona
    do número — `barbershops` ganhou `whatsapp_phone_number_id`; o `middleware.ts` de sessão
    bloqueava o webhook antes mesmo da verificação de assinatura rodar — `/api/webhooks/
    whatsapp` entrou na lista de rotas públicas (autenticada pela própria assinatura, não por
    cookie); rotas de API JSON para leitura de conversa (`/api/conversations/**`) foram
    descartadas do design original por não terem consumidor — as telas buscam direto via
    Server Component, mesmo padrão de `/clientes`.
  - Verificado de verdade: 189 testes automatizados no total do monorepo (`packages/whatsapp`
    35 novos, `packages/db` 47 incluindo os 6 novos deste change, `apps/worker` 21 incluindo
    15 novos) + fluxo HTTP real via `curl` contra Postgres real (challenge em texto puro;
    envio assinado criando conversa e mensagem; boot real do worker processando a fila e
    atualizando `last_inbound_at`; reentrega da mesma mensagem não duplicando; assinatura
    inválida recusada com 401; mensagem espelhada do WhatsApp Business App marcando
    `handover=humano`; mensagem para número não reconhecido tratada sem erro; opt-out por
    `PARE` verificado; acesso cruzado entre barbearias em `/conversas/:id` confirmado como
    404) + verificação de que nenhum conteúdo de mensagem nem telefone completo aparece nos
    logs do servidor. Change **concluída (Done)**: spec permanente nova em
    [openspec/specs/whatsapp-canal/spec.md](openspec/specs/whatsapp-canal/spec.md), delta
    aplicado em [openspec/specs/crm-clientes/spec.md](openspec/specs/crm-clientes/spec.md),
    ADR-0004 atualizado para Aceito e ADR-0011 novo em
    [docs/architecture/decisions/](docs/architecture/decisions/), change arquivada em
    `openspec/changes/archive/add-whatsapp-canal/`. **Pendente antes de produção** (fora
    desta change, tarefa comercial do Matheus): cotar e contratar o BSP específico, ativar a
    coexistência com credenciais reais. [add-whatsapp-canal]
- **Os 3 guias estratégicos oficiais aprovados e SDD inteiro sincronizado** (2026-07-28).
  [Guia da Dor](docs/business/dor-central.md), [Guia da Persona](docs/business/persona-icp.md) e
  [Guia de COPY](docs/business/guia-de-copy.md) passam a ser a **principal fonte de verdade
  estratégica** da empresa, com precedência **Dor > Persona > COPY** e regra explícita de que
  nenhum documento do repositório pode criar informação conflitante com eles. Índice novo em
  [docs/business/README.md](docs/business/README.md) (papel de cada guia, como se integram e
  constantes oficiais do negócio). Propagação por todo o SDD e pelos documentos de negócio:
  - **`openspec/project.md`** — nova seção de abertura "Os 3 guias estratégicos oficiais";
    § "O negócio" reescrita com o eixo **capacidade de atendimento** e a hierarquia oficial
    (uma tese + duas provas) no lugar dos quatro problemas em lista plana; novas seções de
    **posicionamento e proposta de valor**, **estratégia comercial e de aquisição** (motor =
    prospecção ativa + indicação; conversão no WhatsApp; diagnóstico como mecanismo de venda;
    âncora de payback; comparação com recepcionista, nunca com app) e **estratégia de marketing,
    branding e comunicação**; anti-ICP explicitado; requisito não funcional de idioma agora
    aponta o léxico do Guia de COPY; **decisão estrutural D0** registrada.
  - **`openspec/workflow.md`** — **portão estratégico** antes do Refinamento (change fora da
    dor, do ICP ou do posicionamento não avança) e item novo de coerência estratégica no
    Definition of Done; fluxo leve deixa claro que até ajuste de copy passa pelo guia.
  - **`openspec/templates/exploration.md`** — seção obrigatória **"Coerência estratégica"**
    (relação com a dor central, persona atendida, impacto em copy, conflitos identificados).
  - **`openspec/conventions.md`** — regra de vocabulário da UI aponta a lista completa de
    palavras banidas e a tabela de tradução do Guia de COPY.
  - **`docs/sdd/04-checklist-avaliador.md`** — **§ 0 "Coerência estratégica"** como primeiro
    portão do checklist de avaliação (7 verificações).
  - **`docs/architecture/overview.md`** — **princípio 0**: a arquitetura serve à dor central;
    caminho crítico é receber e responder mensagem, e nada essencial pode exigir ação do
    barbeiro no painel.
  - **`docs/business/contexto-negocio.md`** — rebaixado a documento de apoio (design system, tom
    de voz original, números do plano); § Posicionamento reescrita com eixo, categoria
    reivindicada e hierarquia; relatório mensal reenquadrado como o instrumento que torna
    visível a perda invisível.
  - **`site/README.md`**, **`apps/web/README.md`**, **`automation/README.md`** — regras de texto
    de cada frente: copy do site mapeada bloco a bloco pelo Guia de COPY § 13.1; microcopy do
    painel pelo § 13.9 (com o lembrete de que o painel é conveniência, não requisito); e aviso
    de que as respostas dos presets são **a voz da barbearia**, não da Blade — a qualidade da
    conversa é o produto.
  - **`CLAUDE.md`** e **`README.md`** — os três guias como leitura obrigatória de entrada.
- **Guia oficial de COPY e comunicação** (2026-07-28) —
  [docs/business/guia-de-copy.md](docs/business/guia-de-copy.md), derivado obrigatoriamente da
  dor central e da persona. Passa a ser a **fonte oficial de qualquer decisão de copy** da Blade
  Mídia: posicionamento e proposta de valor em três alturas, mensagem central da marca,
  narrativa mestra em 6 tempos, método de exploração da dor (escada de revelação + regra da
  absolvição), gatilhos emocionais e racionais, tom de voz com exemplos ✅/❌, léxico
  obrigatório com tabela de tradução, conversão de funcionalidade em benefício, copy por nível
  de consciência (1-5), fórmulas e banco de headlines/hooks/CTAs, respostas prontas às 9
  objeções, e aplicação canal a canal com exemplos completos (site seção a seção, landing pages,
  anúncios e roteiro de vídeo, prospecção presencial e fria, WhatsApp, reunião comercial em 7
  tempos, Instagram, e-mail, microcopy do produto e voz do atendimento automático). Inclui
  checklist de 10 pontos pré-publicação, lista de erros proibidos, regras de uso honesto de
  números e um **protocolo específico para IA gerar copy** (§ 17). Referenciado como contexto
  oficial em `openspec/project.md`, `openspec/conventions.md`, `CLAUDE.md` e `README.md`.
- **Ticket de referência do segmento corrigido** (2026-07-28, confirmado pelos sócios):
  **corte R$30-55**, corte + barba R$55-80, **ticket médio de trabalho R$45**. Propagado por
  todos os documentos de negócio — modelo financeiro da dor central, faixas do ICP
  (400-1.000 atendimentos/mês) e base de cálculo de ROI/payback da copy ("evitar 4 furos por
  semana paga o sistema"; "~16 atendimentos recuperados no mês").
- **Definição estratégica de Dor Central e Persona/ICP** (2026-07-28) — dois documentos novos em
  `docs/business/`, criados a partir da análise crítica de todo o SDD e integrados ao contexto
  oficial. Ambos são **documentos-guia de contexto estratégico** (não registram diagnóstico de
  execução — a discussão de calibragem que os originou está resumida abaixo).
  - [docs/business/dor-central.md](docs/business/dor-central.md) — define **o que** resolvemos.
    Conclusão central: os três problemas comunicados hoje no site não são três dores, são **uma
    causa e duas consequências**. A dor central é "o zap sem operador" — o dono é produtor e
    comercial ao mesmo tempo, o WhatsApp fica sem ninguém no horário em que a demanda chega, e a
    perda é **invisível** para ele. No-show e cliente sumido passam a ser **prova**, não tese.
    Inclui hierarquia de dores, alternativas atuais e por que falham (padrão único: exigem que
    alguém opere ou que o cliente final mude de canal), impacto financeiro/operacional/emocional,
    a tensão "dor mais cara × dor mais consciente", e 8 hipóteses de campo a validar (H1-H8).
  - [docs/business/persona-icp.md](docs/business/persona-icp.md) — define **para quem**.
    Rafael, o barbeiro-dono que ainda corta: 28-38 anos, 2-4 cadeiras com ≥1 barbeiro parceiro,
    sem recepcionista, R$18-45k/mês, DF. Cobre maturidade digital, rotina, medos, dores ocultas,
    objeções ordenadas, quem influencia, vocabulário, critérios de qualificação (5 de 7),
    anti-ICP ampliado, por que a persona é a melhor escolha estratégica e 8 hipóteses (P1-P8).
  - **Calibragens definidas por estes documentos:** (1) faixa do ICP ajustada para
    **2-4 cadeiras / R$18-45k/mês** — a mensalidade precisa ficar entre 1,5% e 4% do faturamento
    e o volume de mensagem precisa sustentar a dor; (2) eixo de posicionamento definido como
    **capacidade de atendimento** ("a barbearia continua atendendo quando o dono não pode"), que
    cobre resposta, confirmação e reativação sob uma promessa só, mantendo a fronteira com
    tráfego/divulgação; (3) hierarquia fixada em **uma tese + duas provas**; (4) regra de uso
    honesto de números: toda projeção rotulada como projeção e todo número acompanhado da conta.
  - **Integração:** referenciados em `openspec/project.md` (seção de persona reescrita + tabela
    de documentos de referência), `CLAUDE.md` (novo passo 0 obrigatório antes de qualquer tarefa
    + item 4 dos próximos passos), `README.md` (tabela "Comece por aqui") e
    `docs/business/contexto-negocio.md` (aviso de precedência no topo + ICP e anti-ICP
    atualizados no extrato).
- **Fidelização de clientes + Papel de funcionário (Fase 4)**
  (`add-fidelizacao-e-funcionarios`), aprovada e implementada. Duas capabilities novas,
  deliberadamente combinadas numa change só (decisão registrada de Vítor, apesar do risco de
  escopo maior sinalizado):
  - **`fidelizacao-clientes`**: contagem simples de visitas por cliente (não pontos), sinalização
    de "meta atingida" no perfil e no dashboard ("clientes prontos para resgate"), resgate
    explícito que reinicia a contagem, limite configurável por barbearia (padrão 6). Puramente
    informativa — nunca aplica desconto automático (o sistema não processa pagamento). Contagem
    calculada ON-THE-FLY a partir de `visits` (nunca um contador mutável, para não divergir dos
    dois pontos que criam visita), com `clients.loyalty_baseline_at` garantindo que histórico
    anterior à ativação não conta.
  - **`auth-tenancy`** (primeira vez especificada — antes só candidata): papel `dono`/
    `funcionario` em `crm_users`, funcionário **vinculado a um barbeiro** do catálogo da agenda
    (login opcional, criado/gerido pelo dono em Configurações → Barbeiros & Horários, sem
    convite por e-mail). Funcionário só vê e opera a **própria agenda** (dia/semana/grade,
    criar/confirmar/concluir/remarcar/cancelar/falta) e o CRM de clientes compartilhado; **sem
    acesso** a relatórios financeiros, Configurações (serviços/preços/barbeiros/funcionários/
    regras da agenda) nem exclusão de cliente (LGPD). Retrofit sistemático de autorização em
    toda rota/página existente sensível (~25 rotas), guiado por uma matriz de autorização
    explícita no `design.md`. Sessões emitidas antes desta capability continuam válidas, lidas
    como `dono` — sem forçar logout no deploy. **Achado de segurança pego e corrigido durante a
    implementação**: as rotas de gestão de login inicialmente devolviam o registro completo do
    usuário (incluindo o hash da senha) no JSON de resposta e nas props do componente React —
    corrigido antes de qualquer verificação externa, agora só `{id, emailOrPhone, active}` sai
    da API. Verificado de verdade: 104 testes automatizados (`packages/db` 41, `packages/core`
    44, `apps/web` 7 — primeiro teste unitário do app, adicionado propositalmente para a lógica
    de autorização — `packages/ai` 6, `apps/worker` 6) + suíte extensa de HTTP real como
    funcionário tentando cada ação restrita (403/404 confirmados) e como dono confirmando
    ausência de regressão, incluindo teste explícito de sessão antiga pré-Fase-4 continuando
    autenticada. `pnpm lint`/`typecheck`/`test`/`build` limpos. Change **concluída (Done)**:
    specs permanentes novas em
    [openspec/specs/fidelizacao-clientes/spec.md](openspec/specs/fidelizacao-clientes/spec.md) e
    [openspec/specs/auth-tenancy/spec.md](openspec/specs/auth-tenancy/spec.md), delta aplicado em
    [openspec/specs/agendamento/spec.md](openspec/specs/agendamento/spec.md), change arquivada em
    `openspec/changes/archive/add-fidelizacao-e-funcionarios/`.
    [add-fidelizacao-e-funcionarios]
- **Agenda — visão semanal em grade** (`add-agenda-visao-semanal`), aprovada e implementada.
  Adiciona à tela `/agenda` uma visão em grade (dias × horários, como um planner) como
  alternativa às visões de dia e semana-por-barbeiro já existentes — não as substitui. Toggle
  **todos os barbeiros** (célula consolidada, cards empilhados) ou **um barbeiro** (com
  seletor); navegação entre semanas; indicador de **ocupação da semana** no rodapé
  ("N/M · P% cheia"), usando a **mesma função** de capacidade/ocupação da capability
  `relatorios` (`packages/core/agenda/capacity.ts`, ADR-0010) — as duas telas nunca divergem no
  mesmo número. Grade **interativa**: clicar célula vazia abre a criação de agendamento com
  dia/horário pré-preenchidos (reusando o `AppointmentForm` da Fase 2 sem nenhuma regra nova);
  clicar um card abre o detalhe/ações já existentes. Dias e horas da grade derivam da grade de
  trabalho real da barbearia (nunca fixo seg–sex). Nova rota fina `GET /api/agenda/occupancy`.
  Verificado de verdade: `pnpm lint`/`typecheck`/`test`/`build` limpos; fluxo completo via HTTP
  real (barbeiro com grade 09–18 seg–sex → agendamento criado e confirmado → ocupação 1/90
  refletida corretamente na rota; página `/agenda?view=grade` renderiza sem erro). Change
  **concluída (Done)**: delta aplicado a
  [openspec/specs/agendamento/spec.md](openspec/specs/agendamento/spec.md), change arquivada em
  `openspec/changes/archive/add-agenda-visao-semanal/`. [add-agenda-visao-semanal]
- **Relatórios (Fase 3)**, aprovada e implementada (`add-relatorios`). Entrega os indicadores
  operacionais que os dados de hoje sustentam — faturamento registrado, atendimentos, ticket
  médio, clientes novos/atendidos, ocupação da agenda, faltas/cancelamentos, rankings de
  serviço e de barbeiro, comparação com o período anterior — por período livre ou por preset
  (mês atual, mês passado, últimos 7 dias, trimestre). **Achado de arquiteto registrado na
  exploração**: as 4 métricas do relatório *comercial* prometido (reativados automáticos,
  no-show evitado por confirmação, mensagens do bot, R$ recuperado) dependem estruturalmente
  da Fase 5 (mensageria/IA, ainda não implementada) — por decisão de Vítor, esta change entrega
  o que é medível hoje e deixa a fundação pronta, sem exibir as métricas causais como zero
  enganoso. Tela `/relatorios` (seletor de período + indicadores) e exportação **PDF**
  apresentável (`@react-pdf/renderer`, sem headless browser — orçamento D4). **Snapshot mensal
  automático** no worker (`relatorios.monthly-snapshot`, cron `5 0 1 * *`, idempotente por
  `(barbershop_id, ano, mês)`), com colunas reservadas e nulas para as métricas causais da
  Fase 5. Nova capability compartilhada **capacidade/ocupação da agenda**
  (`packages/core/agenda/capacity.ts`, ADR-0010) — mesma função usada pela change
  `add-agenda-visao-semanal`, para as duas telas nunca divergirem no mesmo número. Envio
  automático **não** faz parte desta fase (acoplado à Fase 5 por decisão explícita — ver
  proposal). Verificado de verdade: suíte com 83 testes automatizados no total (`packages/db`
  27, `packages/core` 44, `packages/ai` 6, `apps/worker` 6) + fluxo completo via HTTP real
  (login → seed de cliente/atendimento → `/api/relatorios` → PDF real conferido visualmente) +
  boot real do worker com fila/cron confirmados no Postgres (`pgboss.queue`/
  `pgboss.schedule`) + regressão LGPD (exclusão de cliente preserva agregados de período
  fechado). `pnpm lint`/`typecheck`/`test`/`build` limpos. Change **concluída (Done)**: spec
  permanente nova em
  [openspec/specs/relatorios/spec.md](openspec/specs/relatorios/spec.md), change arquivada em
  `openspec/changes/archive/add-relatorios/`. [add-relatorios]
- **Agenda integrada (Fase 2)**, aprovada e implementada (`add-agendamento`). Evolui o CRM
  (Fase 1) para uma plataforma operacional completa: catálogo de serviços (nome, duração,
  preço de tabela) e barbeiros (recurso da agenda, sem login), grade semanal por barbeiro
  com múltiplas janelas/dia (intervalo de almoço), exceções (folga/bloqueio/disponibilidade
  extra), motor de disponibilidade puro (grade − exceções − agendamentos ativos, fuso
  America/Sao_Paulo), ciclo de vida completo do agendamento (agendado → confirmado →
  concluído/cancelado/faltou) com **ausência de double booking garantida no Postgres**
  (restrição de exclusão `btree_gist`), conclusão transacional idempotente que gera o
  atendimento e o pagamento da Fase 1, varredura automática de falta (worker + pg-boss,
  `apps/worker` novo). Telas: `/agenda` (visão do dia por barbeiro, criar/confirmar/
  concluir/remarcar/cancelar/marcar falta) e hub de Configurações (Serviços, Barbeiros &
  Horários, Regras da Agenda). Integração com o CRM: próximo agendamento no perfil do
  cliente, exclusão LGPD cancela agendamentos futuros, dashboard com agenda de hoje.
  **Estrutura pronta para o bot de IA** (Fase 5, ainda não conectado): camada de domínio
  única `packages/core` (`AgendaService`, ADR-0008) consumida por painel, worker e o
  contrato de 4 tools (`packages/core/agenda/tools.ts`, re-exposto em `packages/ai` no
  formato tool-use da Claude API, ADR-0005) — nenhuma chamada externa nesta fase. Migração
  opcional e idempotente de serviços/barbeiros/horário do preset da automação. ADR-0008
  (camada de domínio) e ADR-0009 (worker + pg-boss). Verificado de verdade: suíte com 49
  testes automatizados no total (`packages/db` 17, `packages/core` 24, `packages/ai` 6,
  `apps/worker` 2 — cobrindo motor de disponibilidade, `AgendaService`, isolamento de
  tenant, contrato de tools, migração e job de no-show) + fluxo completo exercido via HTTP
  real (curl) em cada grupo de tasks + boot real do worker com filas/cron confirmados no
  Postgres. Ver
  [apps/web/README.md](apps/web/README.md) e
  [docs/operations/onboarding-produto.md](docs/operations/onboarding-produto.md). Change
  **concluída (Done)**: specs permanentes atualizadas
  ([openspec/specs/agendamento/spec.md](openspec/specs/agendamento/spec.md) nova,
  [openspec/specs/crm-clientes/spec.md](openspec/specs/crm-clientes/spec.md) evoluída),
  change arquivada em `openspec/changes/archive/add-agendamento/`. [add-agendamento]
- **Primeiro código de produto do repositório**: CRM de Clientes (Fase 1), aprovado e
  implementado (`add-crm-clientes`). Monorepo pnpm com `apps/web` (Next.js, painel do
  barbeiro) e `packages/db` (Drizzle + Postgres): cadastro/edição/exclusão (LGPD) de
  cliente, histórico de atendimentos, registro financeiro por visita (sem processar
  pagamento), dashboard (ativos/inativos/ticket médio), regra de inatividade configurável
  por barbearia, auth mínima (login único por barbearia, sessão via Web Crypto), migração
  idempotente de `automation/data/db.json` com dry-run e relatório de divergências, teste
  de isolamento entre tenants (ADR-0007). Identidade visual 100% herdada de `site/`
  (Ink/Gold/Chalk/Steel/Wire, Barlow/Barlow Condensed/Space Mono). Ver
  [apps/web/README.md](apps/web/README.md) para rodar localmente e
  [docs/operations/onboarding-produto.md](docs/operations/onboarding-produto.md) para o
  runbook de onboarding. Planejamento completo das 5 fases (núcleo, agenda,
  financeiro/relatórios, fidelização, campanhas/IA/WhatsApp) e pesquisa de mercado
  (Fresha/Booksy/Zenoti) em `openspec/changes/archive/add-crm-clientes/exploration.md`.
  Change **concluída (Done)** e fechada formalmente: spec permanente em
  [openspec/specs/crm-clientes/spec.md](openspec/specs/crm-clientes/spec.md), change
  arquivada em `openspec/changes/archive/add-crm-clientes/`, `crm-clientes` promovida a
  capability especificada no registro. [add-crm-clientes]
- Painel da agência e painel do cliente (`automation/panel-server.mjs` + `panel/` + `client-panel/`): CRM de barbearias e clientes finais, detecção de inativos para reativação, escopo por barbearia, telefones mascarados. Painel do cliente é simples/claro e não segue o estilo do site (ferramenta do barbeiro). [add-agency-ops-panel]
- Preset Docker full-stack em `infra/stack/` (Evolution + painel + motor + Caddy) para pôr um cliente no ar no VPS com um comando. [add-agency-ops-panel]
- Auto-deploy do site no Netlify via GitHub Actions + build hook (`.github/workflows/deploy-site.yml`), independente do GitHub App do Netlify.
- Site da agência importado para `site/` (antes no repo pessoal vodetmor/blademidia); Netlify migrado para publicar deste repositório. Todos os JS do site desminificados com Prettier e arquitetura documentada em `site/README.md`. [add-agency-ops-panel]
- Automação de atendimento da agência em `automation/`: motor de auto-resposta com presets por cliente, provisionamento de tenant no Evolution API, simulador local (testável sem Docker/WhatsApp) e runbook de onboarding. [add-agency-ops-panel]
- Infra do gateway WhatsApp em `infra/evolution/`: Docker Compose de produção (com Caddy/TLS) e local. [add-agency-ops-panel]
- Changes SDD: `init-project-skeleton` (exploration/proposal/design/tasks) e `add-agency-ops-panel` (exploration/proposal Fase 0/design/tasks).
- Fundação Spec-Driven Development: estrutura `openspec/` (project, workflow, conventions, templates, specs, changes), método SDD em `docs/sdd/`, contexto de negócio em `docs/business/`.
- Arquitetura proposta com 7 ADRs (`docs/architecture/`) — status Proposto, aguardando validação.
- Instruções para agentes de IA (`CLAUDE.md`).

### Changed
- `openspec/project.md` e `docs/business/contexto-negocio.md`: sócios nomeados (Vítor Machado, Matheus Vellozo).
- `CLAUDE.md`: documentadas as três frentes do repo (site / operação da agência / produto SaaS) e o regime de cada uma, para orientar qualquer IA que pegar o projeto.
- Decisão pragmática de provedor WhatsApp registrada na change add-agency-ops-panel: Evolution API self-hosted (reversível via interface `WhatsAppProvider`).

### Removed
- Seção "Quem opera" (nomes dos sócios) do render da landing — execução não convenceu; código preservado e importância registrada em `docs/business/contexto-negocio.md` para retomada.
