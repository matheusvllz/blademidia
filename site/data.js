const PROBLEMS = [
    {
      num: "01",
      title: "O zap fica sem ninguém enquanto você corta",
      body: "O WhatsApp é o único canal de venda da barbearia, e ele funciona justamente nas horas em que suas duas mãos estão ocupadas. O cliente decide em minutos, sua resposta chega horas depois.",
      anchor: "4 conversas perdidas por semana, a R$45 o corte",
      anchorLabel: "projeção do modelo",
      num2: "R$720/mês",
    },
    {
      num: "02",
      title: "O horário fura porque ninguém confirmou",
      body: "Não é falta de respeito do cliente. É que ninguém mandou mensagem na véspera perguntando se ele vem. A cadeira fica 40 minutos parada no melhor horário da quarta.",
      anchor: "8 furos por semana, a R$45 o corte",
      anchorLabel: "projeção do modelo",
      num2: "R$1.440/mês",
    },
    {
      num: "03",
      title: "O cliente sumiu e você nem percebeu",
      body: "O mesmo motivo que não responde quem chega também não chama quem sumiu. Ninguém tem tempo de abrir a lista e ver quem não aparece faz um mês. Aí você encontra o cara na rua, saindo de outra barbearia.",
      anchor: "o que vale um cliente de corte com barba, quinzenal, ao longo de um ano",
      anchorLabel: "projeção do modelo",
      num2: "R$540 a R$1.680",
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
  FAILURES = [
    {
      title: "Responder no intervalo e no fim do dia",
      body: "É de graça e dá pra levar. Só que você acaba respondendo 14 conversas às 22h, no sofá, cansado. Metade delas já se resolveu em outro lugar e você nem sabe quais.",
    },
    {
      title: "Mensagem automática do WhatsApp Business",
      body: '"Olá, retornarei em breve" não mostra horário, não marca nada e não conversa. Ela só avisa que não tem ninguém ali. Em alguns casos é pior que o silêncio.',
    },
    {
      title: "App de agendamento",
      body: "Falha no ponto que mais importa: exige que o seu cliente mude de canal. Ele continua mandando zap. O app vira uma agenda bonita que só você abre, e a mensagem continua sem resposta.",
    },
    {
      title: "Contratar recepcionista",
      body: "Resolve de verdade, mas cobre um turno só, tira folga, adoece e pede demissão. Numa casa de 2 a 4 cadeiras, o custo dela é o lucro de uma cadeira inteira.",
    },
    {
      title: "Pagar divulgação",
      body: "Joga mais gente num canal que já não é atendido. Aumenta o vazamento em vez de tapar. A gente não vende divulgação, a gente resolve o atendimento.",
    },
  ],
  STEPS = [
    {
      num: "01",
      h: "Seu zap passa a ser respondido",
      p: "Em até 72h a barbearia tem alguém respondendo em segundos, no mesmo número, o dia inteiro. Você continua usando o seu WhatsApp normalmente.",
      label: "O que entra",
      bullets: [
        "Atendimento no seu número, sem trocar nada",
        "Respostas com a sua linguagem e os seus serviços",
        "Preço e horário na conversa, sem ele precisar perguntar",
        "Assunto que foge do script cai pra você na hora",
      ],
    },
    {
      num: "02",
      h: "Cada horário se confirma sozinho",
      p: "24h antes, o cliente recebe uma mensagem perguntando se confirma ou remarca. Quem não confirma libera a vaga pro encaixe. Cadeira boa não fica parada esperando.",
      label: "O que muda",
      bullets: [
        "Confirmação automática no dia anterior",
        "Lembrete 1h antes, pra ele não esquecer",
        "Horário não confirmado volta pra fila do encaixe",
        "Meta do primeiro mês: de 8 furos por semana pra 1 ou 2",
      ],
    },
    {
      num: "03",
      h: "Quem sumiu volta sem você precisar lembrar",
      p: "Passou de 21 dias sem aparecer, o cliente recebe um chamado com a cara da barbearia. Depois 30, depois 45. Você não digita nada e não precisa lembrar de ninguém.",
      label: "O que entra",
      bullets: [
        "Chamada de volta em 21, 30 e 45 dias sem retorno",
        "Mensagem no tom da casa, não de empresa",
        "A lista dos seus clientes com histórico, pela primeira vez",
        "Todo mês você recebe o que voltou e o que foi evitado",
      ],
    },
  ],
  METRICS = [
    {
      lbl: "Tempo de resposta",
      num: "00:08",
      sub: "Hoje o cliente espera até 3 horas por uma resposta. A meta de operação é responder em 8 segundos, a qualquer hora do dia.",
      goldOn: "all",
    },
    {
      lbl: "Furos por semana",
      num: "8 → 1",
      sub: "Meta do primeiro mês, com a confirmação 24h antes. A R$45 o corte, são uns R$1.260 por mês que param de sair da sua cadeira.",
      goldOn: "all",
    },
    {
      lbl: "Quem volta da base parada",
      num: "1 em 4",
      sub: "Meta da régua de 21 dias. Numa base de uns 200 clientes parados, isso são umas 47 pessoas voltando. Projeção do modelo.",
      goldOn: "all",
    },
    {
      lbl: "Setup completo em",
      num: "72h",
      sub: 'Do "fechei" ao zap rodando. Prazo fechado, sem depender de nada.',
      goldOn: "all",
    },
  ],
  CASES = [
    {
      id: "PERFIL 01",
      region: "2 cadeiras",
      num: "47",
      numSplit: ["", "4", "7"],
      title: "clientes pra chamar de volta",
      quote:
        "Uma base de uns 200 clientes parados há mais de 21 dias. A régua mira trazer de volta mais ou menos 1 em cada 4, sem você digitar nada.",
      meta1: "2 cadeiras",
      meta2: "projeção do modelo",
    },
    {
      id: "PERFIL 02",
      region: "3 cadeiras",
      num: "R$ 1.440",
      numSplit: ["R$ ", "1.4", "40"],
      title: "parados por mês em furo",
      quote:
        "8 horários que furam por semana, a R$45 cada, dão R$1.440 por mês de cadeira vazia em horário bom. A confirmação 24h antes existe pra derrubar isso pra 1 ou 2 por semana.",
      meta1: "3 cadeiras",
      meta2: "meta de operação",
    },
    {
      id: "PERFIL 03",
      region: "4 cadeiras",
      num: "R$ 720",
      numSplit: ["R$ ", "72", "0"],
      title: "saindo pelo zap sem resposta",
      quote:
        "Quatro conversas por semana que morrem sem resposta, a R$45, já são R$720 logo no primeiro mês. E cada um desses clientes valeria de R$540 a R$1.680 ao longo de um ano se tivesse virado cliente da casa.",
      meta1: "4 cadeiras",
      meta2: "projeção do modelo",
    },
  ],
  DIFFS = [
    ["Agência que atende qualquer negócio", "Só barbearia, e só em Brasília por enquanto"],
    [
      "Vende divulgação e joga mais gente num canal sem ninguém",
      "Tapa o vazamento do que já chega no seu zap",
    ],
    [
      "Software que você tem que configurar e manter",
      "Instalado e operado por nós, rodando desde o primeiro dia",
    ],
    [
      "Exige que o seu cliente baixe app e mude o jeito dele",
      "Seu cliente continua mandando zap, como sempre fez",
    ],
    [
      'Promete "mais resultados" sem dizer qual',
      "Furo por semana, tempo de resposta e quem voltou, com a conta à vista",
    ],
    ["Contrato longo e multa pesada", "Primeiro mês com garantia. Saiu, saiu, sem multa"],
    [
      "Se cair, o problema vira seu",
      "Se cair, o problema é nosso. A gente resolve e assume o custo",
    ],
  ],
  OPERATORS = [
    {
      id: "01",
      mono: "VM",
      name: "Vítor Machado",
      role: "Responsável técnico",
      line: "Constrói e opera o sistema. Acompanha a saúde do zap todo dia. Se a conexão cair, o problema é dele, não seu.",
    },
    {
      id: "02",
      mono: "MV",
      name: "Matheus Vellozo",
      role: "Responsável comercial",
      line: "Faz o diagnóstico, acompanha o resultado mês a mês e cuida da relação com cada barbearia parceira.",
    },
  ],
  FAQS = [
    {
      q: "Já tentei uma coisa dessas e não funcionou.",
      a: "Faz sentido. Quase tudo que te ofereceram exigia que você configurasse e mantivesse, e você não tem quando fazer isso. Aqui a gente instala, treina com a sua linguagem e opera. Se você precisar mexer em alguma coisa pra funcionar, quer dizer que a gente falhou. Quer ver rodando antes de decidir?",
    },
    {
      q: "Não tenho tempo de aprender mais uma coisa.",
      a: "Esse é justamente o ponto: você não aprende nada. São 30 minutos de conversa pra alinhar serviço, preço e horário. Depois disso você volta a cortar e o zap se vira sozinho.",
    },
    {
      q: "Meu cliente é fiel, não preciso disso.",
      a: "Ótimo sinal, quer dizer que você entrega bem. Só que fidelidade é hábito, e hábito quebra fácil: o cara muda de bairro, muda de horário, ou simplesmente não é respondido naquele dia. O sistema segura esse cliente sem você precisar lembrar. É o que você já faz hoje, só que sozinho.",
    },
    {
      q: "Quanto custa?",
      a: "É um setup único mais uma mensalidade, com preço fechado pra sua barbearia e sem letra miúda. Pra te dar uma régua: evitar 4 furos por semana já paga o sistema inteiro, com o corte a R$45. O valor exato eu te passo junto com a conta da sua barbearia, no diagnóstico.",
    },
    {
      q: "Vocês vão mexer no meu número?",
      a: "Seu número continua seu, no seu celular, e você continua usando normal. A gente conecta como se fosse mais um aparelho, igual ao WhatsApp Web. Se der qualquer problema de conexão, o problema é nosso: a gente resolve e assume o custo, não repassa pra você.",
    },
    {
      q: "O cliente vai perceber que não é uma pessoa?",
      a: "Ele percebe que foi atendido rápido, isso sim. A conversa é treinada com a sua linguagem, os seus serviços e o seu jeito, e nunca inventa preço que não esteja no seu cardápio. Quando o assunto sai do script, cai direto pra você. Quer ver como fica a conversa?",
    },
    {
      q: "E se eu quiser sair?",
      a: "Sai. O primeiro mês tem garantia: se não trouxer resultado que dê pra medir, você cancela sem multa. Não trabalho com contrato que prende cliente insatisfeito.",
    },
    {
      q: "Vocês já fizeram isso pra quem?",
      a: "A gente tá começando aqui em Brasília e escolhendo as barbearias com cuidado, porque prefiro poucos clientes bem atendidos a case inventado. Por isso o primeiro mês tem garantia: em vez de te mostrar o caso dos outros, prefiro te mostrar rodando no seu.",
    },
    {
      q: "Preciso falar com meu sócio ou com minha esposa.",
      a: "Claro. Te mando um resumo de uma página, com a conta feita em cima dos seus números, pra vocês olharem juntos. Vocês costumam conversar sobre a barbearia no domingo?",
    },
    {
      q: "Atendem fora de Brasília?",
      a: "Hoje não, só Brasília e o DF. E isso é escolha: a gente visita, instala presencialmente e acompanha de perto. Se você é de fora, manda mensagem mesmo, que eu te aviso quando a gente chegar na sua cidade.",
    },
  ];
((window.PROBLEMS = PROBLEMS),
  (window.WA_SCRIPT = WA_SCRIPT),
  (window.FAILURES = FAILURES),
  (window.STEPS = STEPS),
  (window.METRICS = METRICS),
  (window.CASES = CASES),
  (window.DIFFS = DIFFS),
  (window.OPERATORS = OPERATORS),
  (window.FAQS = FAQS));
