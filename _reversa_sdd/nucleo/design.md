# Módulo Core, Design Técnico

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `main` (index.ts) | `()` | `Promise<void>` | monta DI e chama `server.start()` |
| `DockerPilotServer.constructor` | `(tools: BaseTool[], prompts: BasePrompt[])` | `DockerPilotServer` | cria McpServer |
| `DockerPilotServer.start` | `()` | `Promise<void>` | conecta StdioServerTransport |
| `ToolContainer.getTools` | `()` | `BaseTool[]` | |
| `PromptContainer.getPrompts` | `()` | `BasePrompt[]` | |

## Fluxo Principal
1. `index.ts` importa `dockerClient` singleton (`src/docker/client.ts`).
2. `new ToolContainer(toolClasses, dockerClient)` → 16 tools (`src/tools.config.ts`).
3. `new PromptContainer(promptClasses)` → 7 prompts (`src/prompts.config.ts`).
4. `new DockerPilotServer(tools, prompts)` cria `McpServer({name:"dockerpilot-mcp", version:"0.1.0"})` e registra cada contrato (`register(server)`).
5. `server.start()` conecta ao `StdioServerTransport` (`src/index.ts`).

## Fluxos Alternativos
- **Falha de ping do daemon:** não ocorre no bootstrap (o ping é por tool); startup não valida o daemon.
- **Processo encerrado:** transporte stdio encerra o processo filho junto do agente.

## Dependências
- `@modelcontextprotocol/sdk` (`McpServer`, `StdioServerTransport`) — transporte e registro.
- `DockerClient` (`src/docker/client.ts`) — injeção nas tools.
- containers de DI (`src/di/`) — instanciação.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| stdio como transporte único | `src/server.ts` (StdioServerTransport) | 🟢 |
| registro programático via contratos `register(server)` | `src/server.ts`, `src/docker/shared/base.tool.ts` | 🟢 |
| versão do McpServer fixada em 0.1.0 | `src/server.ts` | 🟢 |

## Estado Interno
Sem estado persistente. Estado efêmero: arrays de tools/prompts instanciados e o `McpServer`.

## Observabilidade
Sem logs/métricas próprios; respostas de erro são normalizadas pelas tools (`isError: true`).

## Riscos e Lacunas
- 🟡 Versão do servidor divergente do package.json (DT1).
- 🔴 Sem tratamento explícito de falha de bootstrap (processo morre com exceção).
