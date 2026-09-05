<!--
Actions gerado por /reversa-to-do em 2026-09-05. Feature: 002-otimizar-pipelines-ci.
Decomposto a partir de _reversa_forward/002-otimizar-pipelines-ci/roadmap.md.
Nota: o check.yml reutilizável e a religação de main.yml/pr.yml já foram aplicados na sessão de clarify;
as ações abaixo cobrem o restante do delta (versões, node, concurrency, decoupling, publish, timeouts, audit).
-->

# Actions: Otimizar pipelines CI (cache de dependências e melhorias nos workflows)

> Identificador: `002-otimizar-pipelines-ci`
> Data: `2026-09-05`
> Roadmap: `_reversa_forward/002-otimizar-pipelines-ci/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 11 |
| Paralelizáveis (`[//]`) | 9 |
| Maior cadeia de dependência | 3 |

## Fase 1, Preparação

<!-- Setup, scaffolding, configuração de infraestrutura local. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Criar `.node-version` na raiz com conteúdo `22.14.0` (fonte única de versão do Node para os 3 workflows) | - | `[//]` | `.node-version` | 🟢 | `[X]` |
| T002 | Registrar baseline de tempo dos runs atuais (mediana de ≥3 runs reais do job `check` em `main`/PR) num esqueleto de `pipeline-audit.md`, com seção Baseline e metodologia (P00 refere mediana) | - | `[//]` | `pipeline-audit.md` | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Smoke do pipeline npm: mesmo conjunto que a CI roda, antes de mexer nos workflows. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Validar localmente `npm ci` + `npm run check` + `npm run build` com sucesso (baseline verde local antes das mudanças; registra também o tempo do `npm ci` para a auditoria) | - | `[//]` | `package.json` | 🟢 | `[X]` |

## Fase 3, Núcleo

<!-- Delta nos workflows: versões de actions/Node e decoupling. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Atualizar `check.yml`: `checkout@v4`→`@v6`, `setup-node@v4`→`@v6`, `node-version: 22`→`node-version-file: .node-version` (mantém `cache: npm`, build e timeout 15) | T001 | `[//]` | `.github/workflows/check.yml` | 🟡 | `[X]` |
| T005 | Atualizar `publish.yml`: `node-version: 22.14.0`→`node-version-file: .node-version`, ativar cache npm (`package-manager-cache: false`→`true`), manter `checkout@v6`/`setup-node@v6` | T001 | `[//]` | `.github/workflows/publish.yml` | 🟢 | `[X]` |
| T006 | Adicionar `concurrency` no `pr.yml` (grupo `pipeline-${{ github.ref }}`) com `cancel-in-progress: true` | - | `[//]` | `.github/workflows/pr.yml` | 🟢 | `[X]` |
| T007 | Remover `needs: [label, validate-title]` do job `lint-test` no `pr.yml` (desacoplar a checagem para rodar em paralelo com label/título) | T006 | `-` | `.github/workflows/pr.yml` | 🟢 | `[X]` |

## Fase 4, Integração

<!-- Timeouts e alinhamento final entre workflows. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T008 | Adicionar `timeout-minutes: 15` aos jobs `label` e `validate-title` no `pr.yml` | T006, T007 | `-` | `.github/workflows/pr.yml` | 🟢 | `[X]` |
| T009 | Adicionar `timeout-minutes: 15` ao job `publish` no `publish.yml` (job atual sem timeout) | T005 | `[//]` | `.github/workflows/publish.yml` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Auditoria, correção de template e telemetria. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T010 | Corrigir `.github/pull_request_template.md`: trocar referência `npm run type-check` por `npm run typecheck` (script inexistente) | - | `[//]` | `.github/pull_request_template.md` | 🟢 | `[X]` |
| T011 | Gerar `pipeline-audit.md` completo: auditoria priorizada dos 3 workflows (critério combinado tempo/custo + risco em PR), seções por workflow, melhorias futuras registradas (cache node_modules C/D, pinning SHA, Codecov em PR), tabela de comparação pós-baseline (preenchida após runs reais) | T002 | `[//]` | `pipeline-audit.md` | 🟢 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
-->

- T004 não altera `main.yml`: ele apenas chama `check.yml` (sem setup-node próprio); a versão das actions vive em `check.yml` e `publish.yml`.
- T006/T007/T008 tocam o mesmo arquivo (`pr.yml`), por isso formam a cadeia serial T006→T007→T008.
- T003 recomenda cronometrar `npm ci` em wall-clock para alimentar a auditoria.
- A comparação pós-mudança depende de runs reais do GitHub (após o push); o `/reversa-coding` preenche o que puder e o usuário confirma os tempos pós-run.

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-09-05 | Versão inicial gerada por `/reversa-to-do` | reversa |