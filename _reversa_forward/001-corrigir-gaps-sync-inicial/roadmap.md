# Roadmap: Corrigir gaps do sync inicial (aplicar decisões da revisão)

> Identificador: `001-corrigir-gaps-sync-inicial`
> Data: `2026-08-12`
> Requirements: `_reversa_forward/001-corrigir-gaps-sync-inicial/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A feature é um conjunto de deltas cirúrgicos sobre o código existente, sem reescrita de arquitetura. Cada DT decidida na revisão mapeia para uma alteração localizada em uma tool:

- **DT2** — `stop.tool.ts`: handler passa de `input.dryRun ?? true` para `?? false`.
- **DT4** — `create-container.tool.ts`: verificação de presença local da imagem antes do pull.
- **DT-CC-01** — `create-container.tool.ts`: descrição MCP vira "Create a Docker container and start it".
- **DT-IMG-01** — `delete-image.tool.ts`: `#findImage` passa a coletar todos os matches e lançar erro se houver mais de um.
- **DT-ST** — `docker-status.tool.ts`: bloco de erro troca JSON `{status:"unavailable",...}` por texto `Error docker_status: <msg>`.
- **DT5** — `exec-command.tool.ts`: parser de comando com suporte a aspas simples/duplas (função compartilhada em `src/docker/shared/`).
- **DT6** — extração do resolutor BFS de dependências Compose para `src/docker/shared/`, consumido por stop e start.
- **DT1** — `package.json` → `0.1.0`.
- **DOC-01 / G-08 / DT7** — AGENTS.md/README: 7 prompts reais, contratos corretos, limitação de Dockerfile e nota sobre o `ToolContainer`.

DT3 (`compose_service`) já está coerente no código (orienta via tools MCP, sem `args` inexistente); vira apenas verificação + teste de regressão. G-04 foi correção de spec (sem delta de código).

Toda mudança exige atualização dos testes afetados e `npm test` verde (TEST-MANDATORY).

## 2. Princípios aplicados

Não existe `.reversa/principles.md` neste projeto — nenhum princípio formal a checar. Princípios implícitos extraídos da pipeline (gates de confirmação, `tryCatch`, erros `Error <ctx>: <msg>`) são **respeitados** pela feature.

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| Confirmação explícita em operações destrutivas (`_reversa_sdd/domain.md#R01`) | DT-IMG-01 reforça segurança da remoção (não deleta primeiro match arbitrário) | respeita |
| Erros uniformes `Error <ctx>: <msg>` + `isError:true` (ADR-0005, DT-ST) | DT-ST alinha `docker_status` ao padrão das demais tools | respeita |
| `tryCatch` como único wrapper de erro nos handlers (AGENTS.md) | nenhuma mudança introduz try/catch manual | respeita |
| Testes obrigatórios com `npm test` verde (TEST-MANDATORY) | toda DT tem TT correspondente | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Handler de `stop_containers` usa `dryRun ?? false` (DT2) | Alinha handler ao schema (`default false`); execução real por padrão, coerente com `start_containers` | Mudar o schema para `default true` (mudaria o contrato e a UX de stop) | 🟢 |
| D-02 | `create_container` verifica imagem local via `docker.getImage(image).inspect()` e só puxa se ausente (DT4) | Evita pull desnecessário em re-criações; decisão explícita do usuário | Pull incondicional mantido (custo de rede); `listImages` + filtro (mais chamadas e parse) | 🟢 |
| D-03 | Descrição da tool `create_container` reescrita para "Create a Docker container and start it" (DT-CC-01) | Documenta o comportamento real (handler faz `container.start()`) | Mudar comportamento para não iniciar (contrato atual desejado é cria e inicia) | 🟢 |
| D-04 | `#findImage` do `delete_image` retorna **lista de matches**; >1 → erro orientando ID completo (DT-IMG-01) | Evita remoção acidental por prefixo ambíguo; critério de aceite do RF-04 | Manter `find()` no primeiro match (comportamento inseguro atual) | 🟢 |
| D-05 | `docker_status` em falha retorna `Error docker_status: <msg>` com `isError:true` (DT-ST) | Uniformiza o contrato de erro com as demais tools; ADR-0007 mantém execução estrita (sem fallback por bloco) | Manter `{status:"unavailable", error}` (formato divergente) | 🟢 |
| D-06 | `exec_command` troca `split(/\s+/)` por parser de aspas simples/duplas (DT5), extraído como função pura em `src/docker/shared/` | Preserva argumentos compostos (`sh -c 'echo "a b"'`) | Documentar limitação e manter split simples (correção demandada pelo usuário) | 🟢 |
| D-07 | Resolutor BFS de dependências Compose extraído para `src/docker/shared/dependency-resolver.ts`, consumido por stop e start (DT6) | Elimina duplicação `#resolveDependents`/`#resolveDependencies`; ordem BFS preservada | Manter duplicação (aceita no legado, mas DT6 decidido); abstração com lazy/generics (overkill) | 🟢 |
| D-08 | `package.json` `version` → `0.1.0` (DT1) | McpServer (`src/server.ts`) é a fonte de verdade da identidade | Reverter `server.ts` para `0.0.1` (regressão de identidade publicada) | 🟢 |
| D-09 | AGENTS.md e README documentam os 7 prompts, contratos reais, limitação de Dockerfile e nota do `ToolContainer` (DOC-01/G-08/DT7) | Documentação é a superfície do gap G-05/G-08/G-10 | Não tocar docs (gap persiste) | 🟢 |
| D-10 | `compose_service` sem mudança de código (DT3): apenas teste de regressão garantindo contrato via tools MCP | Código já conforme a decisão | Reescrever prompt (não necessário) | 🟢 |

