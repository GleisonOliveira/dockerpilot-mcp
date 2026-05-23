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
  index.ts              # entrypoint: connects server to stdio transport
  server.ts             # registers all tools on McpServer
  docker/
    client.ts           # Dockerode singleton (socket /var/run/docker.sock)
    tools/
      list.ts           # tool list_containers
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_containers` | Lists Docker containers. `all=true` includes stopped ones. |

## Adding a New Tool

1. Create `src/docker/tools/<name>.ts`
2. Export Zod schema (`<name>Schema`) and async function
3. Register in `server.ts` with `server.registerTool(...)`
4. Create test in `tests/<name>.test.ts` with mocked client

Required pattern:
- Zod validation
- Docker errors propagated as exceptions (MCP SDK converts automatically)
- Always return `{ content: [{ type: "text", text: JSON.stringify(...) }] }`

## Conventions

- One file per tool in `src/docker/tools/`
- Zod schemas exported with `Schema` suffix
- No global state beyond the `docker` singleton in `client.ts`
- Tests use `vi.mock` to mock the client — never depend on real Docker
- Tools without prefix: `list_containers`, not `dockerpilot_list_containers`
