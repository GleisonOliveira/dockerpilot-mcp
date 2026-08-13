# Legacy Impact — 001-corrigir-gaps-sync-inicial

> Data: `2026-08-12`
> Âncora: `_reversa_sdd/architecture.md` + `_reversa_sdd/domain.md`
> Execução: `/reversa-coding` — 24/24 ações concluídas (`[X]`)

## Arquivo afetado | Componente | Tipo | Severidade | Justificativa

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `src/docker/tools/stop/stop.tool.ts` | tools-containers | regra-alterada | HIGH | DT2: default `dryRun` passa a executar (`?? false`); DT6: dependentes via `resolveDependents` compartilhado |
| `src/docker/tools/start/start.tool.ts` | tools-containers | regra-alterada | MEDIUM | DT6: dependências via `resolveDependencies` compartilhado (comportamento preservado, verificado por T015) |
| `src/docker/tools/create-container/create-container.tool.ts` | tools-containers | regra-alterada | HIGH | DT4: pull só quando imagem ausente localmente (`getImage().inspect()`); DT-CC-01: descrição "creates and starts" |
| `src/docker/tools/delete-image/delete-image.tool.ts` | tools-images | regra-nova | MEDIUM | DT-IMG-01: `#findImages` coleta todos os matches; prefixo ambíguo → erro orientando ID completo; 0 matches → "No image found matching" |
| `src/docker/tools/docker-status/docker-status.tool.ts` | tools-daemon | regra-alterada | MEDIUM | DT-ST: erro em texto `Error docker_status: <msg>` + `isError:true` (substitui JSON `{status:"unavailable"}`) |
| `src/docker/tools/exec-command/exec-command.tool.ts` | tools-container-ops | regra-alterada | LOW | DT5: `parseCommand` substitui `split(/\s+/)` (contrato inalterado, parsing melhora) |
| `src/docker/shared/parse-command.ts` | docker-shared | componente-novo | LOW | DT5: tokenizador puro de comando (aspas simples/duplas, escapes, vazio) |
| `src/docker/shared/dependency-resolver.ts` | docker-shared | componente-novo | MEDIUM | DT6: resolutores BFS direcionais `resolveDependents`/`resolveDependencies` com exclude e isolamento por project |
| `src/docker/prompts/compose-service/messages/assistant.message.ts` | prompts | regra-alterada | HIGH | DT3: removida referência inválida a `exec_command` com `args` inexistente; identificação de serviço via `list_containers` + `includeComposeMetadata: true` |
| `package.json` | core | regra-alterada | LOW | DT1: versão `0.0.1` → `0.1.0` (alinhada ao `McpServer`) |
| `AGENTS.md` | core (docs) | regra-alterada | LOW | DOC-01: 7 prompts reais, nota `ToolContainer` (G-08), limitação Dockerfile (DT7) |
| `README.md` | core (docs) | regra-alterada | LOW | DOC-01: 7 prompts em "Available Prompts", limitação Dockerfile (DT7) |
| `src/docker/shared/parse-command.ts` (testes) | docker-shared | componente-novo | LOW | T003: 100% do tokenizador |
| `src/docker/shared/dependency-resolver.ts` (testes) | docker-shared | componente-novo | LOW | T004: BFS, ordem, exclude, isolamento |
| testes de stop/start/create-container/delete-image/docker-status/exec-command | tools-* | regra-alterada | LOW | T013–T019: regressões DT2/DT4/DT5/DT-IMG-01/DT-ST + ordem do resolutor |
| `tests/server.test.ts` | core | regra-nova | LOW | TT-03 (DT1): versão server/package.json ambas `0.1.0` |
| testes de prompts compose-service | prompts | regra-nova | LOW | T024: regressão DT3 (sem `exec_command` inválido, via tools MCP) |

## Diff conceitual por componente

