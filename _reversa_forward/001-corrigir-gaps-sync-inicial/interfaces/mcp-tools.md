# Interfaces MCP: Tools afetadas

> Identificador: `001-corrigir-gaps-sync-inicial`
> Data: `2026-08-12`
> Contrato externo: tools do servidor MCP (JSON-RPC sobre stdio, via `McpServer.registerTool`).

Todas as mudanças abaixo são **deltas de comportamento/descrição** sobre contrato existente. Nenhum schema Zod de entrada é alterado. Base documental: `_reversa_sdd/data-dictionary.md`, `_reversa_sdd/ferramentas-containers/requirements.md`, `_reversa_sdd/ferramentas-imagens/requirements.md`, `_reversa_sdd/ferramentas-daemon/requirements.md`, `_reversa_sdd/operacoes-container/requirements.md`.

## 1. `stop_containers` — default de `dryRun`

- **Request:** inalterada (schema).
- **Response sucesso:** inalterada (`{success:true}` summarized; `{dryRun:false, results}` detalhado; `{dryRun:true, wouldStop:[...]}` em preview).
- **Mudança (DT2):** o default real de execução passa de preview para **execução**. Chamada sem `dryRun` **para** os containers. Preview somente com `dryRun:true`.
- **Erros:** inalterado — `Error stopping containers: <msg>` + `isError:true`.

| Campo | Antes | Depois |
|-------|-------|--------|
| handler default (sem `dryRun`) | `?? true` → preview | `?? false` → executa |

Idempotência: operação não idempotente por natureza (parar já-parado retorna sucesso sem efeito — comportamento atual mantido).

## 2. `create_container` — pull condicional e descrição

- **Request:** inalterada (`image` obrigatório + campos opcionais).
- **Mudança (DT4):** se a imagem `image` já existir localmente, **nenhum pull** é feito; criação prossegue direto. Se ausente, pull como hoje.
- **Mudança (DT-CC-01):** descrição da tool passa a ser **"Create a Docker container and start it"** — cria **e inicia** (comportamento atual já inicia).
- **Response:** inalterada (`{created:true, started:true, container:{...}}`).
- **Erros:** inalterado — `Error creating container: <msg>` + `isError:true` (inclui falha de pull/`createContainer`/`start`).

Idempotência: não idempotente (cada chamada cria um container novo).

## 3. `delete_image` — guarda de ambiguidade

- **Request:** inalterada (`id`, `force`, `confirmed`).
- **Mudança (DT-IMG-01):** o prefixo/id que casar **múltiplas** imagens não deleta mais o primeiro match arbitrário — retorna erro orientando o uso do ID completo.
- **Response:** inalterada nos demais casos (preview sem `confirmed`; `{deleted:true, id, tags, removed}` com `confirmed:true`).
- **Erros:**
  - prefixo ambíguo: `Error deleting image: Image ID <id> is ambiguous (<N> matches). Use the full image ID.` + `isError:true`
  - nenhum match: `Error deleting image: No image found matching: <id>` + `isError:true` (mantido)

Idempotência: após remoção, nova chamada com o mesmo ID → "No image found matching" (comportamento atual).

## 4. `docker_status` — formato de erro

- **Request:** inalterada (sem parâmetros).
- **Response sucesso:** inalterada (`{status:"running", version, system, containers, images, disk_usage, plugins, swarm, warnings}`).
- **Mudança (DT-ST):** falha do daemon (ping/info/version/df) retorna **texto** `Error docker_status: <msg>` + `isError:true`, substituindo o JSON `{status:"unavailable", error}`. Execução estrita mantida (ADR-0007: sem fallback por bloco; qualquer chamada de `Promise.all` falhando derruba a tool).
- **Timeouts:** herda o comportamento de timeout do dockerode (socket local; sem configuração própria nesta feature).

## 5. `exec_command` — parse de comando

- **Request:** inalterada (`id` — full ou prefixo, nome NÃO aceito; `command`; `silent`).
- **Mudança (DT5):** `command` é tokenizado respeitando aspas simples e duplas. `sh -c 'echo "a b"'` passa a gerar `["sh","-c","echo \"a b\""]` em vez de quebrar em espaços.
- **Response:** inalterada (`{containerId, command, exitCode, success, output?}`).
- **Erros:** inalterado — `Error executing command: <msg>` + `isError:true` (`Container not found`, `Container is not running`, falha de exec).

## 6. `compose_service` (prompt) — verificação (DT3)

- **Sem mudança de código.** O prompt já orienta via tools MCP (list_containers, start_containers, stop_containers, restart_container, container_logs) e não referencia `args` inexistente no schema de `exec_command`.
- **Ação:** teste de regressão garante que o template do prompt não referencia parâmetros inexistentes.
