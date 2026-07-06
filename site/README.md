# Site institucional — Blade Mídia

Landing de vendas da agência. **Estático puro**: nada de build, bundler ou `npm install`
pra rodar. Abre `index.html` no navegador e funciona. Publica no Netlify a cada push
na `main` que toque `site/` (workflow `.github/workflows/deploy-site.yml`).

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
