# Matriz de Rastreabilidade Código → Spec

> Geração: Writer (reversa-autonomous), `2026-08-13`.
> Formato: `arquivo legado` → `unit (requirements/design/tasks)` → `critério(s) da unit`.

## Código → Spec

| Arquivo legado | Unit | Artefato correspondente |
|----------------|------|-------------------------|
| `src/index.ts` | `core` | requirements/design/tasks |
| `src/server.ts` | `core` | requirements/design/tasks |
| `src/tools.config.ts` | `core` | requirements/design/tasks |
| `src/prompts.config.ts` | `core` + `prompts` | requirements/design/tasks |
| `src/di/tool-container.ts` | `injecao-de-dependencia` | requirements/design/tasks |
| `src/di/prompt-container.ts` | `injecao-de-dependencia` | requirements/design/tasks |
| `src/utils/try-catch.ts` | `utilitarios` | requirements/design/tasks |
| `src/docker/client.ts` | `cliente-docker` | requirements/design/tasks |
| `src/docker/shared/base.tool.ts` | `compartilhados-docker` | requirements/design/tasks |
| `src/docker/shared/base.prompt.ts` | `compartilhados-docker` | requirements/design/tasks |
| `src/docker/shared/list.resolvers.ts` | `compartilhados-docker` | requirements/design/tasks |
| `src/docker/tools/list/list.tool.ts` | `ferramentas-containers` | RF-01, tasks T-01/T-05 |
| `src/docker/tools/stop/stop.tool.ts` | `ferramentas-containers` | RF-02, tasks T-02/T-07 |
| `src/docker/tools/start/start.tool.ts` | `ferramentas-containers` | RF-03, task T-03 |
| `src/docker/tools/restart/restart.tool.ts` | `ferramentas-containers` | RF-04, task T-04 |
| `src/docker/tools/delete/delete.tool.ts` | `ferramentas-containers` | RF-05, task T-05 |
| `src/docker/tools/create-container/create-container.tool.ts` | `ferramentas-containers` | RF-06, task T-06 |
| `src/docker/tools/exec-command/exec-command.tool.ts` | `operacoes-container` | RF-01, tasks T-01/T-03/T-04 |
| `src/docker/tools/container-logs/container-logs.tool.ts` | `operacoes-container` | RF-02, tasks T-02/T-03 |
| `src/docker/tools/list-images/list-images.tool.ts` | `ferramentas-imagens` | RF-01, task T-01 |
| `src/docker/tools/delete-image/delete-image.tool.ts` | `ferramentas-imagens` | RF-02, task T-02 |
| `src/docker/tools/pull-image/pull-image.tool.ts` | `ferramentas-imagens` | RF-03, task T-03 |
| `src/docker/tools/prune-images/prune-images.tool.ts` | `ferramentas-imagens` | RF-04, task T-04 |
| `src/docker/tools/list-volumes/list-volumes.tool.ts` | `ferramentas-volumes` | RF-01, task T-01 |
| `src/docker/tools/create-volume/create-volume.tool.ts` | `ferramentas-volumes` | RF-02, task T-02 |
| `src/docker/tools/delete-volume/delete-volume.tool.ts` | `ferramentas-volumes` | RF-03, task T-03 |
| `src/docker/tools/docker-status/docker-status.tool.ts` | `ferramentas-daemon` | RF-01, task T-01 |
| `src/docker/prompts/container-troubleshoot/` | `prompts` | RF-03, task T-01 |
| `src/docker/prompts/image-cleanup/` | `prompts` | RF-04, task T-02 |
| `src/docker/prompts/volume-removal/` | `prompts` | RF-05, task T-03 |
| `src/docker/prompts/compose-start/` | `prompts` | RF-06, task T-04 |
| `src/docker/prompts/compose-stop/` | `prompts` | RF-06, task T-04 |
| `src/docker/prompts/compose-restart/` | `prompts` | RF-06, task T-04 |
| `src/docker/prompts/compose-service/` | `prompts` | RF-07, task T-05 |

## Spec → Código

Todas as 11 units têm no mínimo um arquivo legado mapeado (ver tabela acima). Não há requirements órfãos nesta extração.

## Lacunas
- Tests (`tests/docker/tools/**`) não foram mapeados nesta fase; podem ser cobertos em `_reversa_docs/` ou em fase posterior.
