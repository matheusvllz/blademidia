# Convenções de Escrita, Documentação e Código

## Idioma

- **Artefatos SDD** (exploration, proposal, design, tasks): PT-BR.
- **Requisitos**: PT-BR com palavras-chave normativas em inglês maiúsculo (estilo RFC 2119): `SHALL`, `MUST`, `SHOULD`, `MAY`, `SHALL NOT`, `MUST NOT`.
- **Cenários**: palavras-chave `GIVEN` / `WHEN` / `THEN` / `AND` em inglês; descrição em PT-BR.
- **Código**: identificadores, nomes de arquivos e mensagens de commit em inglês. Textos exibidos ao usuário em PT-BR (via camada de textos, nunca hardcoded espalhado).
- **UI**: vocabulário do barbeiro — "cliente", "horário", "agenda", "zap". Proibido no produto: "lead", "funil", "CRM" (na UI diga "clientes"), "conversão", "churn". **Lista completa de palavras banidas, tabela de tradução obrigatória e regras de microcopy (estados vazios, mensagens automáticas ao cliente final): [docs/business/guia-de-copy.md](../docs/business/guia-de-copy.md) §§ 8 e 13.9 — fonte oficial para qualquer texto exibido ao usuário.**

## Qualidade de requisitos

Todo requisito deve ser: necessário, atômico, claro, não ambíguo, factível, **verificável** e rastreável a um objetivo/regra/risco.

Proibido sem métrica: *rápido, robusto, escalável, simples, fácil, seguro, intuitivo, performático, resiliente*. Transforme em critério verificável.

```text
❌ O bot deve responder rápido.
✅ O sistema SHALL enviar a primeira resposta ao cliente em até 10 segundos (p95)
   após o recebimento da mensagem no WhatsApp.
```

### Formato de requisito (em specs)

```markdown
### Requirement: <nome curto do comportamento>
O sistema SHALL <comportamento obrigatório, observável e verificável>.

#### Scenario: <caminho feliz>
- GIVEN <estado inicial>
- WHEN <ação/evento>
- THEN <resultado observável>
- AND <efeito adicional, se houver>

#### Scenario: <erro ou exceção>
- GIVEN ...
- WHEN ...
- THEN ...
```

Cenários mínimos a considerar em toda spec: caminho feliz; entrada inválida; permissão insuficiente; recurso inexistente; estado conflitante; concorrência; falha de integração externa (WhatsApp/IA fora do ar); timeout; limite de volume; auditoria/log esperado.

## Classificação de afirmações

Em qualquer artefato, nunca apresente suposição como fato. Classifique:

- **Fato** — confirmado por documento ou pelos sócios;
- **Premissa** — assumido para avançar; marcado para validação;
- **Decisão proposta** — aguardando aprovação;
- **Ponto em aberto** — precisa de resposta;
- **Risco** — com impacto, probabilidade e mitigação.

## Organização documentação × arquitetura × implementação

| Tipo de conteúdo | Onde vive |
|---|---|
| Comportamento do sistema (contrato) | `openspec/specs/<capability>/spec.md` |
| Mudanças em andamento | `openspec/changes/<change-id>/` |
| Decisão técnica de uma change | `design.md` da change |
| Decisão técnica transversal (stack, padrões, infra) | ADR em `docs/architecture/decisions/` |
| Visão geral da arquitetura | `docs/architecture/overview.md` |
| Contexto de negócio | `openspec/project.md` + `docs/business/` |
| Como rodar/operar o sistema | `README.md` + `docs/operations/` (quando existir) |

Regra: **spec não contém implementação; design não contém requisito novo.** Se durante o design surgir um requisito, volte e atualize a spec (com re-validação se já aprovada).

## ADRs (Architecture Decision Records)

- Arquivo: `docs/architecture/decisions/ADR-XXXX-titulo-kebab.md` (numeração sequencial).
- Seções: Status (Proposto/Aceito/Substituído por ADR-YYYY) · Contexto · Decisão · Justificativa · Vantagens · Desvantagens/Trade-offs · Custo · Escalabilidade · Alternativas consideradas · Consequências.
- Um ADR nunca é editado após Aceito para mudar a decisão — cria-se um novo que o substitui.

## Nomenclatura

| Item | Padrão | Exemplo |
|---|---|---|
| change-id | kebab-case, orientado a resultado | `add-client-reactivation` |
| capability | kebab-case, substantivo do domínio | `agendamento`, `whatsapp-canal` |
| branch | `feature/<change-id>` ou `fix/<desc>` | `feature/add-client-reactivation` |
| Tabelas do banco | snake_case plural | `appointments`, `barbershop_clients` |
| Arquivos TS | kebab-case | `appointment-service.ts` |
| Componentes React | PascalCase | `AppointmentCard.tsx` |
| Variáveis de ambiente | SCREAMING_SNAKE | `WHATSAPP_PROVIDER`, `ANTHROPIC_API_KEY` |

## Padrões de código (a detalhar quando a implementação começar)

- TypeScript `strict: true` sempre; sem `any` não justificado.
- Validação de entrada em toda fronteira do sistema (webhooks, API, formulários) — Zod.
- Todo acesso a dados passa pela camada de repositório com escopo de tenant obrigatório (ver ADR-0007).
- Segredos apenas via variáveis de ambiente; `.env` nunca commitado (`.env.example` sim).
- Logs estruturados (JSON) com `tenant_id` e correlação; **nunca** logar conteúdo de mensagens de clientes finais nem tokens.
- Comentários apenas para restrições que o código não expressa; código autoexplicativo primeiro.
