function useReveal() {
  React.useEffect(() => {
    const a = document.querySelectorAll(".reveal:not(.in)"),
      e = new IntersectionObserver(
        (i) => {
          i.forEach((t) => {
            t.isIntersecting && (t.target.classList.add("in"), e.unobserve(t.target));
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
      );
    return (a.forEach((i) => e.observe(i)), () => e.disconnect());
  });
}
function Nav() {
  const [a, e] = React.useState(!1);
  return (
    React.useEffect(() => {
      const i = () => e(window.scrollY > 32);
      return (
        window.addEventListener("scroll", i, { passive: !0 }),
        () => window.removeEventListener("scroll", i)
      );
    }, []),
    React.createElement(
      "nav",
      { className: "nav" + (a ? " scrolled" : "") },
      React.createElement(
        "a",
        { href: "#top", className: "nav-logo" },
        "BLADE",
        React.createElement("span", { className: "dot" }, "."),
        "MÍDIA",
      ),
      React.createElement(
        "div",
        { className: "nav-links" },
        React.createElement("a", { href: "#problema" }, "O problema"),
        React.createElement("a", { href: "#sistema" }, "Como funciona"),
        React.createElement("a", { href: "#casos" }, "A conta"),
        React.createElement("a", { href: "#faq" }, "Perguntas"),
        React.createElement("a", { href: "#contato", className: "nav-cta" }, "Ver meu diagnóstico"),
      ),
    )
  );
}
function Marquee() {
  const a = [
      "Quem não foi respondido não reclama, só não volta",
      "Mesmo número, mesma conversa, respondida na hora",
      "Um atendente que não sai da cadeira",
      "Não é a crise, é o seu zap",
      "Você fecha a barbearia e o zap continua trabalhando",
      "Só barbearia · Só Brasília · Sem você mexer em nada",
    ],
    e = [...a, ...a];
  return React.createElement(
    "div",
    { className: "marquee", "aria-hidden": "true" },
    React.createElement(
      "div",
      { className: "marquee-track" },
      e.map((i, t) => React.createElement("span", { key: t, className: "marquee-item" }, i)),
    ),
  );
}
function Problem() {
  return (
    useReveal(),
    React.createElement(
      "section",
      { className: "sec", id: "problema", "data-screen-label": "Problema" },
      React.createElement(
        "div",
        { className: "container" },
        React.createElement(
          "div",
          { className: "sec-head" },
          React.createElement(
            "div",
            { className: "eyebrow reveal" },
            "01 · O que acontece todo dia",
          ),
          React.createElement(
            "h2",
            { className: "reveal d1" },
            "A cadeira vazia não é falta de cliente,",
            React.createElement("br", null),
            "é falta de ",
            React.createElement("span", null, "resposta"),
          ),
          React.createElement(
            "p",
            { className: "sub reveal d2" },
            'São 14h. Chega um "oi, tem horário pra amanhã?" e você tá com a máquina na mão. Pensa em responder assim que terminar o corte, mas só lembra às 17h30. Quando responde, o cara já cortou em outro lugar, e ele nunca vai te contar isso.',
          ),
        ),
        React.createElement(
          "div",
          { className: "problem-grid" },
          window.PROBLEMS.map((a, e) =>
            React.createElement(
              "div",
              { className: "prob reveal", style: { transitionDelay: `${e * 0.08}s` }, key: a.num },
              React.createElement("div", { className: "prob-num" }, "▍ ", a.num),
              React.createElement("div", { className: "prob-title" }, a.title),
              React.createElement("div", { className: "prob-body" }, a.body),
              React.createElement(
                "div",
                { className: "prob-anchor" },
                React.createElement("div", { className: "num" }, a.num2),
                React.createElement("div", { className: "calc" }, a.anchor, " · ", a.anchorLabel),
              ),
            ),
          ),
        ),
      ),
    )
  );
}
function Absolution() {
  return (
    useReveal(),
    React.createElement(
      "section",
      { className: "sec sec-dk", "data-screen-label": "Absolvição" },
      React.createElement(
        "div",
        { className: "container", style: { maxWidth: 920 } },
        React.createElement(
          "div",
          { className: "sec-head" },
          React.createElement("div", { className: "eyebrow reveal" }, "02 · Antes de continuar"),
          React.createElement(
            "h2",
            { className: "reveal d1" },
            "Não é desorganização sua,",
            React.createElement("br", null),
            "é que ninguém corta e responde ",
            React.createElement("span", null, "ao mesmo tempo"),
          ),
          React.createElement(
            "p",
            { className: "sub reveal d2" },
            "Você é quem produz e quem vende, ao mesmo tempo. Quando escolhe terminar o degradê em vez de olhar o celular, você tá tomando a decisão certa, porque a hora cortando vale mais. É por isso que esse buraco nunca se fecha sozinho.",
          ),
          React.createElement(
            "p",
            { className: "sub reveal d3", style: { marginTop: 4 } },
            "Seu atendimento na cadeira é ótimo. O problema tá no atendimento de antes da cadeira.",
          ),
        ),
        React.createElement(
          "div",
          { className: "band-ink reveal d4" },
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { className: "l" },
              "A pergunta que ninguém consegue responder",
            ),
            React.createElement(
              "div",
              { className: "q" },
              "Quantos clientes você perdeu esse mês sem saber?",
            ),
            React.createElement(
              "div",
              { className: "d" },
              "Furo você consegue contar. Agora mensagem que morreu sem resposta, não tem como. É justamente aí que mora a maior parte do prejuízo.",
            ),
          ),
          React.createElement(
            "a",
            { href: "#contato", className: "btn btn-gold" },
            "Quero ver o número da minha barbearia →",
          ),
        ),
      ),
    )
  );
}
function WhatsAppDemo() {
  const [a, e] = React.useState(0),
    [i, t] = React.useState(!1),
    [v, m] = React.useState(0),
    r = React.useRef(null),
    c = window.WA_SCRIPT;
  return (
    React.useEffect(() => {
      let s = !1;
      (e(0), t(!1));
      async function d() {
        for (let o = 0; o < c.length; o++) {
          if (s) return;
          const n = c[o];
          if (n.type === "msg" && n.side === "out") {
            if ((t(!0), await l(900), s)) return;
            t(!1);
          }
          (e(o + 1), await l(n.type === "badge" ? 600 : 1200));
        }
      }
      function l(o) {
        return new Promise((n) => setTimeout(n, o));
      }
      return (
        d(),
        () => {
          s = !0;
        }
      );
    }, [v]),
    React.useEffect(() => {
      r.current && (r.current.scrollTop = r.current.scrollHeight);
    }, [a, i]),
    React.createElement(
      "section",
      { className: "sec sec-dk", id: "sistema", "data-screen-label": "Demo WhatsApp" },
      React.createElement(
        "div",
        { className: "container" },
        React.createElement(
          "div",
          { className: "demo-wrap" },
          React.createElement(
            "div",
            { className: "demo-copy" },
            React.createElement("div", { className: "eyebrow" }, "04 · Veja funcionando"),
            React.createElement(
              "h3",
              null,
              "Um atendente",
              React.createElement("br", null),
              "dentro do seu ",
              React.createElement("span", null, "zap"),
              React.createElement("br", null),
              "respondendo na hora",
            ),
            React.createElement(
              "p",
              null,
              "A gente coloca um atendente dentro do WhatsApp que a barbearia já usa. Mesmo número, mesma conversa, mesmo jeito de falar. Seu cliente manda mensagem como sempre mandou e agora tem alguém ali pra responder.",
            ),
            React.createElement(
              "p",
              null,
              "Ele mostra os horários que existem de verdade, marca, salva o cliente e confirma um dia antes. Quando o assunto foge do script, cai pra você na hora. O cliente não percebe diferença nenhuma, só percebe que foi atendido rápido.",
            ),
            React.createElement(
              "div",
              { className: "stat-row" },
              React.createElement(
                "div",
                null,
                React.createElement("div", { className: "num" }, "00:08"),
                React.createElement("div", { className: "lbl" }, "Tempo de resposta"),
              ),
              React.createElement(
                "div",
                null,
                React.createElement("div", { className: "num" }, "24h"),
                React.createElement("div", { className: "lbl" }, "O zap atendido"),
              ),
              React.createElement(
                "div",
                null,
                React.createElement("div", { className: "num" }, "0"),
                React.createElement("div", { className: "lbl" }, "Coisas pra você fazer"),
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "wa", "aria-label": "Simulação WhatsApp" },
            React.createElement(
              "div",
              { className: "wa-bar" },
              React.createElement("div", { className: "wa-avatar" }, "B"),
              React.createElement(
                "div",
                { style: { flex: 1 } },
                React.createElement("div", { className: "wa-name" }, "Barbearia · Atendimento"),
                React.createElement("div", { className: "wa-status" }, "online · Blade Mídia"),
              ),
              React.createElement(
                "div",
                { style: { display: "flex", gap: 14, color: "#8696A0", fontSize: 18 } },
                React.createElement("span", null, "📞"),
                React.createElement("span", null, "⋮"),
              ),
            ),
            React.createElement(
              "div",
              { className: "wa-body", ref: r },
              c
                .slice(0, a)
                .map((s, d) =>
                  s.type === "badge"
                    ? React.createElement("div", { key: d, className: "wa-badge" }, s.text)
                    : React.createElement(
                        "div",
                        { key: d, className: "wa-msg " + s.side },
                        s.text,
                        React.createElement(
                          "div",
                          { className: "t" },
                          s.t,
                          " ",
                          s.side === "out" &&
                            React.createElement("span", { className: "wa-tick" }, "✓✓"),
                        ),
                      ),
                ),
              i &&
                React.createElement(
                  "div",
                  { className: "wa-typing" },
                  React.createElement("span", null),
                  React.createElement("span", null),
                  React.createElement("span", null),
                ),
            ),
            React.createElement(
              "div",
              { className: "wa-foot" },
              React.createElement("span", null, "😊"),
              React.createElement("div", { className: "field" }, "Mensagem"),
              React.createElement("span", null, "🎤"),
            ),
            React.createElement(
              "button",
              { className: "wa-replay", onClick: () => m((s) => s + 1), title: "Replay" },
              "↻",
            ),
          ),
        ),
        React.createElement(
          "div",
          { className: "demo-bar", style: { maxWidth: 760, margin: "48px auto 0" } },
          React.createElement("div", { className: "dot" }),
          "SIMULAÇÃO · MESMA CONVERSA, MESMO NÚMERO · VOCÊ CONTINUA CORTANDO",
        ),
      ),
    )
  );
}
Object.assign(window, { Nav, Marquee, Problem, Absolution, WhatsAppDemo, useReveal });
