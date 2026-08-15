# C4 — Contexto (Nível 1)

> Gerado pelo Architect em 2026-08-13. 🟢 CONFIRMADO.

```mermaid
flowchart TD
    subgraph usuarios[Usuários]
        Dev["Desenvolvedor / DevOps"]
    end

    subgraph agentes[Agentes de IA]
        Agent["Agente (Claude, Copilot, etc.)"]
    end

    System["DockerPilot MCP Server
    (TypeScript · Node.js · dockerode)"]

    Daemon["Docker Daemon
    (Engine API via socket local)"]
    Registry["Registries de Imagens
    (Docker Hub, privados)"]
    Compose["Docker Compose CLI
    (executado pelo agente)"]

    Dev -->|configura e executa| Agent
    Agent -->|MCP / stdio JSON-RPC| System
    System -->|dockerode · socket /var/run/docker.sock| Daemon
    System -->|pull imagem · followProgress| Registry
    Agent -->|comandos docker compose (bash)| Compose
```

## Descrição dos elementos

| Elemento | Tipo | Relacionamento |
|----------|------|----------------|
| DockerPilot MCP Server | Sistema | centro; expõe tools/prompts via MCP |
| Agente de IA | Ator | consome as tools e os prompts; orquestra o fluxo |
| Desenvolvedor/DevOps | Ator | decide e confirma operações destrutivas (gate `confirmed`) |
| Docker Daemon | Sistema externo | destino de todas as operações (container/imagem/volume/system) |
| Registries | Sistema externo | origem de imagens no pull |
| Docker Compose CLI | Sistema externo | usado pelos prompts compose (start/stop/restart) via Bash no host do agente |

## Regras de contorno

- Servidor não fala com o daemon por TCP/rede: apenas socket local (unix ou pipe).
- Confirmação humana acontece **no diálogo do agente**, não dentro do servidor.
