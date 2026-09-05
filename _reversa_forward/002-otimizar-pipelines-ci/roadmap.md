<!--
Roadmap gerado por /reversa-plan em 2026-09-05. Feature: 002-otimizar-pipelines-ci.
Escreve como DELTA sobre o legado. Estado parcial já aplicado durante o clarify (check.yml criado).
-->

# Roadmap: Otimizar pipelines CI (cache de dependências e melhorias nos workflows)

> Identificador: `002-otimizar-pipelines-ci`
> Data: `2026-09-05`
> Requirements: `_reversa_forward/002-otimizar-pipelines-ci/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Refatorar a camada de CI/GitHub Actions do projeto como delta sobre o que existe hoje (`.github/workflows/main.yml`, `pr.yml`, `publish.yml`). O núcleo é a criação de um workflow reutilizável `check.yml` (já criado durante o clarify via `workflow_call`, encapsulando lint + typecheck + testes com cobertura + build tsup), usado por `main.yml` (com upload Codecov) e `pr.yml` (sem upload). A partir dele: (a) unificar a versão das actions (`checkout`/`setup-node` → `@v6`) e do Node (`22.14.0` via `.node-version`), (b) adicionar `concurrency` com `cancel-in-progress` no `pr.yml`, (c) desacoplar o job de checagem de `label`/`validate-title` para rodar em paralelo, (d) ativar `cache: npm` também no `publish.yml`, (e) adicionar `timeout-minutes` a todos os jobs, e (f) produzir a auditoria `pipeline-audit.md` com a priorização combinada (tempo/custo + risco de entrega em PR). Nenhuma mudança no código TypeScript do servidor MCP.

## 2. Princípios aplicados

Nenhum arquivo `.reversa/principles.md` existe no projeto. Não há princípios registrados para avaliar; a seção é marcada como vazia e fica como ponto de atenção para `/reversa-principles` se o usuário quiser formalizá-los.

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| (nenhum registrado) | — | n/a |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Criar workflow reutilizável `.github/workflows/check.yml` com `on: workflow_call` e input `upload-coverage` (bool), usado via `uses: ./.github/workflows/check.yml` | Elimina a duplicação byte a byte do job `lint-test` entre main/pr (RF-05); ponto único para evoluir a checagem | Composite action (`.github/actions/`): mais código para manter e menos convencional para fluxos "bank" de checagem; workflow duplicado (status quo): drift garantido | 🟢 |
| D-02 | Alinhar `actions/checkout` e `actions/setup-node` para `@v6` nos 3 workflows | `publish.yml` já usa `@v6`; unificar no major mais recente reduz superfície de manutenção (RF-07). Decisão do clarify: alinhar majors, sem pinning SHA | Manter `@v4` em tudo: jogava fora a versão mais nova já validada no publish | 🟡 |
| D-03 | Padronizar Node em `22.14.0` via arquivo `.node-version` e `node-version-file` nos 3 workflows | Hoje main/pr usam `22` flutuante e publish `22.14.0`; pinning num único arquivo dá reprodutibilidade (RF-08) | Manter `22` flutuante: risco de run reprodutível quando o 22.x muda no runner | 🟢 |
| D-04 | Adicionar `concurrency` (grupo `pipeline-${{ github.ref }}`) com `cancel-in-progress: true` no `pr.yml` | Dois pushes ao mesmo PR não devem rodar o suite inteiro em duplicata (RF-03) | `concurrency` global por workflow sem grupo: cancelava runs de PRs diferentes | 🟢 |
| D-05 | Remover `needs: [label, validate-title]` do job de checagem no `pr.yml` para executar em paralelo | Label e validação de título são rápidos e independentes; serializar a checagem atrás deles atrasa o feedback (RF-04) | Lista de `needs` só com `validate-title`: ainda impunha espera desnecessária | 🟢 |
| D-06 | Incluir `npm run build` (tsup) no passo da checagem reutilizável | `npm run check` não valida build; PR podia passar e quebrar o artefato (RF-06) | Adicionar build só no publish: tarde demais, risco no merge | 🟢 |
| D-07 | Ativar `cache: npm` no `setup-node` do `publish.yml` (remover `package-manager-cache: false`) | Consistência da abordagem A de cache (RF-02 e RN-03) | Manter sem cache no publish: run raro, ganho baixo, mas inconsistente | 🟢 |
| D-08 | Adicionar `timeout-minutes` (15) a todos os jobs dos workflows | Evita hangs com custo aberto em runner (RF-09) | Sem timeout: custo imprevisível | 🟢 |
| D-09 | Corrigir `.github/pull_request_template.md`: `npm run type-check` → `npm run typecheck` | Script inexistente na template (RF-11) | Manter: contribuidor roda comando que falha | 🟢 |

## 4. Premissas

Nenhuma `[DÚVIDA]` pendente no `requirements.md` — todas resolvidas na sessão de esclarecimento de 2026-09-05. Sem premissas assumidas.

| Premissa | Origem (`requirements.md` seção) | Risco se errada |
|----------|----------------------------------|-----------------|
| (nenhuma) | — | — |

## 5. Delta arquitetural

A mudança é inteiramente na camada de CI (`architecture.md#Stack: CI = GitHub Actions`). Nenhum componente do runtime do servidor MCP é afetado.

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| CI — workflows | `_reversa_sdd/architecture.md#Stack` | componente-alterado | `main.yml`, `pr.yml`, `publish.yml` refatorados; novo `check.yml` reutilizável |
| CI — cache de dependências | `_reversa_sdd/inventory.md#CI/CD` | contrato-alterado | `cache: npm` consistente nos 3 workflows, chaveado por lockfile |
| CI — checagem | `_reversa_sdd/inventory.md#CI/CD` | contrato-alterado | `npm run check` + `npm run build` no ponto único; Codecov só em main |

