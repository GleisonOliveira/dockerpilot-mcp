# DockerPilot MCP

[![npm version](https://img.shields.io/npm/v/dockerpilot-mcp)](https://www.npmjs.com/package/dockerpilot-mcp)
[![node version](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![publish](https://github.com/GleisonOliveira/dockerpilot-mcp/actions/workflows/publish.yml/badge.svg)](https://github.com/GleisonOliveira/dockerpilot-mcp/actions/workflows/publish.yml)

TypeScript MCP server that exposes Docker commands as tools and prompts for AI agents.

Allows AI agents to interact with Docker containers via the MCP protocol — no direct shell access needed.

## Requirements

- Docker running locally with socket at `/var/run/docker.sock`
- Node.js 22+

## Installation

The recommended way is via `npx` — no installation required:

```bash
npx -y dockerpilot-mcp@latest
```

To update to the latest version:

```bash
npm install -g dockerpilot-mcp@latest
```

## AI Client Integration

<details>
<summary><strong>Claude Code</strong></summary>

Run in terminal:

```bash
claude mcp add dockerpilot -- npx -y dockerpilot-mcp@latest
```

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dockerpilot": {
      "command": "npx",
      "args": ["-y", "dockerpilot-mcp@latest"]
    }
  }
}
```

> **Note:** After saving the config, a full computer restart may be required for Claude Desktop to detect the new MCP server.

</details>

<details>
<summary><strong>Cursor</strong></summary>

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "dockerpilot": {
      "command": "npx",
      "args": ["-y", "dockerpilot-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><strong>Windsurf</strong></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "dockerpilot": {
      "command": "npx",
      "args": ["-y", "dockerpilot-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><strong>Copilot (VS Code)</strong></summary>

Add to `.vscode/mcp.json` (project) or user `settings.json` (global):

```json
{
  "mcp": {
    "servers": {
      "dockerpilot": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "dockerpilot-mcp@latest"]
      }
    }
  }
}
```

</details>

<details>
<summary><strong>OpenAI Codex</strong></summary>

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.dockerpilot]
command = "npx"
args = ["-y", "dockerpilot-mcp@latest"]
```

</details>

<details>
<summary><strong>Local build (any client)</strong></summary>

Build locally and point to the output:

```bash
npm install
npm run build
```

Then use `node /path/to/container-commands-mcp/dist/index.js` as the command in your client config.

</details>

## Available Tools

| Tool | Description |
|------|-------------|
| `list_containers` | Lists Docker containers. `all=true` includes stopped ones. Supports filters by name, id, status, and optional fields (ports, mounts, networks, usage, healthcheck, etc.). |
| `list_images` | Lists Docker images. Supports filters by name/tag, dangling, and optional fields (digests, containers). |
| `list_volumes` | Lists Docker volumes. Supports filters by name, driver, dangling, and optional fields (containers using each volume, usage size). |
| `stop_containers` | Stops running containers by name or ID. Supports exclude, timeout, force, stopDependents, and dryRun. |
| `start_containers` | Starts stopped containers by name or ID. Supports exclude, startDependencies, and dryRun. |
| `delete_container` | Deletes a container by ID. Requires `confirmed=true`. Shows a preview when `confirmed=false`. Supports `force` and `removeImage`. |
| `delete_image` | Deletes an image by ID (short, full, or tag). Requires `confirmed=true`. Shows a preview when `confirmed=false`. Supports `force`. |
| `create_volume` | Creates a Docker volume with optional driver (local/nfs/tmpfs/overlay2), mount options, and driver-specific configuration. Returns volume name and suggested container mount path. |
| `delete_volume` | Deletes a Docker volume by ID. Requires `confirmed=true`. Shows a preview when `confirmed=false`. Detects if volume is in use before deletion. |
| `create_container` | Creates and starts a Docker container. Requires `image`. Supports `name`, `command`, `env`, `ports`, `volumes`, `networks`, `restart_policy`, `healthcheck`, `resources`, and `labels`. Pulls the image automatically before creation. |
| `pull_image` | Pulls a Docker image from a registry by name and optional tag (e.g. `nginx:latest`). Returns image id, tags, and size after a successful pull. |
| `restart_container` | Restarts a Docker container by name or ID prefix. Returns container id, name, and status after restart. |
| `docker_status` | Returns Docker daemon health and system information: engine version, container counts, disk usage (images, volumes, build cache), plugins, Swarm state, and daemon warnings. No parameters required. |
| `exec_command` | Executes a command inside a running Docker container. Accepts container ID (full or prefix) — names are NOT accepted. Returns stdout/stderr output and the command exit code. |
| `container_logs` | Fetches the last N log lines from a Docker container. Accepts container ID (full or prefix) — names are NOT accepted. Returns stdout and stderr combined. Defaults to last 5 lines. |

