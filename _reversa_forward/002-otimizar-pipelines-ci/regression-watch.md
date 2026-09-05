<!--
regression-watch.md gerado por /reversa-coding em 2026-09-05.
Feature: 002-otimizar-pipelines-ci.
-->

# Regression Watch — 002-otimizar-pipelines-ci

> Identificador: `002-otimizar-pipelines-ci`
> Os itens abaixo vigiam comportamentos alterados/removidos por esta feature. Não há regras 🟢 de CI no `domain.md` (as regras 🟢 são todas de ferramentas Docker, intactas); os itens registram os deltas de comportamento do pipeline.

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|--------------------------|-----------------------------|---------------------|-------------------|
| W001 | `.github/workflows/check.yml` (reusable) | Checagem é única, reutilizável por `main.yml`/`pr.yml`, com `checkout@v6`, `setup-node@v6`, `node-version-file: .node-version`, `cache: npm`, e passo `npm run build` presente | presença | Job de checagem inline voltar a aparecer duplicado em main/pr; version tags regressarem para `@v4`/`@v5`; `node-version: 22` hardcoded; remoção do build |
| W002 | `.github/workflows/pr.yml` (jobs) | `lint-test` roda em paralelo com `label`/`validate-title` — `needs: [label, validate-title]` NÃO pode reaparecer | ausência | `needs` reaparecer; checagem voltar a aguardar label/título |
| W003 | `.github/workflows/pr.yml` (concurrency) | Concurrency por ref com `cancel-in-progress: true` no PR | presença | Bloco `concurrency` removido; `cancel-in-progress` desligado |
| W004 | `.github/workflows/publish.yml` | `node-version-file: .node-version`, cache npm (`package-manager-cache: true`), `timeout-minutes: 15` | presença | Reversão para `node-version: 22.14.0` hardcoded; cache desligado; timeout removido |
| W005 | `.github/pull_request_template.md` | Checklist referencia `npm run typecheck` (não `type-check`) | presença | `type-check` voltar ao template |
| W006 | `.node-version` | Arquivo existe na raiz com `22.14.0` | presença | Arquivo removido; versão alterada |

## Histórico de re-extrações

(vazio — será preenchido pelo agente reverso quando `/reversa` rodar novamente)

## Arquivadas

(vazio)

## Observações

- Item W003 (concurrency) é o de maior risco de regressão silenciosa: a ausência do bloco não quebra CI, apenas restaura o comportamento acumulado de runs. A checagem está no watch principal para manter pressão.
- Baseline de tempo real (seção 2/5 de `pipeline-audit.md`) depende de runs do GitHub pós-push; os valores locais proxy foram registrados em T003.