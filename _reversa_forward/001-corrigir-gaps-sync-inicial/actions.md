# Actions: Corrigir gaps do sync inicial (aplicar decisões da revisão)

> Identificador: `001-corrigir-gaps-sync-inicial`
> Data: `2026-08-12`
> Roadmap: `_reversa_forward/001-corrigir-gaps-sync-inicial/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 24 |
| Paralelizáveis (`[//]`) | 21 |
| Maior cadeia de dependência | 3 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Criar função pura `parseCommand` que tokeniza comando respeitando aspas simples/duplas (DT5) | - | `[//]` | `src/docker/shared/parse-command.ts` | 🟢 | `[X]` |
| T002 | Criar `dependency-resolver.ts` com `resolveDependents`/`resolveDependencies` (BFS por labels `com.docker.compose.*`, mesmo project, respeitando exclude e ordem revertida) (DT6) | - | `[//]` | `src/docker/shared/dependency-resolver.ts` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Criar testes unitários do `parseCommand` (aspas simples/duplas, escapes, string vazia, sem aspas) | T001 | `[//]` | `tests/docker/shared/parse-command.test.ts` | 🟢 | `[X]` |
| T004 | Criar testes unitários do resolutor BFS (dependentes revertidos, dependências profundas primeiro, isolamento por project, exclude) | T002 | `[//]` | `tests/docker/shared/dependency-resolver.test.ts` | 🟢 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T005 | Aplicar DT2: handler de `stop_containers` usa `dryRun ?? false` (default real executa) | - | `[//]` | `src/docker/tools/stop/stop.tool.ts` | 🟢 | `[X]` |
| T006 | Substituir `#resolveDependents` do stop pelo `resolveDependents` compartilhado (DT6) | T002, T005 | - | `src/docker/tools/stop/stop.tool.ts` | 🟢 | `[X]` |
| T007 | Substituir `#resolveDependencies` do start pelo `resolveDependencies` compartilhado (DT6) | T002 | `[//]` | `src/docker/tools/start/start.tool.ts` | 🟢 | `[X]` |
| T008 | Aplicar DT4: `create_container` verifica imagem local (getImage().inspect()) e só puxa se ausente | - | `[//]` | `src/docker/tools/create-container/create-container.tool.ts` | 🟢 | `[X]` |
| T009 | Aplicar DT-CC-01: descrição da tool `create_container` → "Create a Docker container and start it"; remover "without starting it"/"use start_containers" do final | T008 | - | `src/docker/tools/create-container/create-container.tool.ts` | 🟢 | `[X]` |
| T010 | Aplicar DT-IMG-01: `#findImage` do `delete_image` coleta todos os matches; >1 → erro orientando ID completo; 0 → "No image found matching" | - | `[//]` | `src/docker/tools/delete-image/delete-image.tool.ts` | 🟢 | `[X]` |
| T011 | Aplicar DT-ST: erro do `docker_status` em texto `Error docker_status: <msg>` + `isError:true` (sem JSON unavailable) | - | `[//]` | `src/docker/tools/docker-status/docker-status.tool.ts` | 🟢 | `[X]` |
| T012 | Aplicar DT5: `exec_command` usa `parseCommand` em vez de `split(/\s+/)` | T001 | `[//]` | `src/docker/tools/exec-command/exec-command.tool.ts` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T013 | TT-07: teste de `stop_containers` sem `dryRun` executa de fato (dryRun default false) | T005 | `[//]` | `tests/docker/tools/stop/stop.tool.test.ts` | 🟢 | `[X]` |
| T014 | TT-09: teste de stop com resolutor compartilhado mantém ordem de parada (dependentes revertidos) | T006, T013 | - | `tests/docker/tools/stop/stop.tool.test.ts` | 🟢 | `[X]` |
| T015 | TT-09: teste de start com resolutor compartilhado mantém ordem de início (dependências primeiro) | T007 | `[//]` | `tests/docker/tools/start/start.tool.test.ts` | 🟢 | `[X]` |
| T016 | TT-08: teste do `create_container` (descrição "creates and starts" + pull condicional: imagem local → sem pull; ausente → pull) | T008, T009 | `[//]` | `tests/docker/tools/create-container/create-container.tool.test.ts` | 🟢 | `[X]` |
| T017 | TT-05: teste do `delete_image` com prefixo ambíguo → erro orientando ID completo (DT-IMG-01) | T010 | `[//]` | `tests/docker/tools/delete-image/delete-image.tool.test.ts` | 🟢 | `[X]` |
| T018 | TT-04: teste do `docker_status` com daemon fora → "Error docker_status: <msg>" isError (DT-ST), sem JSON unavailable | T011 | `[//]` | `tests/docker/tools/docker-status/docker-status.tool.test.ts` | 🟢 | `[X]` |
| T019 | TT-06: teste do `exec_command` com comando contendo aspas (`sh -c 'echo "a b"'`) preservado (DT5) | T012 | `[//]` | `tests/docker/tools/exec-command/exec-command.tool.test.ts` | 🟢 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T020 | Aplicar DT1: `package.json` version → `0.1.0` | - | `[//]` | `package.json` | 🟢 | `[X]` |
| T021 | TT-03: teste de versão — server (`src/server.ts`) e package.json ambos `0.1.0` | T020 | `[//]` | `tests/server.test.ts` | 🟢 | `[X]` |
| T022 | DOC-01: AGENTS.md com os 7 prompts (container_troubleshoot, image_cleanup, volume_removal, compose_start, compose_stop, compose_restart, compose_service), contratos reais das tools, nota do `ToolContainer` (G-08) e limitação de Dockerfile (DT7) | - | `[//]` | `AGENTS.md` | 🟢 | `[X]` |
| T023 | DOC-01: README.md com os 7 prompts na seção "Available Prompts" e limitação de Dockerfile (DT7) | - | `[//]` | `README.md` | 🟢 | `[X]` |
| T024 | DT3: teste de regressão do prompt `compose_service` — garante que o template orienta via tools MCP e não referencia `args` inexistente no schema de `exec_command` | - | `[//]` | `tests/docker/prompts/compose-service/compose-service.prompt.test.ts` | 🟢 | `[X]` |

## Notas de execução

- **TEST-MANDATORY** (`_reversa_sdd/gaps.md#Requisito obrigatório — testes`): após cada bloco de ações, rodar `npm test`. A feature só é concluída com **toda a suíte verde**.
- Gate final: `npm run check` (lint + typecheck + coverage 95%).
- T006 e T007 dependem de T002; T013/T014 e T015 validam a equivalência de ordem do refactor DT6 (regressão).
- T009 só pode rodar depois de T008 (mesmo arquivo). T014 depois de T013 (mesmo arquivo de teste).
- Não tocar em schema Zod: nenhuma ação altera contratos de entrada.

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-12 | Versão inicial gerada por `/reversa-to-do` | reversa |
