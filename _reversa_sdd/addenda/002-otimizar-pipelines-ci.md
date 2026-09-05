<!--
Adendo de convergência do ciclo forward gerado por /reversa-sync em 2026-09-05.
Feature: 002-otimizar-pipelines-ci.
-->

# Adendo — 002-otimizar-pipelines-ci

> Identificador: `002-otimizar-pipelines-ci`
> Cenário: **legado**
> Data: `2026-09-05`

## Vigência

Vigente desde 2026-09-05.

## Resumo da entrega

A feature auditou os três workflows GitHub Actions (`main.yml`, `pr.yml`, `publish.yml`) e aplicou as correções de maior impacto priorizadas pelo critério combinado tempo/custo + risco de entrega em PR (RF-01.1): criou o workflow reutilizável `check.yml` (removendo o job de checagem duplicado entre main e PR), adicionou build (tsup) ao gate de CI, desacoplou a checagem dos jobs de label/validação de título (`needs` removido), introduziu `concurrency` com cancelamento de runs antigos, padronizou versões de actions em `@v6` com Node via `.node-version`, ativou cache npm no publish, adicionou timeouts (15 min) a todos os jobs e corrigiu o PR template. Todas as 11 ações (T001–T011) do ciclo forward foram concluídas com sucesso. Baseline local proxy: `npm ci` 7.79s, `npm run check` 4.31s, `npm run build` 4.11s.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|----------|-------|-----------------|-------|
| `_reversa_sdd/architecture.md` | `## 2. Stack` (CI) | regra-alterada | O gate de CI agora inclui `npm run build` no push de main e em PR e roda a checagem em paralelo com label/título no PR; versões das actions alinhadas em `@v6` e Node lido de `.node-version` (fonte única `22.14.0`) |
| `_reversa_sdd/architecture.md` | `## 6. Componentes` | componente-novo | Existe o workflow reutilizável `.github/workflows/check.yml` consumido por `main.yml` (upload-coverage: true) e `pr.yml` (upload-coverage: false); antes a checagem existia duplicada inline nos dois |
| `_reversa_sdd/inventory.md` | workflows/ (`main.yml`, `pr.yml`, `publish.yml`) | regra-alterada | `pr.yml` ganhou `concurrency` com `cancel-in-progress`, removeu `needs` e timeouts; `publish.yml` usa `node-version-file` + cache npm + timeout; `main.yml` delega ao `check.yml` |

## Regras sob vigilância

- W001 — ver `_reversa_forward/002-otimizar-pipelines-ci/regression-watch.md`
- W002 — ver `_reversa_forward/002-otimizar-pipelines-ci/regression-watch.md`
- W003 — ver `_reversa_forward/002-otimizar-pipelines-ci/regression-watch.md`
- W004 — ver `_reversa_forward/002-otimizar-pipelines-ci/regression-watch.md`
- W005 — ver `_reversa_forward/002-otimizar-pipelines-ci/regression-watch.md`
- W006 — ver `_reversa_forward/002-otimizar-pipelines-ci/regression-watch.md`

## Fontes

- `_reversa_forward/002-otimizar-pipelines-ci/legacy-impact.md`
- `_reversa_forward/002-otimizar-pipelines-ci/regression-watch.md`
- `_reversa_forward/002-otimizar-pipelines-ci/requirements.md`
- `_reversa_forward/002-otimizar-pipelines-ci/roadmap.md`
- `_reversa_forward/002-otimizar-pipelines-ci/actions.md`
- `_reversa_forward/002-otimizar-pipelines-ci/progress.jsonl`
- `_reversa_forward/002-otimizar-pipelines-ci/pipeline-audit.md`