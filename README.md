# DockerPilot MCP

TypeScript MCP server that exposes Docker commands as tools for AI agents.

Allows agents (Claude, Copilot, etc.) to interact with Docker containers via the MCP protocol — no direct shell access needed.

## Requirements

- Docker running locally with socket at `/var/run/docker.sock`
- Node.js 20+

## Installation

```bash
npm install
npm run build
```

## Scripts

```bash
npm run dev           # run in dev mode (tsx, no build)
npm run dev:watch     # auto-compile on save (tsup --watch)
npm run build         # compile to dist/
npm run start         # execute dist/index.js
npm test              # run tests with Vitest
npm run test:watch    # tests in watch mode
npm run test:coverage # tests + coverage report
npm run lint          # check linting
npm run lint:fix      # auto-fix linting issues
npm run typecheck     # check TypeScript errors
npm run check         # lint + typecheck + tests
```

## Testing with MCP Inspector

Build once and inspect:

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

For development with auto-recompilation, use two terminals:

```bash
# Terminal 1 — recompile on save
npm run dev:watch

# Terminal 2 — Inspector (refresh browser to pick up new changes)
npx @modelcontextprotocol/inspector node dist/index.js
```

## Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dockerpilot": {
      "command": "node",
      "args": ["/path/to/container-commands-mcp/dist/index.js"]
    }
  }
}
```

## Architecture

```
src/
  index.ts                        # entrypoint: connects server to stdio transport
  server.ts                       # registers all tools on McpServer
  tools.config.ts                 # array with all ToolConstructor registered
  di/
    tool-container.ts             # DI: instantiates tools from ToolConstructor[]
  utils/
    try-catch.ts                  # tryCatch<T> wrapper for async errors
  docker/
    client.ts                     # Dockerode singleton (socket /var/run/docker.sock)
    shared/
      base.tool.ts                # abstract BaseTool with register() method
      list.resolvers.ts           # ContainerFieldResolvers (optional container fields)
    tools/
      list/list.tool.ts           # tool list_containers
      stop/stop.tool.ts           # tool stop_containers
      start/start.tool.ts         # tool start_containers
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_containers` | Lists Docker containers. `all=true` includes stopped ones. |
| `stop_containers` | Stops running containers by name or ID. Supports exclude, timeout, force, stopDependents, and dryRun. |
| `start_containers` | Starts stopped containers by name or ID. Supports exclude, startDependencies, and dryRun. |

## Adding a New Tool

1. Create `src/docker/tools/<name>/<name>.tool.ts` exporting a class `extends BaseTool`
2. Define Zod schema locally in the tool file
3. Implement `#handle(input)` using `tryCatch` to capture errors
4. Implement `register(server)` calling `server.registerTool(..., this.#handle.bind(this))`
5. Add the class to `src/tools.config.ts` in the `toolClasses` array
6. Create test in `tests/docker/tools/<name>/<name>.tool.test.ts`

Required pattern:
- Zod validation
- Use `tryCatch` from `utils/try-catch.ts` as error wrapper — never manual try/catch in `#handle`
- Error return: `{ content: [{ type: "text", text: "Error ...: <message>" }], isError: true }`
- Success return: `{ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }`

## Conventions

- One directory per tool in `src/docker/tools/<name>/`
- Zod schema defined locally in the tool file (not exported)
- No global state beyond the `docker` singleton in `client.ts`
- Tests mock `DockerClient` directly — never depend on real Docker
- Tools without prefix: `list_containers`, `stop_containers`, not `dockerpilot_*`
