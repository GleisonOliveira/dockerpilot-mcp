<!--
Investigation gerada por /reversa-plan em 2026-09-05. Feature: 002-otimizar-pipelines-ci.
-->

# Investigation: Otimizar pipelines CI

> Identificador: `002-otimizar-pipelines-ci`
> Data: `2026-09-05`

## 1. Objeto de estudo

Os três workflows do repositório (`main.yml`, `pr.yml`, `publish.yml`) e o pipeline npm (`package.json` scripts). O foco: onde o tempo/custo de execução é desperdiçado e onde o risco de entrega pode ser antecipado.

## 2. Situação encontrada (baseline)

| Workflow | Jobs | Tempo aproximado (observação) | Pontos de atenção |
|----------|------|-------------------------------|-------------------|
| `main.yml` | 1 (`lint-test`) | ~1–2 min | `npm run check` não roda build; Codecov after check |
| `pr.yml` | 3 (`label`, `validate-title`, `lint-test`) | ~1–2 min | Checagem serializada atrás de label/título; sem concurrency; duplicação do check |
| `publish.yml` | 1 (`publish`) | ~2–3 min | Sem cache de npm (`package-manager-cache: false`); versões `@v6` (divergente dos demais) |

## 3. Alternativas avaliadas

### 3.1 Cache de dependências

- **Abordagem A (escolhida):** `setup-node cache: npm` mantido nos 3 workflows, chaveado pelo `package-lock.json`. Preserva `npm ci` (instalação limpa e reproduzível). O cache fica no `~/.npm` do runner, eliminando re-download de tarballs.
  - **Fontes:** `actions/setup-node` docs — `cache: npm` usa o lockfile como chave do cache.
  - **Limitação conhecida:** não cobre `node_modules` reconstruído; o ganho é evitar resolução/download, não instalação completa.
- **Abordagem B (descartada):** `actions/cache` de `node_modules` + `npm ci`. **Inviável:** `npm ci` apaga `node_modules` antes de instalar, invalidando o restore.
- **Abordagem C (descartada p/ esta feature, registrada na auditoria):** restaurar `node_modules` e pular install em cache hit. Ganho máximo, mas remove a garantia de instalação limpa; sem garantia nativa de que o cache veio de um build bem-sucedido (GitHub Actions não rotula "salvo após sucesso"). Exigiria verificação `npm install --frozen-lockfile --prefer-offline` pós-restore — que quase zera o ganho.
- **Abordagem D (descartada p/ esta feature):** `npm install --frozen-lockfile` + cache de `node_modules`. Mais rápido que A na maioria dos runs, mas muda o contrato de instalação e ainda requer as salvaguardas de C.

### 3.2 Unificação da checagem

- **Workflow reutilizável `check.yml` (escolhido):** `on: workflow_call` com input `upload-coverage`. Chamado via `uses: ./.github/workflows/check.yml` por main/pr. **Benefício:** um único ponto de definição; evita drift; o RF-06 (build) vira 1 adição num lugar só.
- **Composite action (descartada):** encapsula steps, mas exige repositório/action local e boilerplate (`action.yml` + manifest); menos idiomática para pipelines "bank" de checagem.

### 3.3 Concorrência

- **`concurrency` com `cancel-in-progress: true` grupo por `github.ref` (escolhido):** cancelamentos só dentro da mesma branch/PR; PRs paralelos não se cancelam. **Alternativa descartada:** `concurrency` global (cancela PRs distintos).

### 3.4 Versões

- **Node:** `.node-version` (22.14.0) + `node-version-file` — fonte única; alternativa: `.nvmrc` ou manter `22` flutuante (descartado por reprodutibilidade).
- **Actions:** alinhar em `@v6` (major já validado no publish); alternativa: manter `@v4` (jogava fora versão nova) ou pinning SHA (decisão explicitamente adiada no clarify).

## 4. Fontes externas e padrões

- `actions/setup-node@v6` — input `node-version-file`, `cache: npm` (README oficial do action).
- `actions/checkout@v6` — checkout minimizado para CI.
- GitHub Actions — `workflow_call` reutilizável, `concurrency`/`cancel-in-progress`, `timeout-minutes` (documentação oficial).
- GitLab/GitHub — padrão "prevent merge without build": incluir o artefato que será publicado dentro do gate do PR.

## 5. Padrões aplicáveis

1. **DRY para CI:** checagem definida num único workflow chamado por todos os triggers.
2. **Fail fast no PR:** checagem começa assim que o evento chega, sem depender de jobs acessórios (label/título).
3. **Menor privilégio:** remover token desnecessário; `contents: read` onde aplicável (a manter durante a implementação).
4. **Reproducibilidade:** runtime e actions pinados/alinhados, instalção determinística (`npm ci`).

## 6. Achados complementares

- `pull_request_template.md` referencia `npm run type-check`, que **não existe** (o script é `typecheck`) — RF-11.
- `check` = `lint && typecheck && test:coverage`; o `prebuild` roda `eslint + tsc --noEmit`, logo `npm run build` revalida código. Sem risco de build "silencioso".
- Dependabot já atualiza dependências (`merge de dependabot` no git log do projeto) — o CI precisa continuar passando após bumps; o build no gate do PR cobre artefato na atualização.

## 7. Limitações da investigação

- Baseline de tempo é estimado por observação; a medição formal (mediana de 3 runs antes/depois) é uma ação do `actions.md` (RNF Desempenho).
- Não foi validado o run real do `setup-node@v6` neste repositório; a primeira PR de implementação fará essa validação empírica.