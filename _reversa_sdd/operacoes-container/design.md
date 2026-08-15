# Módulo Operações em Container, Design Técnico

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `ExecCommandTool.#handle` | `({id, command, silent})` | `{containerId, command, exitCode, success, output?}` | |
| `ContainerLogsTool.#handle` | `({id, tail})` | `{containerId, tail, logs: string[]}` | |

## Fluxo Principal

### exec_command
1. Guards: `id` e `command` obrigatórios.
2. `listContainers({all:true})` → match por prefixo de ID.
3. Se `State !== "running"` → erro.
4. `exec({Cmd: split(/\s+/), AttachStdout, AttachStderr})` → `start({hijack:true, stdin:false})`.
5. Acumula chunks; no `end`, parse frames multiplexados: `[4B stream][4B size BE][payload]`, concatena payloads; fallback `raw.toString()`.
6. `exec.inspect()` → `ExitCode`; `success = exitCode === 0`; `output = trimEnd()` a menos `silent`.

### container_logs
1. Match por prefixo de ID.
2. `container.logs({stdout:true, stderr:true, tail})`.
3. Se Buffer → direto; senão `Buffer.from(str,"binary")`.
4. Parse frames (mesmo algoritmo) → `split("\n").filter(l => l.length > 0)`.

## Fluxos Alternativos
- **Sem frames válidos:** fallback para texto cru.
- **Stream erro:** `stream.on("error", reject)`.

## Dependências
- `DockerClient`, `tryCatch`.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| ID-only (sem nomes) | `exec-command.tool.ts:46` | 🟢 |
| parse de frames compartilhado entre as 2 tools (duplicado) | `exec-command.tool.ts:70`, `container-logs.tool.ts:54` | 🟢 |
| split `/\s+/` | `exec-command.tool.ts:56` | 🟢 |

## Estado Interno
Sem estado.

## Observabilidade
Saída text/JSON normalizada.

## Riscos e Lacunas
- 🟡 DT5: comandos com aspas (ex. `sh -c 'echo "a b"'`) quebram no split.
- 🟡 Parser de frames assumido (formato oficial do Docker) — confiável.