**tools-containers (stop/start):** o acoplamento aos resolutores privados de dependência foi removido em favor de `resolveDependents`/`resolveDependencies` em `docker-shared`. O contrato de entrada (schema Zod) não mudou. A única mudança de comportamento intencional é o default de `dryRun` no stop: antes a primeira chamada sempre retornava preview (`?? true`); agora executa (`?? false`), coerente com o schema declarado e com a doc da tool. Ordem de parada/início preservada e verificada por testes de chamada (`getContainer` em ordem).

**tools-containers (create_container):** o pull de imagem passou de incondicional para condicional — consulta `getImage(imageRef).inspect()`; só puxa se a imagem não existir localmente. Descrição da tool ajustada para refletir que cria E inicia.

**tools-images (delete_image):** o filtro agora coleta todos os matches (antes pegava só o primeiro implicitamente). Prefixos ambíguos falham com mensagem orientando o full image ID; ausência de match retorna "No image found matching: <id>".

**tools-daemon (docker_status):** falha de daemon retorna texto `Error docker_status: <msg>` + `isError:true` no lugar do objeto `{status:"unavailable"}`. Cálculo de `reclaimable_bytes` (apenas `Containers === 0`) preservado.

**tools-container-ops (exec_command):** parsing de comando delegado ao `parseCommand` compartilhado — aspas e escapes agora são respeitados; contrato de entrada/saída inalterado.

**docker-shared (novo):** dois utilitários puros, sem estado, cobertos por 84 testes unitários.

**prompts (compose_service):** eliminada a única referência inválida do prompt a `exec_command` (`args.command:"cat"` com `args` aninhado inexistente no schema). A identificação de serviços agora usa `list_containers` com `includeComposeMetadata: true` (labels `com.docker.compose.*`), coerente com R11 (topologia derivada de labels, sem ler arquivo).

**core/docs:** versão unificada em `0.1.0`; AGENTS.md/README listam os 7 prompts reais, a limitação de Dockerfile (DT7) e a nota do `ToolContainer` (G-08).

## Preservadas (regras 🟢 intactas)

- **R07** — prefixos de ID e substrings de nome case-insensitive em stop/start/list; `restart_container` exige nome exato ou prefixo de ID.
- **R08** — `exec_command` e `container_logs` aceitam apenas ID (nomes não).
- **R09** — respostas normalizam IDs para 12 chars; nomes sem `/` inicial.
- **R10** — `delete_image` aceita short/full ID, prefixo `sha256:` ou tag.
- **R11** — topologia derivada de labels Compose (sem ler arquivo) — agora também usada pelo prompt `compose_service`.
- **R12** — fecho transitivo apenas no mesmo project + respeito a `exclude` (mantido no resolver compartilhado; testado).
- **R13** — ordem de parada revertida (folha→pai) e início dependência→dependor (mantida; testada via ordem de `getContainer`).
- **R14** — parse da label `depends_on` como CSV com forma longa `svc:condition`.
- **R16–R19** — normalização de portas, healthcheck/resource units, associação de volume por labels `mcp.*`, validação de driver.
- **R20 (parcial)** — `reclaimable_bytes` apenas com `Containers === 0` permanece.
- **R21** — `prune_images` usa `Promise.allSettled`.
- **R22** — streams multiplexados com fallback texto cru (exec/logs).
- **R26** — sem RBAC; controle pelo socket local + gates das tools.

## Modificadas (regras 🟢 alteradas)

- **R15** — `create_container` fazia pull **sempre**; agora só quando a imagem não existe localmente (DT4).
- **R20 (formato)** — falha do daemon em `docker_status`: objeto `{status:"unavailable"}` → texto `Error docker_status: <msg>` + `isError:true` (DT-ST).
- **R23** — stop `dryRun ?? true` → `dryRun ?? false` (DT2); divergência schema×handler eliminada.

## Observações (regras 🟡 corrigidas)

- **R24 (era 🟡)** — `compose_service` não referencia mais `args` inexistente de `exec_command` (DT3); agora orienta via tools MCP.
- **R25 (era 🟡)** — versões `package.json`/`McpServer` unificadas em `0.1.0` (DT1).
