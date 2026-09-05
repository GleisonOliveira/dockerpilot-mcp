<!--
Pipeline-audit gerado por /reversa-coding em 2026-09-05. Feature: 002-otimizar-pipelines-ci.
Critério de priorização: RF-01.1 — combina impacto em tempo/custo de execução E redução de risco de entrega em PRs.
-->

# Pipeline Audit: otimização dos workflows CI

> Identificador: `002-otimizar-pipelines-ci`
> Data: `2026-09-05`
> Critério de priorização: RF-01.1 — combina impacto em tempo/custo de execução E redução de risco de entrega em PRs.

## 1. Resumo

Todos os três workflows (`main.yml`, `pr.yml`, `publish.yml`) foram auditados e otimizados. A maior mudança estrutural foi a criação do workflow reutilizável `check.yml`, que elimina a duplicação byte a byte do job de checagem entre `main` e `pr`. As otimizações aplicadas nesta feature estão listadas em `actions.md` (T001–T011). Esta auditoria documenta o estado pós-mudança, o baseline de tempo e as oportunidades futuras que ficaram de fora do escopo por decisão do usuário (sessão de esclarecimento de 2026-09-05).

## 2. Baseline (antes da otimização)

Metodologia: mediana de ≥3 runs reais do job `check` em `main` e em PR **antes** de aplicar as mudanças; complemento local via wall-clock do mesmo conjunto de comandos no mesmo commit (proxy). Runs reais do GitHub dependem de push; a confirmação pós-run é preenchida na seção Comparação.

| Componente | Baseline real (mediana, s) | Baseline local proxy (s) | Observação |
|------------|----------------------------|--------------------------|------------|
| `npm ci` | (pendente run real) | 7.79 | medido em 2026-09-05, commit atual |
| `npm run check` | (pendente run real) | 4.31 | lint + typecheck + coverage (99.73% stmts) |
| `npm run build` | (pendente run real) | 4.11 | tsup ESM + DTS |

## 3. Auditoria por workflow

### 3.1 `main.yml` (push para main)

**Estado antes:** 1 job `lint-test` inline (checkout@v4, setup-node@v4, npm ci, run check, upload Codecov). `npm run check` não executava build.

**Estado depois:** 1 job `check` delegado ao `check.yml` reutilizável com `upload-coverage: true` e token Codecov. Build (tsup) adicionado ao pipeline.

| Item | Impacto | Risco em PR/merge | Prioridade |
|------|---------|-------------------|------------|
| Delegar à checagem reutilizável | médio (DRY, drift eliminado) | médio | alta |
| Build validado no push de main | baixo (main já é pós-merge) | baixo | média |

### 3.2 `pr.yml` (pull request)

**Estado antes:** 3 jobs (`label`, `validate-title`, `lint-test`); `lint-test` com `needs: [label, validate-title]` e `npm run check` duplicado inline; sem `concurrency`; sem timeouts.

**Estado depois:** `lint-test` → `check.yml` reutilizável sem `needs` (paralelo a label/título); `concurrency` com `cancel-in-progress: true` (grupo por ref); `timeout-minutes: 15` nos 3 jobs.

| Item | Impacto | Risco em PR/merge | Prioridade |
|------|---------|-------------------|------------|
| Checagem em paralelo com label/título | médio (feedback mais cedo) | médio | alta |
| `cancel-in-progress` evita runs redundantes | médio (custo de minutos) | médio | alta |
| Build validado antes do merge | médio (impede PR com tsup quebrado) | alto | alta (risco supera custo — RF-01.1) |
| Timeouts nos jobs | baixo (cast de custo) | baixo | média |

### 3.3 `publish.yml` (tag v*)

**Estado antes:** checkout@v6, setup-node@v6 (node 22.14.0), `package-manager-cache: false`, sem timeout.

**Estado depois:** `node-version-file: .node-version`, `package-manager-cache: true`, `timeout-minutes: 15`. Versões já estavam em `@v6`, alinhadas às demais.

| Item | Impacto | Risco em PR/merge | Prioridade |
|------|---------|-------------------|------------|
| Cache npm ativo | baixo (run raro, mas consistente) | baixo | baixa |
| Node via `.node-version` | baixo (fonte única) | baixo | média |
| Timeout | baixo | baixo | baixa |

## 4. Priorização "o que melhorar primeiro" (critério RF-01.1)

1. **Build validado no gate do PR** — maior impacto em risco de entrega (merge com tsup quebrado deixaria de passar); custo pequeno (build leva ~4s).
2. **Checagem em paralelo + cancel-in-progress** — redução direta de tempo/custo por PR, sem trade-off.
3. **Workflow reutilizável `check.yml`** — habilita os dois anteriores e evita drift futuro.
4. **Versões alinhadas (`@v6` + `.node-version`)** — reprodutibilidade; impacto menor.
5. **Timeouts e caches** — contensão de custo, baixo risco.

## 5. Comparação pós-baseline

(pendente: mediana de ≥3 runs reais da PR de implementação — preencher manualmente após push)

| Componente | Pré (proxy local, s) | Pós (run real, s) | Variação |
|------------|----------------------|-------------------|----------|
| `npm ci` | 7.79 | (pendente) | — |
| `npm run check` | 4.31 | (pendente) | — |
| `npm run build` | 4.11 | (pendente) | — |

## 6. Oportunidades futuras (fora de escopo por decisão)

Registradas aqui para o próximo ciclo, sem compromisso de implementação:

- **Cache agressivo de `node_modules` (abordagens C/D):** pular `npm ci` em cache hit ou usar `npm install --frozen-lockfile` + cache de `node_modules`. Ganho máximo de velocidade, mas exige verificação pós-restore e abre mão da instalação limpa. Revisitar se o baseline real mostrar o install dominando o run.
- **Pinning de actions por commit SHA:** ga(nha supply-chain) em troca de fricção de manutenção; ficou registrado na sessão de esclarecimento como melhoria futura.
- **Codecov em PR (RF-10, Deferred):** upload de coverage em PRs com status de gate 95% — depende de decisão separada sobre token/gate.
- **publish.yml:** dependendo da frequência de releases, avaliar cache de `dist/` entre `check` e publish via artefatos compartilhados.

## 7. O que NÃO mudou

- `npm run check` continua sendo lint + typecheck + test:coverage (sem build); o build é passo separado no `check.yml`.
- Label por título e validação Conventional Commits continuam como jobs independentes no `pr.yml`.
- Fluxo de release (tag `v*` + provenance) inalterado salvo Node/cache/timeout.
- Nenhum código TypeScript do servidor MCP foi tocado.