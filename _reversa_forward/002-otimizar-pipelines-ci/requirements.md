<!--
Gerado por /reversa-requirements em 2026-09-05. Feature: 002-otimizar-pipelines-ci.
Ancorado em: _reversa_sdd/inventory.md#CI/CD, _reversa_sdd/architecture.md#Stack, workflows em .github/workflows/.
-->

# Requirements: Otimizar pipelines CI (cache de dependências e melhorias nos workflows)

> Identificador: `002-otimizar-pipelines-ci`
> Data: `2026-09-05`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O projeto mantém três workflows GitHub Actions (`main.yml`, `pr.yml`, `publish.yml`) que rodam lint, typecheck, testes com cobertura e publish. Esta feature analisa os workflows existentes, identifica os pontos de melhoria (cache de dependências, concorrência de runs, desacoplamento de jobs, build ausente no CI, versões inconsistentes de actions/Node) e prioriza onde aplicar primeiro, entregando a auditoria priorizada e as correções de maior impacto no pipeline. O objetivo é reduzir tempo e custo de execução dos checks em PR e em main, garantir que o build (tsup) seja validado antes de merge e padronizar a infraestrutura de CI.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/inventory.md#CI/CD` | `main.yml` → push para main: `npm ci` + `npm run check` + upload coverage Codecov; `pr.yml` → PRs: label por título + validação + `npm run check`; `publish.yml` → tag `v*`: versão no package.json + `npm ci` + `npm run build` + publish | 🟢 |
| `_reversa_sdd/architecture.md#Stack` | CI é GitHub Actions (lint, build, test, coverage); runtime Node.js 20+ | 🟢 |
| `.github/workflows/main.yml` | Job único `lint-test`: checkout@v4, setup-node@v4 (node 22, `cache: npm`), `npm ci`, `npm run check`, upload Codecov | 🟢 |
| `.github/workflows/pr.yml` | Jobs `label`, `validate-title`, `lint-test` (com `needs: [label, validate-title]`); `npm run check` duplicado; sem concurrency control | 🟢 |
| `.github/workflows/publish.yml` | checkout@v6, setup-node@v6 (node 22.14.0, `package-manager-cache: false`), `npm ci` + `npm run build` + publish com provenance | 🟢 |
| `package.json` | `check` = `lint && typecheck && test:coverage`; **não inclui build**; `build` = tsup | 🟢 |
| `_reversa_sdd/gaps.md` | Documenta gaps da revisão das specs; CI não constava nos gaps G-01..G-10 | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Mantenedor (Gleison) | Validar rapidamente que mudanças em main/PR não quebram o pacote; liberar releases confiáveis | Abre PR, os checks parcelam e rodam em paralelo, build valida tsup antes do merge |
| Contribuidor externo | Receber feedback rápido e legível do CI em PRs | Submete PR, runs de pushes consecutivos cancelam os anteriores e o resultado vem rápido |
| Release manager | Publicar versões com segurança e reproducibilidade | Cria tag `v*`; o publish roda de checkout limpo com versão derivada da tag |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** toda mudança com destino a `main` deve passar por lint, typecheck, testes com cobertura **e build (tsup)** num run determinístico de CI. 🟢
   - Tipo: alterada (hoje `npm run check` não valida o build)
2. **RN-02:** execuções de CI para a mesma branch/PR são substituídas por runs mais novos (cancel-in-progress), sempre que o run anterior ainda estiver em andamento. 🟢
   - Tipo: nova
3. **RN-03:** a instalação de dependências deve ser cacheada em função do `package-lock.json` (mesmo hash → mesmo cache), preservando `npm ci` para instalção reproduzível. 🟢
   - Tipo: nova
