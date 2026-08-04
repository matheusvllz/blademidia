function Agenda() {
  const a = ["SEG", "TER", "QUA", "QUI", "SEX"],
    n = [12, 13, 14, 15, 16],
    d = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"],
    r = [
      [0, 0, "Pedro", "corte"],
      [0, 2, "Lucas", "barba"],
      [0, 4, "João", "corte+barba"],
      [0, 7, "Rafael", "degradê"],
      [1, 1, "Marcelo", "barba"],
      [1, 3, "Henrique", "corte"],
      [1, 5, "Bruno", "corte+barba"],
      [2, 0, "Diego", "corte"],
      [2, 2, "Felipe", "degradê"],
      [2, 4, "André", "barba"],
      [2, 6, "Vinícius", "corte"],
      [3, 1, "Tiago", "corte+barba"],
      [3, 3, "Caio", "barba"],
      [3, 5, "Murilo", "corte"],
      [4, 2, "Léo", "corte"],
      [4, 4, "Gustavo", "barba"],
    ],
    c = [
      [0, 5, "Rodrigo", "corte"],
      [3, 7, "Eduardo", "degradê"],
      [4, 6, "Daniel", "corte+barba"],
      [2, 7, "Lucas R.", "corte"],
      [1, 7, "Thales", "barba"],
      [4, 0, "Igor", "corte"],
    ],
    [l, m] = React.useState([]);
  React.useEffect(() => {
    let e = 0,
      s = !0;
    function o() {
      if (s)
        if (e < c.length) {
          const t = c[e];
          (m((i) => [...i, t]), e++, setTimeout(o, 1400));
        } else
          setTimeout(() => {
            s && (m([]), (e = 0), setTimeout(o, 1200));
          }, 3e3);
    }
    return (
      setTimeout(o, 1e3),
      () => {
        s = !1;
      }
    );
  }, []);
  const v = [...r, ...l].filter(Boolean),
    p = a.length * d.length,
    u = v.length,
    N = Math.round((u / p) * 100);
  function g(e, s) {
    const o = v.find((i) => i[0] === e && i[1] === s);
    if (!o) return null;
    const t = l.includes(o);
    return { name: o[2], svc: o[3], isNew: t };
  }
  return React.createElement(
    "section",
    { className: "sec", "data-screen-label": "Agenda" },
    React.createElement(
      "div",
      { className: "container" },
      React.createElement(
        "div",
        { className: "agenda-wrap" },
        React.createElement(
          "div",
          { className: "agenda reveal" },
          React.createElement(
            "div",
            { className: "agenda-hd" },
            React.createElement("div", { className: "title" }, "Agenda · Semana 12/05"),
            React.createElement(
              "div",
              { className: "nav-arrows" },
              React.createElement("button", null, "‹"),
              React.createElement("button", null, "›"),
            ),
          ),
          React.createElement(
            "div",
            { className: "agenda-week" },
            React.createElement("div", { className: "agenda-hd-spacer" }),
            a.map((e, s) =>
              React.createElement(
                "div",
                { className: "day" + (s === 2 ? " today" : ""), key: e },
                e,
                React.createElement("strong", null, n[s]),
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "agenda-grid" },
            d.map((e, s) =>
              React.createElement(
                React.Fragment,
                { key: e },
                React.createElement("div", { className: "agenda-time" }, e),
                a.map((o, t) => {
                  const i = g(t, s);
                  return React.createElement(
                    "div",
                    {
                      className: "agenda-slot" + (i?.isNew ? " new" : "") + (i ? "" : " empty"),
                      key: t + "-" + s,
                    },
                    i &&
                      React.createElement(
                        "div",
                        { className: "booking" },
                        React.createElement("span", { className: "name" }, i.name),
                        React.createElement("span", { className: "svc" }, i.svc),
                      ),
                  );
                }),
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "agenda-foot" },
            React.createElement(
              "span",
              null,
              "OCUPAÇÃO · ",
              React.createElement("strong", null, u, "/", p),
            ),
            React.createElement("span", { className: "pill" }, N, "% CHEIA"),
          ),
        ),
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { className: "eyebrow reveal" },
            "05 · Confirmação automática",
          ),
          React.createElement(
            "h2",
            {
              className: "reveal d1",
              style: {
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 900,
                fontSize: "clamp(36px,5vw,56px)",
                textTransform: "uppercase",
                lineHeight: 0.95,
                margin: "18px 0 20px",
                letterSpacing: "-.018em",
              },
            },
            "Cada horário",
            React.createElement("br", null),
            "se confirma",
            React.createElement("br", null),
            React.createElement("span", { className: "gold" }, "sozinho"),
          ),
          React.createElement(
            "p",
            {
              className: "reveal d2",
              style: {
                color: "var(--smoke)",
                fontSize: 16,
                lineHeight: 1.6,
                marginBottom: 14,
                maxWidth: "42ch",
              },
            },
            "24h antes do horário, o sistema pergunta se o cliente vem. Quem não responde libera o horário e o próximo da fila já é avisado. A agenda se ajeita sozinha enquanto você tá com a máquina na mão.",
          ),
          React.createElement(
            "p",
            {
              className: "reveal d3",
              style: { color: "var(--smoke)", fontSize: 16, lineHeight: 1.6, maxWidth: "42ch" },
            },
            "Com o corte a R$45, 8 furos por semana dão R$1.440 por mês de cadeira parada em horário bom. A meta do primeiro mês é derrubar isso pra 1 ou 2 por semana.",
          ),
          React.createElement(
            "div",
            { className: "price-bar reveal d4" },
            React.createElement(
              "div",
              null,
              React.createElement("div", { className: "l" }, "META DO PRIMEIRO MÊS · POR SEMANA"),
              React.createElement(
                "div",
                { className: "h" },
                "8 furos → ",
                React.createElement("span", null, "1"),
                " furo / semana",
              ),
            ),
            React.createElement(
              "div",
              {
                style: {
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 900,
                  fontSize: 42,
                  color: "var(--gold)",
                  lineHeight: 1,
                  letterSpacing: "-.02em",
                },
              },
              "−87%",
            ),
          ),
        ),
      ),
    ),
  );
}
function WhyOthersFail() {
  return React.createElement(
    "section",
    { className: "sec", "data-screen-label": "Por que o resto falha" },
    React.createElement(
      "div",
      { className: "container", style: { maxWidth: 920 } },
      React.createElement(
        "div",
        { className: "sec-head" },
        React.createElement("div", { className: "eyebrow reveal" }, "03 · Você já tentou"),
        React.createElement(
          "h2",
          { className: "reveal d1" },
          "Você já tentou de tudo,",
          React.createElement("br", null),
          "e tudo te deu ",
          React.createElement("span", null, "mais trabalho"),
        ),
        React.createElement(
          "p",
          { className: "sub reveal d2" },
          "Todas as saídas que existem por aí precisam de duas coisas que uma barbearia não tem: alguém sobrando pra operar, e um cliente disposto a mudar o jeito dele de mandar mensagem.",
        ),
      ),
      React.createElement(
        "div",
        { className: "fail-list" },
        window.FAILURES.map((f, i) =>
          React.createElement(
            "div",
            { className: "fail-row reveal", style: { transitionDelay: `${i * 0.06}s` }, key: i },
            React.createElement("div", { className: "name" }, f.title),
            React.createElement("div", { className: "why" }, f.body),
          ),
        ),
      ),
      React.createElement(
        "p",
        {
          className: "reveal",
          style: {
            marginTop: 40,
            fontFamily: "'Barlow Condensed',sans-serif",
            fontWeight: 700,
            fontSize: "clamp(20px,2.4vw,26px)",
            textTransform: "uppercase",
            color: "var(--ink)",
            lineHeight: 1.25,
          },
        },
        "Você não precisa de mais gente chegando, precisa parar de perder quem já chega.",
      ),
    ),
  );
}
function Process() {
  return React.createElement(
    "section",
    { className: "sec sec-dk", "data-screen-label": "Processo" },
    React.createElement(
      "div",
      { className: "container" },
      React.createElement(
        "div",
        { className: "sec-head" },
        React.createElement("div", { className: "eyebrow reveal" }, "06 · Como funciona"),
        React.createElement(
          "h2",
          { className: "reveal d1" },
          "Três coisas acontecendo",
          React.createElement("br", null),
          "sem você ",
          React.createElement("span", null, "mexer em nada"),
        ),
        React.createElement(
          "p",
          { className: "sub reveal d2" },
          "A gente não entrega um sistema pra você aprender a usar. A gente instala, treina com o jeito da sua casa e opera. Se você tiver que mexer em alguma coisa pra funcionar, quer dizer que a gente falhou.",
        ),
      ),
      React.createElement(
        "div",
        { className: "process-list" },
        window.STEPS.map((a, n) =>
          React.createElement(
            "div",
            { className: "step reveal", style: { transitionDelay: `${n * 0.08}s` }, key: a.num },
            React.createElement("div", { className: "step-num" }, a.num),
            React.createElement(
              "div",
              { className: "step-main" },
              React.createElement("h4", null, a.h),
              React.createElement("p", null, a.p),
            ),
            React.createElement(
              "div",
              { className: "step-detail" },
              React.createElement("span", { className: "label" }, a.label),
              React.createElement(
                "ul",
                null,
                a.bullets.map((d, r) => React.createElement("li", { key: r }, d)),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
function Metrics() {
  return React.createElement(
    "section",
    { className: "sec", "data-screen-label": "Métricas" },
    React.createElement(
      "div",
      { className: "container" },
      React.createElement(
        "div",
        { className: "sec-head" },
        React.createElement("div", { className: "eyebrow reveal" }, "07 · O que a gente persegue"),
        React.createElement(
          "h2",
          { className: "reveal d1" },
          "Aqui é meta,",
          React.createElement("br", null),
          "não ",
          React.createElement("span", null, "média inventada"),
        ),
        React.createElement(
          "p",
          { className: "sub reveal d2" },
          "A gente é nova nisso e não tem histórico inflado pra te mostrar. São as metas que o sistema foi construído pra bater, cada uma com a conta à vista. Quando a primeira barbearia completar 30 dias, o número real entra no lugar da meta.",
        ),
      ),
      React.createElement(
        "div",
        { className: "metrics" },
        window.METRICS.map((a, n) =>
          React.createElement(
            "div",
            { className: "metric reveal", style: { transitionDelay: `${n * 0.08}s` }, key: n },
            React.createElement("div", { className: "lbl" }, "▍ ", a.lbl),
            React.createElement(
              "div",
              { className: "num" },
              React.createElement("span", { className: "gold" }, a.num),
            ),
            React.createElement("div", { className: "sub" }, a.sub),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "price-bar reveal", style: { maxWidth: 760, margin: "40px auto 0" } },
        React.createElement(
          "div",
          null,
          React.createElement("div", { className: "l" }, "A conta que fecha a decisão"),
          React.createElement(
            "div",
            { className: "h" },
            "Evitar ",
            React.createElement("span", null, "4 furos"),
            " por semana já paga o sistema inteiro",
          ),
        ),
      ),
    ),
  );
}
function Differentiator() {
  return React.createElement(
    "section",
    { className: "sec sec-dkr", "data-screen-label": "Diferencial" },
    React.createElement(
      "div",
      { className: "container" },
      React.createElement(
        "div",
        { className: "diff-wrap" },
        React.createElement(
          "div",
          { className: "diff-mark" },
          React.createElement("span", { className: "badge reveal" }, "08 · Posicionamento"),
          React.createElement(
            "h3",
            { className: "reveal d1" },
            "SÓ",
            React.createElement("br", null),
            React.createElement("span", { className: "gold" }, "BARBEARIA"),
          ),
          React.createElement(
            "p",
            { className: "reveal d2" },
            'A gente não atende "qualquer negócio" pra depois adaptar o texto. Encaixe, corte com barba, o parceiro que trabalha na comissão, o sábado que lota: já conhecemos esse vocabulário e essas regras de cor. Especialização não é discurso, é o que faz o seu cliente não perceber diferença.',
          ),
          React.createElement(
            "div",
            {
              className: "reveal d3",
              style: {
                padding: "18px 0 0",
                borderTop: "1px solid rgba(255,255,255,.08)",
                width: "100%",
                fontFamily: "'Space Mono',monospace",
                fontSize: 11,
                color: "var(--wire)",
                letterSpacing: ".1em",
              },
            },
            React.createElement(
              "strong",
              { style: { color: "var(--gold)", fontWeight: 400 } },
              "O QUE NÃO ATENDEMOS:",
            ),
            React.createElement("br", null),
            "Salão misto · Estética · Franquias e redes · Barbearia com recepção própria · Quem procura divulgação",
          ),
        ),
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { className: "diff-cols-head reveal" },
            React.createElement("div", null, "O de sempre"),
            React.createElement("div", null, "Blade Mídia"),
          ),
          React.createElement(
            "div",
            { className: "diff-list" },
            window.DIFFS.map((a, n) =>
              React.createElement(
                "div",
                {
                  className: "diff-row reveal",
                  style: { transitionDelay: `${n * 0.06}s` },
                  key: n,
                },
                React.createElement("div", { className: "col them" }, a[0]),
                React.createElement("div", { className: "col us" }, a[1]),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
Object.assign(window, { Agenda, WhyOthersFail, Process, Metrics, Differentiator });
