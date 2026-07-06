const PROBLEMS = [
    {
      num: "01",
      title: "O zap fica sem resposta enquanto você corta.",
      body: "Cliente manda mensagem, você está na cadeira, ele esperou 3 horas. Quando você responde, ele já marcou em outro lugar.",
      metric: "R$1.800",
      metricLabel: "perdidos / cliente / ano",
    },
    {
      num: "02",
      title: "Cliente agenda e some — sem aviso, sem retorno.",
      body: "Cadeira vazia no horário de pico, sem reagendamento e sem cobrança. O no-show some no caixa antes mesmo de você notar.",
      metric: "8 / sem",
      metricLabel: "média de no-shows",
    },
    {
      num: "03",
      title: "Quem veio 3 vezes e parou — você esqueceu.",
      body: "Sem lista, sem lembrete, sem aviso. Cliente que era fiel virou ex-cliente, e ninguém foi atrás. Fidelidade não é sorte.",
      metric: "21 dias",
      metricLabel: "janela de reativação",
    },
  ],
  WA_SCRIPT = [
    {
      type: "msg",
      side: "in",
      text: "oi, tudo certo? quero marcar um corte com barba pra amanhã",
      t: "14:02",
    },
    { type: "badge", text: "Bot Blade · resposta em 8s" },
    {
      type: "msg",
      side: "out",
      text: "fala chefe! 🙏 amanhã eu tenho 09:30, 11:00 e 15:30. qual prefere?",
      t: "14:02",
    },
    { type: "msg", side: "in", text: "15:30 fica perfeito", t: "14:03" },
    {
      type: "msg",
      side: "out",
      text: "fechado. corte + barba, com o Léo, amanhã às 15:30. te mando um lembrete 1h antes 👌",
      t: "14:03",
    },
    { type: "badge", text: "Confirmação automática agendada · 14:30 / amanhã" },
    {
      type: "msg",
      side: "out",
      text: 'salvei seu nome aqui. da próxima vez é só dizer "corte" que eu te mostro os horários 💈',
      t: "14:03",
    },
  ],
  STEPS = [
    {
      num: "01",
      h: "A gente instala o bot no seu zap",
      p: "Em 72h sua barbearia tem um atendente que responde em segundos enquanto você corta. Sem você operar nada.",
      label: "O que entra",
      bullets: [
        "Bot integrado ao seu número oficial",
        "Respostas treinadas com sua linguagem",
        "Cardápio de serviços + preços ao vivo",
        "Handoff pra você quando precisar",
      ],
    },
    {
      num: "02",
      h: "A agenda confirma cada horário 24h antes",
      p: "Mensagem automática 24h antes pergunta: confirma ou remarca? Quem não confirma libera o horário pra encaixe.",
      label: "Resultados típicos",
      bullets: [
        "No-show cai de 8/sem pra 1–2/sem",
        "Encaixe automático com lista de espera",
        "Lembrete final 1h antes do horário",
        "Você vê tudo no celular, em 1 tela",
      ],
    },
    {
      num: "03",
      h: "Cliente que some volta sozinho",
      p: "A cada 21 dias sem retorno, o sistema dispara uma mensagem personalizada. Sem você lembrar. Sem você digitar.",
      label: "Como ativa",
      bullets: [
        "Régua de reativação 21 / 30 / 45 dias",
        "Mensagem em tom da barbearia",
        "Oferta inteligente quando faz sentido",
        "Relatório mensal do que voltou",
      ],
    },
  ],
  METRICS = [
    {
      lbl: "Tempo de resposta",
      num: "00:08",
      sub: "Antes: até 3h. Com o bot: 8 segundos, a qualquer horário.",
      goldOn: "all",
    },
    {
      lbl: "No-show por semana",
      num: "−87%",
      sub: "Meta: derrubar o no-show de ~8/sem pra 1–2 no primeiro mês.",
      goldOn: "all",
    },
    {
      lbl: "Reativação automática",
      num: "23%",
      sub: "Meta de retorno da base parada há 21+ dias, sem você digitar.",
      goldOn: "all",
    },
    {
      lbl: "Setup completo em",
      num: "72h",
      sub: 'Do "fechei" ao bot rodando no seu zap.',
      goldOn: "all",
    },
  ],
  CASES = [
    {
      id: "PERFIL 01",
      region: "3 cadeiras",
      num: "R$ 9.400",
      numSplit: ["R$ ", "9.4", "00"],
      title: "de potencial / mês",
      quote:
        "Numa barbearia de 3 cadeiras que perde ~2 horários por dia entre no-show e cliente sumido, é esse o caixa que o sistema é construído pra recuperar já no primeiro mês.",
      meta1: "3 cadeiras",
      meta2: "projeção do modelo",
    },
    {
      id: "PERFIL 02",
      region: "2 cadeiras",
      num: "47",
      numSplit: ["", "4", "7"],
      title: "inativos pra reativar",
      quote:
        "Com uma base de ~200 clientes parados há mais de 21 dias, a régua de reativação automática mira trazer de volta cerca de 1 em cada 4 — sem você digitar nada.",
      meta1: "2 cadeiras",
      meta2: "projeção do modelo",
    },
    {
      id: "PERFIL 03",
      region: "1 cadeira",
      num: "92%",
      numSplit: ["", "9", "2%"],
      title: "das mensagens na hora",
      quote:
        "O bot cobre o zap enquanto você corta. A meta de operação é que quase toda mensagem tenha resposta em menos de 1 minuto, a qualquer hora do dia.",
      meta1: "1 cadeira",
      meta2: "meta de operação",
    },
  ],
  DIFFS = [
    [
      "Agência genérica que atende qualquer negócio",
      "Só barbearias. Linguagem, processo e oferta sob medida.",
    ],
    [
      "Vende tráfego pago sem estrutura por trás",
      "Sistema de atendimento e retenção implementado do zero.",
    ],
    [
      "Software que o dono precisa configurar",
      "Instalado por nós, operando sozinho desde o dia 1.",
    ],
    ['Promessa vaga: "mais resultados"', "Métrica clara: no-show, reativação, tempo de resposta."],
    ["Contrato longo e multa pesada", "Primeiro mês com garantia. Saiu, saiu. Sem multa."],
  ],
  FAQS = [
    {
      q: "Já tentei sistema antes e não funcionou. Por que esse seria diferente?",
      a: "A maioria das ferramentas exige que você configure e mantenha tudo. A gente instala, treina o bot com a linguagem da sua barbearia, e deixa rodando. Você não mexe em painel nenhum. Se quiser ver como ficou na prática numa barbearia parecida com a sua, mando um exemplo real.",
    },
    {
      q: "Não tenho tempo pra aprender mais uma coisa.",
      a: "Esse é o ponto. Você não aprende nada. Onboarding é uma conversa de 30 minutos pra alinhar serviços, preços e horários. Depois disso o sistema roda sozinho. Se algo precisar mudar, você manda mensagem pra gente.",
    },
    {
      q: "Meu cliente é fiel. Não preciso de sistema, preciso?",
      a: "Ótimo sinal — significa que você já entrega bem. A questão é: fidelidade é hábito, e hábito quebra fácil quando o cliente muda de bairro, troca de horário ou só esquece. O sistema mantém esse cliente fiel sem você precisar lembrar. É o que você já faz, mas automático.",
    },
    {
      q: "Quanto custa?",
      a: "Setup único + mensalidade. O valor exato depende do tamanho da sua barbearia, e a meta é o sistema se pagar em poucas semanas só com a retenção que ele traz. O primeiro mês tem garantia: se não trouxer resultado mensurável, você cancela sem multa.",
    },
    {
      q: "E se o cliente quiser falar com uma pessoa de verdade?",
      a: "O bot identifica quando o assunto sai do script (reclamação, pedido especial, conversa pessoal) e te passa o controle no ato. Você responde direto, e quando voltar a ser agendamento, o bot retoma. Cliente nunca percebe diferença — só percebe que foi atendido rápido.",
    },
    {
      q: "Atendem fora de Brasília?",
      a: "Hoje estamos focados 100% em barbearias de Brasília/DF — é a fase 1. Conforme a gente consolida aqui, abre pra outras capitais. Se você é de fora, manda mensagem mesmo: te aviso assim que chegar na sua cidade.",
    },
  ];
((window.PROBLEMS = PROBLEMS),
  (window.WA_SCRIPT = WA_SCRIPT),
  (window.STEPS = STEPS),
  (window.METRICS = METRICS),
  (window.CASES = CASES),
  (window.DIFFS = DIFFS),
  (window.FAQS = FAQS));