## Available Prompts

| Prompt | Description | When to activate |
|--------|-------------|------------------|
| `container_troubleshoot` | Diagnostic guide for Docker container problems | User reports container not working, not starting, port conflict, crash loop, etc. |
| `image_cleanup` | Guide to reclaim disk space by removing dangling images | User reports low disk space or wants to clean up unused Docker images. |
| `volume_removal` | Safe Docker volume removal workflow with risk assessment and double-confirmation for high-risk volumes (databases, app state, secrets). | User wants to remove a Docker volume safely. |

## Architecture

```
src/
  index.ts                        # entrypoint: connects server to stdio transport
  server.ts                       # registers all tools and prompts on McpServer
  tools.config.ts                 # array with all ToolConstructor registered
  prompts.config.ts               # array with all PromptConstructor registered
  di/
    tool-container.ts             # DI: instantiates tools from ToolConstructor[]
    prompt-container.ts           # DI: instantiates prompts from PromptConstructor[]
  utils/
    try-catch.ts                  # tryCatch<T> wrapper for async errors
  docker/
    client.ts                     # Dockerode singleton (socket /var/run/docker.sock)
    shared/
      base.tool.ts                # abstract BaseTool with register() method
      base.prompt.ts              # abstract BasePrompt with register() method
      list.resolvers.ts           # ContainerFieldResolvers (optional container fields)
    tools/
      list/list.tool.ts                 # tool list_containers
      list-images/list-images.tool.ts   # tool list_images
      list-volumes/list-volumes.tool.ts # tool list_volumes
      stop/stop.tool.ts                 # tool stop_containers
      start/start.tool.ts               # tool start_containers
      delete/delete.tool.ts             # tool delete_container
      delete-image/delete-image.tool.ts # tool delete_image
      create-volume/create-volume.tool.ts # tool create_volume
      delete-volume/delete-volume.tool.ts # tool delete_volume
      create-container/create-container.tool.ts # tool create_container
      pull-image/pull-image.tool.ts       # tool pull_image
      restart/restart.tool.ts             # tool restart_container
      docker-status/docker-status.tool.ts # tool docker_status
      exec-command/exec-command.tool.ts   # tool exec_command
      container-logs/container-logs.tool.ts # tool container_logs
    prompts/
      container-troubleshoot/           # prompt container_troubleshoot
      image-cleanup/                    # prompt image_cleanup
      volume-removal/                   # prompt volume_removal
```

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

## Adding a New Prompt

1. Create `src/docker/prompts/<name>.prompt.ts` exporting a class `extends BasePrompt`
2. Define Zod schema for the prompt arguments
3. Implement `register(server)` calling `server.registerPrompt(...)`
4. Add the class to `src/prompts.config.ts` in the `promptClasses` array

Required pattern:
- Prompts must be written in English
- Zod schema defined locally in the prompt file (not exported)
- Prompts do not receive `DockerClient` — they are guidance messages for the agent only

## Conventions

- One directory per tool in `src/docker/tools/<name>/`
- Zod schema defined locally in the tool file (not exported)
- No global state beyond the `docker` singleton in `client.ts`
- Tests mock `DockerClient` directly — never depend on real Docker
- Tools without prefix: `list_containers`, `stop_containers`, not `dockerpilot_*`

## Development

<details>
<summary><strong>Scripts</strong></summary>

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

</details>

<details>
<summary><strong>Testing with MCP Inspector</strong></summary>

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

</details>

## Credits

- [Dockerode](https://github.com/apocas/dockerode) — Node.js Docker API client used under the hood to communicate with the Docker daemon
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) — official TypeScript SDK for the Model Context Protocol
