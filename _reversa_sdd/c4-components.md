# C4 — Componentes (Nível 3)

> Gerado pelo Architect em 2026-08-13. 🟢 CONFIRMADO.

```mermaid
flowchart TD
    subgraph Server["DockerPilot MCP Server"]
        Boot["index.ts
        bootstrap"]
        Registrar["DockerPilotServer
        registra tools/prompts no McpServer"]
        TI["ToolContainer
        new (client) => BaseTool"]
        PI["PromptContainer
        new () => BasePrompt"]

        subgraph Tools["16 tools"]
            TC["tools-containers
            list stop start restart delete create"]
            TCO["tools-container-ops
            exec_command container_logs"]
            TI2["tools-images
            list delete pull prune"]
            TV["tools-volumes
            list create delete"]
            TD["tools-daemon
            docker_status"]
        end

        subgraph Shared["docker-shared"]
            BT["BaseTool"]
            BP["BasePrompt"]
            R["ContainerFieldResolvers
            ports mounts networks usage healthcheck
            restart compose dep limits state"]
        end

        DC["DockerClient
        Dockerode singleton · checkConnection"]
        UT["utils/tryCatch"]
        CFG["tools.config.ts + prompts.config.ts"]
    end

    Daemon["Docker Daemon"]

    Boot --> Registrar
    CFG --> TI
    CFG --> PI
    TI --> Tools
    PI --> Prompts["7 prompts"]
    Tools --> BT
    Tools --> R
    Tools --> DC
    Tools --> UT
    Prompts --> BP
    Registrar --> Tools
    Registrar --> Prompts
    DC -->|socket| Daemon
```

## Responsabilidades

| Componente | Responsabilidade | Depende de |
|------------|------------------|------------|
| `index.ts` | monta DI e inicia o servidor | DockerClient, ToolContainer, PromptContainer, DockerPilotServer |
| `DockerPilotServer` | cria `McpServer`, itera containers e registra | McpServer SDK |
| `ToolContainer` | instancia tools com o client | ToolConstructor[], DockerClient |
| `PromptContainer` | instancia prompts sem args | PromptConstructor[] |
| `BaseTool`/`BasePrompt` | contratos abstratos `register(server)` | McpServer |
| `ContainerFieldResolvers` | enriquecimento opcional de containers | Dockerode |
| `DockerClient` | wrapper do daemon + ping | Dockerode, socket |
| `tryCatch` | normalização de erros | — |
| 16 tools | operações do daemon via dockerode | DockerClient, tryCatch, (resolvers/shared) |
| 7 prompts | mensagens orientadoras | templates de mensagens |