## 6. Delta no modelo de dados

- Resumo das mudanças: sem modelo de dados. Nenhuma tabela, schema, campo ou migração. O `.node-version` é arquivo de configuração de ambiente, não dado de aplicação.
- Detalhe completo em: `_reversa_forward/002-otimizar-pipelines-ci/data-delta.md`

## 7. Delta de contratos externos

Sem contratos HTTP/fila/grpc/GraphQL afetados. A integração externa é o GitHub Actions (config declarativa). Não gera arquivos em `interfaces/`.

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| (nenhum) | — | — |

## 8. Plano de migração

1. Criar `.node-version` com `22.14.0` na raiz.
2. Adicionar `cache: npm` (ou `package-manager-cache`) ao `setup-node` do `publish.yml` e trocar `node-version: 22.14.0` por `node-version-file: .node-version`.
3. Atualizar `main.yml` e `pr.yml`: `setup-node@v4` → `@v6`, `node-version: 22` → `node-version-file: .node-version`.
4. Atualizar `check.yml`: `node-version-file: .node-version`, manter build e timeout.
5. Adicionar `concurrency` no `pr.yml` (RF-03).
6. Remover `needs: [label, validate-title]` da checagem no `pr.yml` (RF-04).
7. Adicionar `timeout-minutes` nos jobs de `label`, `validate-title` e do publish (RF-09).
8. Corrigir `pull_request_template.md` (RF-11).
9. Gerar `pipeline-audit.md` com auditoria priorizada dos 3 workflows e melhorias futuras registradas (cache node_modules, pinning SHA, Codecov em PR).
10. Registrar baseline de tempo dos runs atuais antes de aplicar e medir após (RNF Desempenho).

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| `setup-node@v6` mudar comportamento do cache em relação ao `@v4` | médio | médio | Validar no primeiro run da PR de implementação (logs de cache hit) |
| `cancel-in-progress` cancelar run legítimo por rapididade entre pushes | baixo | médio | Grupo de `concurrency` por ref (`github.ref`) isola PRs diferentes; cancelamento entre pushes do mesmo branch é o comportamento desejado |
| `.node-version` divergir da versão usada na máquina de dev | baixo | baixo | Documentar no `onboarding.md`; engines já exige `>=22` |
| Build (`npm run build`) em `prebuild` roda eslint+tsc e pode tornar o run mais lento no PR | baixo | alto | É propósito (valida artefato); aceitar custo pequeno; medir no baseline pós-mudança |
| Migração das actions quebrar alguma opção específica (`@v6` vs `@v4`) | médio | baixo | PR de implementação auto-valida; reverter para `@v4` é 1 line por arquivo |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `.github/workflows/check.yml`, `main.yml`, `pr.yml`, `publish.yml` consistentes (actions `@v6`, Node via `.node-version`, timeout, concurrency)
- [ ] `npm run check` e `npm run build` passam localmente (mesmo conjunto que a CI roda)
- [ ] `pipeline-audit.md` gerado com priorização combinada (tempo/custo + risco em PR)
- [ ] Baseline de tempo registrado antes da mudança e comparação pós-mudança
- [ ] `regression-watch.md` gerado
- [ ] Re-extração reversa executada e sem regressão vermelha (recomendado, não obrigatório)

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-09-05 | Versão inicial gerada por `/reversa-plan` | reversa |