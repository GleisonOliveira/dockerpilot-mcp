<!--
Onboarding gerado por /reversa-plan em 2026-09-05. Feature: 002-otimizar-pipelines-ci.
-->

# Onboarding: Otimizar pipelines CI

> Identificador: `002-otimizar-pipelines-ci`
> Data: `2026-09-05`

Passo a passo para validar manualmente as mudanças de CI desta feature num ambiente de desenvolvimento.

## Pré-requisitos

- Repositório clonado com a branch da feature
- Node 22+ local e npm (para validar o pipeline npm no host)
- Acesso a um repositório GitHub onde os workflows rodam (push em branch com PR, para observar as runs)

## Passos

```bash
# 1. Validar o pipeline npm no host (mesmo conjunto que o CI roda)
npm ci
npm run check        # lint + typecheck + test:coverage
npm run build        # tsup gera dist/ (novo passo adicionado ao CI)

# 2. Conferir que .node-version existe e bate com o engines do package.json
cat .node-version    # esperado: 22.14.0
node --version       # >= 22 (engines do package.json)
```

## Validação no GitHub (por PR)

Ao abrir a PR de implementação com estas mudanças, observar:

1. **No PR (`pr.yml`):**
   - Job `check` (chamando `check.yml`) inicia **sem** esperar `label`/`validate-title`
   - Logs do `npm ci` mostram cacLe hit (quando o lockfile não mudou)
   - O `npm run build` roda e passa depois do check
   - Dois pushes seguidos cancelam o run anterior (`concurrency.cancel-in-progress`)
2. **Em `main` (`main.yml`):**
   - Job `check` roda com `upload-coverage: true` e o Codecov recebe o upload
   - Actions `checkout@v6` e `setup-node@v6` com `node-version-file`
3. **No publish (`publish.yml`, tag `v*` — opcional):**
   - `setup-node@v6` com cache de npm ativo
   - `node-version-file: .node-version`

## Critério de sucesso

- [ ] `npm run check` e `npm run build` passam no host
- [ ] PR roda o check em paralelo com label/título
- [ ] Build falhoso faz a checagem falhar (teste negativo: quebrar `tsup` de propósito num commit de teste e confirmar vermelho)
- [ ] Cancel-in-progress observado entre dois pushes do mesmo PR
- [ ] Codecov recebe coverage em main (e não em PR, conforme RF-10 Deferred)

## Telemetria da feature

- Baseline de tempo do job `check`: medir 3 runs antes das mudanças (mediana)
- Pós-mudança: medir 3 runs após (mediana) e registrar no `pipeline-audit.md`