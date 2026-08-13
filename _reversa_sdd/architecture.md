# Arquitetura — dockerpilot-mcp

> Gerado pelo Architect em 2026-08-13. Doc level: completo. Confiança: 🟢 CONFIRMADO salvo indicação.

## 1. Visão geral

Servidor **MCP** em TypeScript/Node que expõe o daemon Docker como **16 tools** e **7 prompts** para agentes de IA. Comunicação via **stdio** — o servidor é um processo filho do agente. Todo acesso ao Docker passa por `dockerode` sobre o socket local do daemon; o servidor não mantém estado persistente próprio (nenhum banco de dados).

**Estilo arquitetural:** pipeline de registro (bootstrap) + extensão por herança (`BaseTool`/`BasePrompt`) + DI por construtor. Cada tool encapsula 100% de sua lógica em `#handle`.

## 2. Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 20+ (ECMAScript Modules) |
| Linguagem | TypeScript |
| SDK MCP | `@modelcontextprotocol/sdk` |
| Cliente Docker | `dockerode` (socket `/var/run/docker.sock` / pipe Windows) |
| Validação | `zod` |
| Testes | Vitest (threshold cobertura 95%) |
| CI | GitHub Actions (lint, build, test, coverage) |

## 3. Modelo de execução

1. `index.ts` → singleton `dockerClient` → `ToolContainer` (16 tools) + `PromptContainer` (7 prompts) → `DockerPilotServer`.
2. `DockerPilotServer` registra cada tool/prompt no `McpServer` (contrato `register(server)`).
3. `start()` conecta ao `StdioServerTransport`; processo vive enquanto o agente estiver ativo.
4. Chamadas de tool: schema Zod → guard de obrigatórios → `tryCatch` → `checkConnection()` (ping) → operação dockerode → resposta JSON (`isError` em falha).

## 4. Containers (deployment)

- **DockerPilot MCP Server** — deployável Node.js único (`dist/index.js`). Sem Dockerfile; publicado via npm (`npx`). É executado como processo do host (acesso ao socket do daemon).
- **Docker Daemon** — sistema externo obrigatório (socket local).
- **Runtime do agente** — hospeda o servidor; executa também Bash (usado pelos prompts Compose start/stop/restart, que instruem o agente a rodar `docker compose`).

## 5. Integrações externas

| Integração | Protocolo | Direção | Notas |
|------------|-----------|---------|-------|
| Docker Engine API | HTTP sobre socket unix/pipe | saída | via dockerode: `listContainers`, `inspect`, `stop`, `start`, `kill`, `restart`, `remove`, `pull`, `exec`, `logs`, `info`, `version`, `df`, `createVolume`, `listVolumes`, `removeVolume` |
| Docker Registries | HTTP/HTTPS | saída | pull de imagens (`modem.followProgress`) |
| Cliente MCP (agente) | MCP/stdio | entrada | JSON-RPC sobre stdio |

## 6. Módulos (11)

| Módulo | Responsabilidade |
|--------|------------------|
| core | bootstrap, servidor MCP, registros de tools/prompts |
| di | containers de instanciação (tools com client, prompts sem) |
| utils | wrapper `tryCatch` |
| docker-client | singleton Dockerode + `checkConnection` |
| docker-shared | contratos `BaseTool`/`BasePrompt` + `ContainerFieldResolvers` |
| tools-containers | list, stop, start, restart, delete, create |
| tools-container-ops | exec, logs |
| tools-images | list, delete, pull, prune |
| tools-volumes | list, create, delete |
| tools-daemon | docker_status |
| prompts | troubleshoot, image-cleanup, volume-removal, 4× compose |

## 7. Dívidas técnicas

| # | Dívida | Evidência | Severidade |
|---|--------|-----------|-----------|
| DT1 | Versões divergentes: `package.json` `0.0.1` vs `McpServer` `0.1.0` | code-analysis.md R25 | média |
| DT2 | `dryRun ?? true` no stop diverge do schema (`default false`) | stop.tool.ts:157 | média |
| DT3 | Prompt `compose_service` referencia `exec_command` com `args` inexistente no schema | code-analysis.md 🟡 | baixa |
| DT4 | `pull_image` e `create_container` não verificam presença local da imagem antes do pull | pull-image.tool.ts | baixa |
| DT5 | `exec_command` divide comando por `/\s+/` — sem suporte a aspas/argumentos compostos | exec-command.tool.ts:56 | baixa |
| DT6 | Duplicação deliberada dos BFS stop/start (`resolveDependents`/`resolveDependencies`) | ADR-0004 | baixa (aceita) |
| DT7 | Sem deploy Dockerfile próprio (só npm/npx) | glob | baixa |
