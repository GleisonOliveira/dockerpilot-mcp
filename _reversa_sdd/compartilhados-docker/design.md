# Módulo Compartilhados Docker, Design Técnico

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `BaseTool.register` | `(server: McpServer)` | `void` | abstrato |
| `BasePrompt.register` | `(server: McpServer)` | `void` | abstrato |
| `ContainerFieldResolvers.ports` | `(c: ContainerInfo)` | `{ports}` | |
| `ContainerFieldResolvers.mounts` | `(c: ContainerInfo)` | `{mounts}` | |
| `ContainerFieldResolvers.networks` | `(c: ContainerInfo)` | `{networks}` | network_id 12 chars |
| `ContainerFieldResolvers.labels` | `(c: ContainerInfo)` | `{labels}` | |
| `ContainerFieldResolvers.usage` | `(c: ContainerInfo, docker: Dockerode)` | `Promise<{usage\|null}>` | async |
| `ContainerFieldResolvers.healthcheck` | `(info: ContainerInspectInfo)` | `{healthcheck\|null}` | |
| `ContainerFieldResolvers.restartInfo` | `(info)` | `{restart_info}` | |
| `ContainerFieldResolvers.composeMetadata` | `(c)` | `{compose_metadata\|null}` | |
| `ContainerFieldResolvers.dependencyInfo` | `(c)` | `{dependency_info}` | |
| `ContainerFieldResolvers.resourceLimits` | `(info)` | `{resource_limits}` | |
| `ContainerFieldResolvers.stateDetails` | `(info)` | `{state_details}` | |

## Fluxo Principal
1. `list_containers.#enrichContainer` monta a base `{id(12), names, image, status, state}`.
2. Se alguma flag exigir inspect → 1 `inspect()` compartilhado.
3. `Promise.all` dos resolvers ativos; `Object.assign(base, ...extras)`.

## Fluxos Alternativos
- **inspect falha:** `.catch(() => null)` → healthcheck/restart/resource/state retornam `null`.
- **usage em container parado:** retorna `{usage: null}` sem chamar stats.

## Dependências
- `dockerode`, `DockerClient`.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| enriquecimento sob demanda (flags include*) | `list.tool.ts:63` | 🟢 |
| inspect único compartilhado | `list.tool.ts:70` | 🟢 |
| CPU% via delta cgroup | `list.resolvers.ts:34` | 🟢 |

## Estado Interno
Sem estado; métodos estáticos puros (exceto `usage` que lê stats).

## Observabilidade
Sem logs.

## Riscos e Lacunas
- 🟡 CPU% de containers com stats indisponíveis cai para 0 / null.
- 🔴 `mem_percent` divide por `memLimit` que pode ser 0 em configurações exóticas.
