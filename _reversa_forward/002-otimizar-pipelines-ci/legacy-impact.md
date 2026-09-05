<!--
legacy-impact.md gerado por /reversa-coding em 2026-09-05.
Feature: 002-otimizar-pipelines-ci.
-->

# Legacy Impact — 002-otimizar-pipelines-ci

> Data: `2026-09-05`
> Identificador: `002-otimizar-pipelines-ci`

## Arquivos afetados

| Arquivo | Componente (architecture.md) | Tipo | Severidade | Justificativa |
|---------|------------------------------|------|------------|---------------|
| `.github/workflows/check.yml` | CI (GitHub Actions, §Components) | componente-novo | MEDIUM | Workflow reutilizável criado no clarify e evoluído (T004): `checkout@v6`, `setup-node@v6`, `node-version-file`. Unifica o job de checagem antes duplicado em main/pr. |
| `.github/workflows/main.yml` | CI (GitHub Actions) | regra-alterada | LOW | Job inline substituído por `uses: ./.github/workflows/check.yml` com `upload-coverage: true`. |
| `.github/workflows/pr.yml` | CI (GitHub Actions) | regra-alterada | MEDIUM | `concurrency` + `cancel-in-progress`; `needs` removido (checagem paralela); timeouts 15 nos jobs label/validate-title. |
| `.github/workflows/publish.yml` | CI (GitHub Actions) | regra-alterada | LOW | `node-version-file: .node-version`, cache npm ativado, `timeout-minutes: 15`. |
| `.node-version` | CI (GitHub Actions) | componente-novo | LOW | Fonte única da versão do Node (22.14.0) consumida pelos 3 workflows. |
| `.github/pull_request_template.md` | CI (GitHub Actions) | regra-alterada | LOW | Referência ao script inexistente `npm run type-check` corrigida para `npm run typecheck`. |
| `_reversa_forward/002-otimizar-pipelines-ci/pipeline-audit.md` | single-file document | componente-novo | LOW | Auditoria priorizada com baseline e melhorias futuras (não é artefato de build). |

Nenhum arquivo de código TypeScript do servidor MCP foi tocado.

## Diff conceitual

### check.yml (novo)
Criado a partir do job `lint-test` que existia duplicado em `main.yml` e `pr.yml`. Mantém a cadeia `npm ci` → `npm run check` → `npm run build` → (opcional Codecov). O build voltou a fazer parte do gate de checagem (antes: só em `publish.yml` build via config; não havia build no CI do PR). Versões das actions alinhadas para `@v6` e Node lido de `.node-version`.

### main.yml
Checagem delegada ao `check.yml`; nenhuma lógica nova; o push de main passa a incluir build.

### pr.yml
- Antes: `lint-test` esperava `label` e `validate-title` terminarem (serial). Depois: paralelo.
- Antes: PRs em sequência de push criavam runs acumulados. Depois: `cancel-in-progress` derruba o anterior.
- Antes: sem timeout nos jobs leves. Depois: 15 min.

### publish.yml
Node 22.14.0 hardcoded → `.node-version`; cache do package manager ativado; timeout 15.

## Preservadas

- **R01/R02** 🟢 — gates de confirmação das tools destrutivas: intocados (nenhum código de tool alterado, cobertura 99.73% stmts).
- **R06** 🟢 — `checkConnection()` antes de operar: intacto.
- **R22** 🟢 — parsing de streams multiplexados: intacto.
- pipeline local `check` (lint + typecheck + coverage) verde antes e depois (baseline T003).

## Modificadas

- **Compiler de versão do Node**: regra implícita "Node hardcoded 22/22.14.0 nos workflows" → alterada para fonte única `.node-version`.
- **Serialização do job de checagem em PR**: regra implícita "lint-test só roda após label/validate-title" → removida (agora paralelo).
- **Execução acumulada de PRs**: comportamento implícito "runs antigos completam" → substituído por cancelamento do run anterior.
- **Script do PR template**: referência a `npm run type-check` (inexistente) → `npm run typecheck`.