## 4. Premissas

Nenhuma. O `requirements.md` não tem `[DÚVIDA]` — todas as decisões foram respondidas pelo usuário na revisão.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| tools-containers | `_reversa_sdd/architecture.md#6 Módulos` | regra-alterada | stop executa por padrão (DT2); create com pull condicional (DT4) e descrição corrigida (DT-CC-01) |
| tools-container-ops | `_reversa_sdd/architecture.md#6 Módulos` | regra-alterada | exec_command com parser de aspas (DT5) |
| tools-images | `_reversa_sdd/architecture.md#6 Módulos` | contrato-alterado | delete_image com guarda de ambiguidade (DT-IMG-01) |
| tools-daemon | `_reversa_sdd/architecture.md#6 Módulos` | contrato-alterado | docker_status com erro padronizado (DT-ST) |
| docker-shared | `_reversa_sdd/architecture.md#6 Módulos` | componente-novo | `dependency-resolver.ts` (DT6) + `parse-command.ts` (DT5) em `src/docker/shared/` |
| core | `_reversa_sdd/architecture.md#6 Módulos` | regra-alterada | versão `package.json` → `0.1.0` (DT1) |
| doc (AGENTS.md/README) | `_reversa_sdd/architecture.md#4/#5` | contrato-alterado | 7 prompts reais, contratos corretos, limitação Dockerfile (DOC-01/G-08/DT7) |

## 6. Delta no modelo de dados

- Resumo das mudanças: o sistema não possui persistência própria (nenhum banco). Não há migração de dados. Os únicos "deltas de dados" são de **contrato de saída** (formato de erro do `docker_status`, estrutura do preview do `delete_image` em caso de ambiguidade) — documentados em `interfaces/mcp-tools.md`.
- Detalhe completo em: `_reversa_forward/001-corrigir-gaps-sync-inicial/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| Tools MCP (`stop_containers`, `create_container`, `delete_image`, `docker_status`, `exec_command`) | MCP (JSON-RPC sobre stdio) | `_reversa_forward/001-corrigir-gaps-sync-inicial/interfaces/mcp-tools.md` |

## 8. Plano de migração

n/a — sem persistência nem estado externo migrável. A aplicação é um build com testes:

1. Aplicar deltas de código por módulo (ver §3).
2. Atualizar/criar testes TT por DT.
3. `npm test` verde como gate de cada bloco.
4. `npm run check` (lint + typecheck + coverage) ao final.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| DT2 muda o default real do stop: usuários que dependiam do preview podem parar containers por acidente | alto | média | Teste TT-07 explícito (dryRun default false); release note no README; descrição da tool já documenta default false |
| DT4 race: imagem removida entre o check e o create → erro de create | médio | baixa | Erro explícito do daemon propagado via tryCatch; teste de imagem ausente cobre o pull |
| DT6 refactor pode alterar ordem BFS e causar regressão em stop/start | alto | baixa | Extração com semântica idêntica; testes TT-09 comparam a ordem produzida antes/depois |
| DT5 parser de aspas com casos malformados | médio | baixa | Função pura com testes de casos (aspas simples/duplas, escapes, strings vazias) |
| Erros `Error <ctx>` contendo JSON/multilinha quebram parse do agente | baixo | baixa | Manter padrão existente; docker_status usa `String(outcome.error)` |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `npm test` passando (TEST-MANDATORY, obrigatório em `_reversa_sdd/gaps.md`)
- [ ] `npm run lint` e `npm run typecheck` limpos
- [ ] Testes novos por DT: TT-07 (DT2), TT-08 (DT-CC-01/DT4), TT-09 (DT6), TT-05 delete_image (DT-IMG-01), TT-04 docker_status (DT-ST), TT-06 exec (DT5), TT-03 versão (DT1)
- [ ] AGENTS.md/README com os 7 prompts e contratos reais (DOC-01)
- [ ] `regression-watch.md` gerado pelo `/reversa-coding`

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-12 | Versão inicial gerada por `/reversa-plan` | reversa |
