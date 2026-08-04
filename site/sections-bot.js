function Cases() {
  return React.createElement(
    "section",
    { className: "sec", id: "casos", "data-screen-label": "Cases" },
    React.createElement(
      "div",
      { className: "container" },
      React.createElement(
        "div",
        { className: "sec-head" },
        React.createElement("div", { className: "eyebrow reveal" }, "09 · Isso é pra você?"),
        React.createElement(
          "h2",
          { className: "reveal d1" },
          "Existe uma conta",
          React.createElement("br", null),
          "pro tamanho da ",
          React.createElement("span", null, "sua barbearia"),
        ),
        React.createElement(
          "p",
          { className: "sub reveal d2" },
          "São três portes, três contas, todas com a base à vista: corte entre R$30 e R$55, média de R$45. São projeções do modelo, e quando existir resultado medido, ele entra aqui no lugar.",
        ),
      ),
      React.createElement(
        "div",
        { className: "case-grid" },
        window.CASES.map((a, e) =>
          React.createElement(
            "div",
            { className: "case reveal", style: { transitionDelay: `${e * 0.08}s` }, key: a.id },
            React.createElement(
              "div",
              { className: "case-top" },
              React.createElement("span", { className: "case-id" }, a.id),
              React.createElement("span", { className: "case-region" }, a.region),
            ),
            React.createElement(
              "div",
              { className: "case-num" },
              a.numSplit[0],
              React.createElement("span", null, a.numSplit[1]),
              a.numSplit[2],
            ),
            React.createElement("div", { className: "case-title" }, a.title),
            React.createElement("div", { className: "case-quote" }, '"', a.quote, '"'),
            React.createElement(
              "div",
              { className: "case-meta" },
              React.createElement("span", null, React.createElement("strong", null, a.meta1)),
              React.createElement("span", null, a.meta2),
            ),
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          className: "reveal",
          style: {
            marginTop: 48,
            padding: "24px 28px",
            background: "#fff",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--gold)",
            borderRadius: "0 4px 4px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 18,
          },
        },
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            {
              style: {
                fontFamily: "'Space Mono',monospace",
                fontSize: 10,
                color: "var(--gold)",
                letterSpacing: ".16em",
                textTransform: "uppercase",
                marginBottom: 6,
              },
            },
            "FASE DE VALIDAÇÃO",
          ),
          React.createElement(
            "div",
            {
              style: {
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700,
                fontSize: 22,
                textTransform: "uppercase",
                lineHeight: 1.2,
                color: "var(--ink)",
              },
            },
            "Selecionando as primeiras barbearias parceiras de Brasília agora.",
          ),
        ),
        React.createElement(
          "a",
          { href: "#contato", className: "btn btn-ink" },
          "Quero ser uma das primeiras →",
        ),
      ),
    ),
  );
}
function FAQ() {
  const [a, e] = React.useState(0);
  return React.createElement(
    "section",
    { className: "sec", id: "faq", "data-screen-label": "FAQ" },
    React.createElement(
      "div",
      { className: "container", style: { maxWidth: 920 } },
      React.createElement(
        "div",
        { className: "sec-head" },
        React.createElement(
          "div",
          { className: "eyebrow reveal" },
          "11 · As perguntas que o barbeiro faz mesmo",
        ),
        React.createElement(
          "h2",
          { className: "reveal d1" },
          "Sem rodeio,",
          React.createElement("br", null),
          "do mesmo jeito que a gente responde ",
          React.createElement("span", null, "ao vivo"),
        ),
        React.createElement(
          "p",
          { className: "sub reveal d2" },
          "As perguntas abaixo são as mais comuns nas reuniões com barbeiros. A gente responde do mesmo jeito que responde ao vivo, sem rodeio e sem forçar venda.",
        ),
      ),
      React.createElement(
        "div",
        { className: "faq reveal" },
        window.FAQS.map((r, o) =>
          React.createElement(
            "div",
            { className: "faq-item" + (a === o ? " open" : ""), key: o },
            React.createElement(
              "button",
              { className: "faq-q", onClick: () => e(a === o ? -1 : o) },
              React.createElement("span", null, r.q),
              React.createElement("span", { className: "ic" }, "+"),
            ),
            React.createElement("div", { className: "faq-a" }, React.createElement("p", null, r.a)),
          ),
        ),
      ),
    ),
  );
}
function Operators() {
  return React.createElement(
    "section",
    { className: "sec sec-dk", id: "equipe", "data-screen-label": "Quem opera" },
    React.createElement(
      "div",
      { className: "container" },
      React.createElement(
        "div",
        { className: "sec-head" },
        React.createElement("div", { className: "eyebrow reveal" }, "10 · Quem responde por isso"),
        React.createElement(
          "h2",
          { className: "reveal d1" },
          "Duas pessoas com nome,",
          React.createElement("br", null),
          "não um ",
          React.createElement("span", null, "call center"),
        ),
        React.createElement(
          "p",
          { className: "sub reveal d2" },
          "Serviço operado precisa de alguém do outro lado quando dá problema. Aqui são dois sócios, com nome, rosto e WhatsApp direto, e é sempre um dos dois que te responde.",
        ),
      ),
      React.createElement(
        "div",
        { className: "operators-wrap" },
        window.OPERATORS.map((o, i) =>
          React.createElement(
            "div",
            { className: "operator reveal", style: { transitionDelay: `${i * 0.08}s` }, key: o.id },
            React.createElement(
              "div",
              { className: "operator-top" },
              React.createElement("div", { className: "operator-mono" }, o.mono),
              React.createElement("div", { className: "operator-id" }, "OPERADOR · ", o.id),
            ),
            React.createElement(
              "div",
              null,
              React.createElement("div", { className: "operator-name" }, o.name),
              React.createElement("span", { className: "operator-role" }, o.role),
            ),
            React.createElement("p", { className: "operator-line" }, o.line),
          ),
        ),
      ),
    ),
  );
}
function CTA() {
  const [a, e] = React.useState({ nome: "", barbearia: "", zap: "" }),
    [r, o] = React.useState(!1);
  function s(i) {
    if ((i.preventDefault(), !a.nome || !a.zap)) return;
    const t = new URLSearchParams({
      "form-name": "diagnostico",
      nome: a.nome,
      barbearia: a.barbearia,
      whatsapp: a.zap,
    }).toString();
    (fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: t,
    }).catch(() => {}),
      o(!0));
    try {
      window.open("https://ig.me/m/blademidia.br", "_blank", "noopener");
    } catch {}
  }
  return React.createElement(
    "section",
    { className: "sec sec-dk", id: "contato", "data-screen-label": "CTA" },
    React.createElement(
      "div",
      { className: "container", style: { maxWidth: 1100 } },
      React.createElement(
        "div",
        { className: "cta-wrap" },
        React.createElement(
          "div",
          { className: "cta-inner" },
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { className: "eyebrow reveal", style: { color: "var(--gold)" } },
              "12 · Próximo passo",
            ),
            React.createElement(
              "h2",
              { className: "reveal d1", style: { marginTop: 24 } },
              "Descubra quanto",
              React.createElement("br", null),
              "o seu ",
              React.createElement("span", null, "zap"),
              React.createElement("br", null),
              "tá te custando",
            ),
            React.createElement(
              "p",
              {
                className: "reveal d2",
                style: {
                  color: "var(--wire)",
                  fontSize: 17,
                  maxWidth: "46ch",
                  marginTop: 24,
                  lineHeight: 1.55,
                },
              },
              "Responde três coisas aqui embaixo e eu te devolvo, no seu zap, uma conta com os seus números: quanto a sua barbearia deixa na mesa por mês entre mensagem sem resposta e horário que fura. Leva 1 minuto, sem apresentação de 40 slides. Se não fizer sentido pra sua casa, eu falo isso na hora, antes de cobrar qualquer coisa.",
            ),
            React.createElement(
              "div",
              { className: "cta-meta reveal d3", style: { marginTop: 36 } },
              React.createElement("strong", null, "GARANTIA"),
              " · primeiro mês, cancela sem multa",
              React.createElement("br", null),
              React.createElement("strong", null, "SETUP"),
              ' · 72h do "fechei" ao zap rodando',
              React.createElement("br", null),
              React.createElement("strong", null, "SEU NÚMERO"),
              " · continua seu, no seu celular",
            ),
          ),
          React.createElement(
            "div",
            { className: "cta-side reveal d2" },
            r
              ? React.createElement(
                  "div",
                  {
                    style: {
                      background: "rgba(201,168,76,.08)",
                      border: "1px solid rgba(201,168,76,.3)",
                      borderRadius: 6,
                      padding: "40px 28px",
                      textAlign: "center",
                    },
                  },
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 10,
                        color: "var(--gold)",
                        letterSpacing: ".2em",
                        textTransform: "uppercase",
                      },
                    },
                    "RECEBIDO",
                  ),
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontFamily: "'Barlow Condensed',sans-serif",
                        fontWeight: 800,
                        fontSize: 34,
                        color: "var(--chalk)",
                        textTransform: "uppercase",
                        lineHeight: 1.05,
                        margin: "18px 0 14px",
                      },
                    },
                    a.nome.split(" ")[0] || "Beleza",
                    ",",
                    React.createElement("br", null),
                    "fica de olho no seu ",
                    React.createElement("span", { style: { color: "var(--gold)" } }, "zap"),
                  ),
                  React.createElement(
                    "div",
                    {
                      style: {
                        color: "var(--wire)",
                        fontSize: 14,
                        lineHeight: 1.5,
                        marginBottom: 20,
                      },
                    },
                    "Vou montar a conta com os números da sua barbearia e te chamar no WhatsApp. Se quiser adiantar, chama a gente no ",
                    React.createElement(
                      "strong",
                      { style: { color: "var(--chalk)" } },
                      "Instagram",
                    ),
                    " agora, é o mesmo atendimento.",
                  ),
                  React.createElement(
                    "a",
                    {
                      href: "https://ig.me/m/blademidia.br",
                      target: "_blank",
                      rel: "noopener",
                      className: "btn btn-gold",
                      style: { justifyContent: "center" },
                    },
                    "Chamar no Instagram →",
                  ),
                )
              : React.createElement(
                  "form",
                  {
                    onSubmit: s,
                    style: {
                      background: "rgba(255,255,255,.04)",
                      border: "1px solid rgba(255,255,255,.08)",
                      borderRadius: 6,
                      padding: "28px 26px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      backdropFilter: "blur(8px)",
                    },
                  },
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 10,
                        color: "var(--gold)",
                        letterSpacing: ".18em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      },
                    },
                    "Diagnóstico gratuito · leva 1 minuto",
                  ),
                  React.createElement(Field, {
                    label: "Seu nome",
                    value: a.nome,
                    onChange: (i) => e({ ...a, nome: i }),
                    placeholder: "Ex: Rafael",
                  }),
                  React.createElement(Field, {
                    label: "Nome da barbearia",
                    value: a.barbearia,
                    onChange: (i) => e({ ...a, barbearia: i }),
                    placeholder: "Ex: Casa do Corte",
                  }),
                  React.createElement(Field, {
                    label: "Seu WhatsApp",
                    value: a.zap,
                    onChange: (i) => e({ ...a, zap: i }),
                    placeholder: "(61) 9 9999-9999",
                  }),
                  React.createElement(
                    "button",
                    {
                      type: "submit",
                      className: "btn btn-gold",
                      style: { justifyContent: "center", marginTop: 8 },
                    },
                    "Quero ver a conta da minha barbearia →",
                  ),
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontFamily: "'Space Mono',monospace",
                        fontSize: 9.5,
                        color: "var(--wire)",
                        letterSpacing: ".1em",
                        textAlign: "center",
                        marginTop: 4,
                      },
                    },
                    "SEM SPAM · SEM LIGAÇÃO DE VENDEDOR · A GENTE TE CHAMA NO ZAP",
                  ),
                ),
          ),
        ),
      ),
    ),
  );
}
function Field({ label: a, value: e, onChange: r, placeholder: o }) {
  return React.createElement(
    "label",
    { style: { display: "flex", flexDirection: "column", gap: 6 } },
    React.createElement(
      "span",
      {
        style: {
          fontFamily: "'Space Mono',monospace",
          fontSize: 9,
          color: "var(--wire)",
          letterSpacing: ".14em",
          textTransform: "uppercase",
        },
      },
      a,
    ),
    React.createElement("input", {
      type: "text",
      value: e,
      onChange: (s) => r(s.target.value),
      placeholder: o,
      style: {
        background: "transparent",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,.18)",
        color: "var(--chalk)",
        fontFamily: "'Barlow',sans-serif",
        fontSize: 16,
        padding: "10px 0 8px",
        outline: "none",
        width: "100%",
      },
      onFocus: (s) => (s.target.style.borderBottomColor = "var(--gold)"),
      onBlur: (s) => (s.target.style.borderBottomColor = "rgba(255,255,255,.18)"),
    }),
  );
}
function Footer() {
  return React.createElement(
    "footer",
    { "data-screen-label": "Footer" },
    React.createElement(
      "div",
      { className: "foot-inner" },
      React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { className: "foot-brand" },
          "BLADE",
          React.createElement("span", { className: "dot" }, "."),
          "MÍDIA",
        ),
        React.createElement(
          "div",
          { className: "foot-tag" },
          "Atendimento operado pra barbearia. Brasília · DF. Est. 2025.",
        ),
      ),
      React.createElement(
        "div",
        { className: "foot-col" },
        React.createElement("h5", null, "O sistema"),
        React.createElement(
          "ul",
          null,
          React.createElement(
            "li",
            null,
            React.createElement("a", { href: "#problema" }, "O problema"),
          ),
          React.createElement(
            "li",
            null,
            React.createElement("a", { href: "#sistema" }, "Como funciona"),
          ),
          React.createElement("li", null, React.createElement("a", { href: "#casos" }, "A conta")),
          React.createElement("li", null, React.createElement("a", { href: "#faq" }, "Perguntas")),
        ),
      ),
      React.createElement(
        "div",
        { className: "foot-col" },
        React.createElement("h5", null, "Falar com a gente"),
        React.createElement(
          "ul",
          null,
          React.createElement(
            "li",
            null,
            React.createElement("a", { href: "#contato" }, "Ver meu diagnóstico"),
          ),
          React.createElement(
            "li",
            null,
            React.createElement(
              "a",
              { href: "https://ig.me/m/blademidia.br", target: "_blank", rel: "noopener" },
              "Chamar no Instagram",
            ),
          ),
          React.createElement(
            "li",
            null,
            React.createElement(
              "a",
              { href: "https://instagram.com/blademidia.br", target: "_blank", rel: "noopener" },
              "@blademidia.br",
            ),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "foot-col" },
        React.createElement("h5", null, "Manifesto"),
        React.createElement(
          "ul",
          null,
          React.createElement(
            "li",
            { style: { fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.55 } },
            '"Não vendemos divulgação. A gente resolve o atendimento."',
          ),
        ),
      ),
    ),
    React.createElement(
      "div",
      { className: "foot-bottom" },
      React.createElement(
        "div",
        null,
        "© 2026 Blade.Mídia · Atendimento operado pra barbearia · Brasília / DF",
      ),
      React.createElement("div", null, "@blademidia.br"),
    ),
  );
}
Object.assign(window, { Cases, FAQ, Operators, CTA, Footer });