4. **RN-04:** upload de cobertura para o Codecov é parte do fluxo confiável de main; sua extensão a PRs é decisão separada. 🟢
   - Tipo: nova

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Produzir auditoria priorizada dos 3 workflows, listando pontos de melhoria com impacto estimado e ordem de aplicação | Must | Documento `pipeline-audit.md` em `_reversa_forward/002-otimizar-pipelines-ci/` cobrindo `main.yml`, `pr.yml` e `publish.yml`, com seção de prioridades (o que melhorar primeiro e por quê) | 🟢 |
| RF-01.1 | Priorização da auditoria combina impacto em tempo/custo de execução E redução de risco de entrega em PRs (ex.: validar build antes de merge pesa mais que quick win de minutos) | Must | A ordem da seção de prioridades em `pipeline-audit.md` segue o critério combinado; o rationale de cada item explicita tempo/custo e risco de PR | 🟢 |
| RF-02 | Implementar cache de dependências (abordagem A: `setup-node cache: npm`) de forma consistente nos 3 workflows, mantendo `npm ci` reproduzível | Must | `cache: npm` presente em main, pr e publish; logs do `npm ci` reportam cache hit quando o lockfile não muda | 🟢 |
| RF-03 | Adicionar `concurrency` com `cancel-in-progress` no `pr.yml` (grupo por ref/cabeça do PR) | Must | Dois pushes seguidos ao mesmo PR: primeiro run é cancelado; apenas o mais novo roda | 🟢 |
| RF-04 | Desacoplar o job `lint-test` de `label`/`validate-title` para executar em paralelo (remover `needs` ou limitá-lo ao essencial) | Must | `lint-test` inicia imediatamente no PR, sem esperar label/validação de título | 🟢 |
| RF-05 | Extrair a duplicação de `npm ci` + `npm run check` entre `main.yml` e `pr.yml` para um workflow reutilizável (check.yml chamado via `uses:`), com input `upload-coverage` (bool) | Should | `check.yml` como único ponto de definição; `main.yml` chama com `upload-coverage: true` e `pr.yml` com `false` | 🟢 |
| RF-06 | Adicionar validação de build (`npm run build`) ao CI de main e PR para impedir merge que quebre `tsup` | Must | `npm pack`/`tsup` compila com sucesso antes do merge; PR com build quebrado falha o check | 🟢 |
| RF-07 | Padronizar versões das actions (`actions/checkout` e `actions/setup-node`) entre os workflows, alinhando apenas majors (@v4 ou @v6 em todos) | Should | Mesma major usada nos 3 workflows (atualmente `@v4` vs `@v6`); pinning por SHA fora de escopo, registrado na auditoria | 🟢 |
| RF-08 | Padronizar versão do Node no CI (hoje `22` em main/pr e `22.14.0` em publish) | Should | Única fonte de verdade (ex. `.node-version`/`node-version-file`) usada pelos 3 workflows | 🟢 |
| RF-09 | Adicionar `timeout-minutes` em todos os jobs para evitar hangs sem custo aberto | Should | Todo job declara `timeout-minutes` explícito | 🟢 |
| RF-10 | Habilitar relatório de cobertura no Codecov também em PRs | Deferred | Descartado nesta feature — upload de coverage permanece apenas em main; registrar como oportunidade futura na auditoria | 🟡 |
| RF-11 | Corrigir citação de script inexistente no PR template (`npm run type-check` → `npm run typecheck`) | Could | PR template não referencia scripts que não existem | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | Tempo mediano do job de checagem em PR deve diminuir após as otimizações, com baseline registrado antes da mudança | Baseline atual é cronometrado no início da implementação (mediana de pelo menos 3 runs) | 🟡 |
| Segurança | `permissions` mínimas por job, sem token desnecessário (conteúdo de leitura onde aplicável) | Padrão GitHub Actions: princípio do menor privilégio | 🟡 |
| Manutenibilidade | Workflows DRY, versões de actions e Node consistentes, cada etapa nomeada (lint / typecheck / test / build) para diagnóstico claro | Observação direta dos workflows atuais com duplicação e versões divergentes | 🟢 |
| Observabilidade | Falha em qualquer etapa identifica a etapa e o comando exato que falhou em no máximo 30 segundos de inspeção dos logs | Etapas separadas no workflow | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Run de PR em paralelo e com build validado
  Dado um pull request aberto para main com mudanças em src/
  Quando o CI processa o evento pull_request
  Então o job de checagem inicia sem esperar label nem validação de título
  E executa lint, typecheck, testes com cobertura e build (tsup)
  E um segundo push ao mesmo branch cancela o run anterior ainda em andamento

