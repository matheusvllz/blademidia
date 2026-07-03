# ADR-0001: TypeScript + Node.js em monolito modular (monorepo)

## Status
Proposto (2026-07-03)

## Contexto
Time técnico de 1 pessoa (Vítor), desenvolvimento fortemente assistido por IA, produto com painel web + automações de mensageria + IA. Orçamento de infra limitado (D4).

## Decisão
Uma única linguagem — **TypeScript** sobre **Node.js 22 LTS** — para painel, API, worker e pacotes de domínio, organizados como **monolito modular** em monorepo **pnpm workspaces**. Fronteiras de módulo seguem as capabilities do produto.

## Justificativa
- Uma linguagem só elimina troca de contexto para um dev solo e permite compartilhar tipos entre painel, API e worker (contratos verificados em compile-time).
- O ecossistema Node é o mais maduro para as integrações centrais do produto: bibliotecas WhatsApp (SDK oficial Meta, Evolution/Baileys são Node-nativas) e SDK Anthropic de primeira classe.
- Agentes de IA de código têm desempenho excelente em TypeScript (volume de treino), o que acelera o modo de trabalho real do projeto.
- Monolito modular: um deploy, uma base de dados, refatoração barata — com módulos extraíveis caso um dia haja demanda real de escala independente.

## Vantagens
Velocidade de desenvolvimento; tipos ponta a ponta; um pipeline de CI; um artefato de deploy; contratação futura fácil (TS é ubíquo).

## Desvantagens / Trade-offs
- Node é single-thread por processo — CPU-bound pesado não é o forte (não é o perfil deste produto: I/O de mensagens e chamadas de API).
- Monolito exige disciplina de fronteiras (mitigado: fronteiras = capabilities, revisadas no checklist do avaliador).

## Custo
Zero de licenciamento; roda no VPS de D4.

## Escalabilidade
Vertical no VPS até centenas de barbearias (o gargalo real será WhatsApp/LLM, não o app). Horizontal futura: múltiplas réplicas do worker consumindo a mesma fila — já suportado pelo desenho (pg-boss).

## Alternativas consideradas
- **Python (FastAPI/Django)** — ótimo para IA, mas painel React exigiria segunda linguagem; libs WhatsApp menos maduras. Rejeitada.
- **PHP/Laravel** — produtividade alta, mas quebraria a unificação de tipos com o front e o ecossistema WhatsApp/IA é mais fraco. Rejeitada.
- **Go** — performance excelente, desnecessária aqui; desenvolvimento mais lento para CRUD+UI. Rejeitada.
- **Microservices desde o início** — complexidade operacional incompatível com time de 1 e orçamento de D4. Rejeitada.

## Consequências
Todo código novo em TS estrito; estrutura de monorepo definida no overview; a primeira change de implementação cria o esqueleto.
