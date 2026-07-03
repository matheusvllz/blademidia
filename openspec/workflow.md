# Fluxo de Desenvolvimento — Spec-Driven Development

> Regra absoluta: **nenhuma implementação acontece antes da aprovação da especificação.**

## O fluxo obrigatório

Toda funcionalidade segue exatamente estas etapas, nesta ordem:

```text
Ideia → Refinamento → Discussão → Spec → Validação → Arquitetura
      → Plano técnico → Implementação → Testes → Revisão → Conclusão
```

### Mapeamento etapa → artefato

| Etapa | O que acontece | Artefato produzido |
|---|---|---|
| 1. Ideia | A ideia é registrada com um `change-id` (kebab-case, curto e descritivo) | `openspec/changes/<change-id>/exploration.md` (seção "Ideia original" preenchida) |
| 2. Refinamento | Exploração crítica: problema real, atores, casos de uso, regras, riscos, premissas, perguntas bloqueantes | `exploration.md` completo |
| 3. Discussão | Perguntas bloqueantes são respondidas pelos sócios; respostas registradas | `exploration.md` atualizado (seção "Decisões da discussão") |
| 4. Spec | Proposal + deltas de specs por capability, com requisitos verificáveis | `proposal.md` + `specs/<capability>/spec.md` |
| 5. Validação | Revisão humana da spec. **Portão obrigatório**: sem aprovação, nada avança | `proposal.md` com `Status: Approved` |
| 6. Arquitetura | Decisões técnicas, trade-offs, fluxos, dados, segurança | `design.md` (+ ADR em `docs/architecture/decisions/` se a decisão for transversal) |
| 7. Plano técnico | Decomposição em tarefas pequenas, sequenciais e verificáveis | `tasks.md` |
| 8. Implementação | Branch `feature/<change-id>`; tarefas executadas em ordem, marcadas com evidência | Código + `tasks.md` atualizado |
| 9. Testes | Cada tarefa validada conforme seu campo `Validation`; suíte completa passa | Testes no repositório |
| 10. Revisão | Pull request + checklist do avaliador ([docs/sdd/04-checklist-avaliador.md](../docs/sdd/04-checklist-avaliador.md)) | PR aprovado |
| 11. Conclusão | Deltas aplicados às specs permanentes; change arquivada; merge na `main` | `openspec/specs/` atualizado; change movida para `changes/archive/` |

## Ciclo de vida de uma change (campo `Status` do proposal.md)

```text
Draft → Proposed → Approved → In Progress → In Review → Done
```

- **Draft** — exploração em andamento; perguntas bloqueantes abertas.
- **Proposed** — proposal e specs escritos, aguardando validação.
- **Approved** — spec validada; design/tasks podem ser produzidos e a implementação pode começar após tasks aprovadas.
- **In Progress** — implementação em andamento na branch da change.
- **In Review** — PR aberto; checklist do avaliador em execução.
- **Done** — mergeado, specs permanentes atualizadas, change arquivada.

Uma change pode ser **Rejected** ou **Superseded** em qualquer ponto — registre o motivo no proposal e arquive.

## Regras de parada (herdadas do método)

Não avance de etapa se:

- o problema real não estiver claro;
- houver contradição de escopo ou requisito crítico dependente de decisão não tomada;
- riscos altos não tiverem mitigação ou aceite explícito;
- a mudança puder quebrar contrato, dados ou segurança sem decisão explícita.

Pode avançar com **premissas marcadas** se a ambiguidade não afetar comportamento central, a decisão for reversível e o artefato deixar claro o que validar depois.

## Definition of Done (DoD)

Uma change só é **Done** quando TODOS os itens abaixo forem verdadeiros:

- [ ] Todas as tarefas do `tasks.md` concluídas ou explicitamente canceladas, cada uma com evidência de validação;
- [ ] Checklist do avaliador ([docs/sdd/04](../docs/sdd/04-checklist-avaliador.md)) aprovado;
- [ ] Testes automatizados relevantes passam (unit, integração e contrato quando aplicável);
- [ ] Nenhum comportamento fora da spec foi adicionado sem justificativa registrada;
- [ ] Deltas aplicados às specs permanentes em `openspec/specs/<capability>/spec.md`;
- [ ] Migração de dados reversível ou com mitigação documentada (quando houver);
- [ ] Logs/observabilidade implementados quando especificados;
- [ ] Dados sensíveis não aparecem em logs; segredos não hardcoded;
- [ ] `CHANGELOG.md` atualizado;
- [ ] Change arquivada em `openspec/changes/archive/<change-id>/`.

## Estratégia de branches

Trunk-based simplificado — adequado a time de 1 dev + agentes de IA:

- **`main`** — sempre estável e implantável. Protegida: só recebe código via PR.
- **`feature/<change-id>`** — uma branch por change, criada a partir da `main` somente após tasks aprovadas. Vida curta (dias, não semanas).
- **`fix/<descricao-curta>`** — correções pequenas fora do fluxo completo (ver "Fluxo leve" abaixo).
- Merge por **squash**, mensagem final referenciando o change-id.

### Commits

Padrão [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(agendamento): cria endpoint de disponibilidade de horários [add-scheduling]
fix(whatsapp-canal): trata timeout do provedor no envio
chore: atualiza dependências
```

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`. Escopo = capability afetada. Sufixo `[<change-id>]` em commits de features.

## Versionamento

- **SemVer** com `v0.x.y` até o primeiro cliente em produção (`v1.0.0`).
- `MINOR` = nova capability ou change funcional concluída; `PATCH` = correções.
- Tag de release na `main` + entrada no `CHANGELOG.md` ([Keep a Changelog](https://keepachangelog.com/pt-BR/)).

## Fluxo leve (exceção controlada)

Para mudanças triviais — typo, ajuste de copy, bump de dependência, correção óbvia de bug sem mudança de comportamento especificado — o fluxo completo é dispensado:

1. Branch `fix/...` → commit → PR → merge.
2. **Critério objetivo**: se a mudança altera qualquer comportamento descrito em uma spec, exige regra de negócio nova, toca dados ou integrações — **não é trivial**, e o fluxo completo se aplica.
3. Na dúvida, trate como change.

## Regras para criação de novas funcionalidades

1. Toda funcionalidade nasce como uma change em `openspec/changes/<change-id>/`.
2. O `change-id` é kebab-case, curto, orientado ao resultado (`add-appointment-confirmation`, não `feature-123`).
3. Uma change afeta uma ou poucas capabilities; se afetar muitas, quebre em changes menores.
4. Specs descrevem **comportamento observável** — decisões técnicas ficam no `design.md`.
5. Requisitos usam linguagem normativa (`SHALL`/`MUST`/`SHOULD`/`MAY`) e cenários GIVEN/WHEN/THEN — ver [conventions.md](conventions.md).
6. Agentes de IA que implementam uma change devem ler, nesta ordem: `project.md` → `proposal.md` → specs da change → `design.md` → `tasks.md`. Nunca inventar requisitos.