Cenário: Cache de dependências ativo
  Dado um package-lock.json sem alterações entre dois runs
  Quando o job executa npm ci
  Então os logs indicam cache hit das dependências e a instalação não re-downloada pacotes

Cenário: Auditoria priorizada disponível
  Dado uma análise completa dos três workflows
  Quando se compila a lista de melhorias
  Então há um documento de auditoria com impacto estimado por item
  E os itens vêm ordenados pelo critério "o que melhorar primeiro"

Cenário: Versões padronizadas
  Dado os três workflows do projeto
  Quando se inspeciona as versões de actions/checkout, actions/setup-node e do Node
  Então não há divergência de major entre main.yml, pr.yml e publish.yml

Cenário: Falha de build impede merge (caso negativo)
  Dado uma alteração que quebra a compilação do tsup
  Quando o CI de PR processa a mudança
  Então o job de checagem falha na etapa de build
  E o PR não é mergeável pelo status

Cenário: Reuso de checagem única
  Dado dois workflows (main e pr) que precisam da mesma checagem
  Quando um deles muda a definição da checagem
  Então o outro reflete a mudança sem edição manual duplicada
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 Auditoria priorizada | Must | É o "onde melhorar primeiro" pedido pelo usuário; guia as demais decisões |
| RF-02 Cache de dependências | Must | Pedido explícito; impacto direto em tempo/custo de `npm ci` |
| RF-03 Concurrency | Must | Evita custo de runs redundantes com baixo esforço |
| RF-04 Desacoplar jobs | Must | Reduz latência do feedback em PR |
| RF-06 Build no CI | Must | Hoje o merge pode passar sem validar o artefato publicado |
| RF-05 Reuso de checagem | Should | Reduz duplicação e drift entre workflows |
| RF-07 Versões actions | Should | Consistência e menor superfície de manutenção |
| RF-08 Versão Node | Should | Reproducibilidade do ambiente |
| RF-09 timeout-minutes | Should | Contenção de custo e robustez |
| RF-10 Codecov em PR | (removido) | Descartado por decisão de escopo — manter upload apenas em main |
| RF-11 PR template | Could | Quality-of-life para contribuidores |

## 9. Esclarecimentos

### Sessão 2026-09-05

- **Q:** Hardening de supply-chain nas actions (RF-07): alinhar majors ou pinar por commit SHA?
  **R:** Apenas alinhar majors entre os workflows (@v4 ou @v6 em todos). Pinning por SHA fica registrado na auditoria como melhoria futura.
- **Q:** Codecov em PR (RF-10): habilitar upload de cobertura e usar status como gate?
  **R:** Não habilitar nesta feature. Upload de coverage permanece apenas em main; item movido para `Deferred`.
- **Q:** Critério de priorização da auditoria (RF-01): o que ordena os itens de melhoria?
  **R:** Critério combinado: impacto em tempo/custo de execução **e** redução de risco de entrega em PRs (validar build/pre-merge pesa mais que quick wins de minutos). Refletido em RF-01.1.
- **Q:** Escopo do cache de dependências (RF-02): manter `setup-node cache: npm` ou cachear `node_modules`?
  **R:** Abordagem A. Manter `setup-node cache: npm` de forma consistente nos 3 workflows (publish também), preservando `npm ci` reproduzível. Cache de `node_modules` (C/D) descartado nesta feature — registrado na auditoria como evolução futura condicionada ao baseline mostrando o install dominando o run.
- **Q:** Existe duplicação entre pipelines que pode ser unificada?
  **R:** Sim. O job `lint-test` está duplicado entre `main.yml` e `pr.yml` (checkout → setup-node → npm ci → npm run check); única diferença é o upload Codecov no main. Unificar via workflow reutilizável `check.yml` com input `upload-coverage` (RF-05).

## 10. Lacunas

(nenhuma lacuna pendente — todas as dúvidas resolvidas na sessão acima; cache de `node_modules` e pinning por SHA ficam registrados na auditoria como melhorias futuras)

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-09-05 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-09-05 | Sessão de esclarecimento: RF-07 majors apenas; RF-10 Deferred; RF-01.1 critério combinado; RF-02 abordagem A; RF-05 workflow reutilizável com input upload-coverage | reversa |