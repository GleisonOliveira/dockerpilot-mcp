# Módulo Operações em Container, Contratos

## exec_command
Input: `id` (req, prefixo, nome NÃO aceito), `command` (req), `silent=false`.
Output: `{containerId(12), command, exitCode, success, output?}` — output omitido se `silent`.

## container_logs
Input: `id` (req, prefixo), `tail=5` (int ≥1).
Output: `{containerId(12), tail, logs: string[]}` (stdout+stderr combinados, linhas vazias filtradas).

## Erro padrão
`{content:[{type:"text", text:"Error <ctx>: <msg>"}], isError:true}`.
