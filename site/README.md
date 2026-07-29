# Site institucional — Blade Mídia

Landing de vendas da agência. **Estático puro**: nada de build, bundler ou `npm install`
pra rodar. Abre `index.html` no navegador e funciona. Publica no Netlify a cada push
na `main` que toque `site/` (workflow `.github/workflows/deploy-site.yml`).

## Antes de mexer em qualquer texto desta pasta

**Toda a copy do site é normatizada pelos 3 guias estratégicos oficiais:**

| Guia | O que consultar |
|---|---|
| [Guia da Dor](../docs/business/dor-central.md) | qual problema cada bloco ataca e a hierarquia (uma tese: zap sem operador; duas provas: no-show e cliente sumido) |
| [Guia da Persona](../docs/business/persona-icp.md) | para quem o texto fala, o que ele teme, o que o faz desconfiar |
| [Guia de COPY](../docs/business/guia-de-copy.md) | **§ 13.1 mapeia este site bloco a bloco** (função da copy em cada seção); §§ 7-8 tom e léxico; § 11 headlines e CTAs; § 14 checklist |

Regras que valem para todo texto em `data.js` e nas seções:

- **Uma tese por página** — "seu zap fica sem ninguém e você perde cliente sem saber".
- **Nunca** as palavras banidas (§ 8.2): lead, funil, conversão, CRM, plataforma, solução,
  dashboard, ROI, otimizar…
- **Todo número com a âncora do cálculo à vista**; projeção rotulada como projeção
  (campo `meta2` nos `CASES`, `sub` nos `METRICS`).
- **Ticket de referência oficial: corte R$30-55, médio R$45** — qualquer conta exibida usa
  essa base.
- **Regra da absolvição**: o inimigo é a situação (mão ocupada), nunca o barbeiro.
- Rodar o checklist de 10 pontos (§ 14 do Guia de COPY) antes do push.

## Como a página é montada

React (via CDN unpkg) renderizando com `React.createElement` — **sem JSX**, porque não há
build step. `index.html` carrega os scripts nesta ordem (a ordem importa: cada arquivo
registra seus componentes em `window`, e `app.js` os consome no fim):

```
react + react-dom (CDN)
tweaks-panel.js   → painel de ajuste de tema (dev), hooks useTweaks/useReveal
data.js           → conteúdo/copy em constantes (PROBLEMS, WA_SCRIPT, STEPS, CASES, FAQS…)
sections-top.js   → Nav, Marquee, Problem, WhatsAppDemo
sections-mid.js   → Agenda, Process, Metrics, Differentiator
sections-bot.js   → Cases, FAQ, Operators (desativado), CTA, Footer
app.js            → HeroSwap + App (monta a árvore) + helpers de cor
```

Todo o CSS vive inline no `<style>` do `index.html` (tokens do design system em `:root`).

## Formatação

Padrão fixado em `.prettierrc.json` (printWidth 100). Antes de commitar mudanças em JS:

```bash
npx prettier@3 --write "*.js"
```

Os arquivos já estiveram minificados numa linha só no passado — não deixe voltar a esse
estado; sempre rode o Prettier.

## Débito técnico conhecido (candidato a refactor — decisão do Vítor)

- **Verbosidade do `React.createElement`**: sem JSX, cada elemento é uma chamada aninhada.
  Legível depois do Prettier, mas prolixo. Migrar pra JSX exigiria um build step (Vite) ou
  Babel Standalone no browser — muda a natureza "estático puro" do site. Parked até decisão.
- **Nomes de variável de 1 letra** (`n`, `e`, `a`) remanescentes da minificação anterior —
  o Prettier não renomeia. Trocar por nomes reais é seguro mas manual, feito aos poucos.
- **`operators-*` e `Operators()`** existem mas estão fora do render (ver `sections-bot.js`).
