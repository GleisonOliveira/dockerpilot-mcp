# Módulo Ferramentas Containers, Design Técnico

## Interface
Ver `_reversa_sdd/ferramentas-containers/contracts.md` para schemas completos (Zod) e formas de saída.

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `ListContainersTool.#handle` | `(input)` | `ContainerItem[]` | enriquecimento sob demanda |
| `StopContainersTool.#handle` | `(input)` | `preview \| {success} \| {results}` | BFS dependentes |
| `StartContainersTool.#handle` | `(input)` | `preview \| {success} \| {results}` | BFS dependências |
| `RestartContainerTool.#handle` | `({id})` | `{restarted, container}` | match nome exato/prefixo |
| `DeleteContainerTool.#handle` | `({id, force, removeImage, confirmed})` | `preview \| {deleted,...}` | gate confirmed |
| `CreateContainerTool.#handle` | `(input)` | `{created, started, container}` | pull+create+start |

## Fluxo Principal

### stop_containers
1. `listContainers({all:false})` → running.
2. `#resolvePrimaryTargets` (names/ids/exclude).
3. Se `stopDependents` → `#resolveDependents` BFS: novos dependentes = containers cujo `depends_on` inclui service de um alvo da fronteira (mesmo project); resultado `reverse()`.
4. targets = dependentes (exceto primários) + primários.
5. Se `dryRun` (handler `?? true`) → preview `wouldStop`.
6. `stop({t})` ou `kill()` (force) por container em `Promise.all`.

### start_containers
1. `listContainers({all:true, filters:{status:[exited,created,paused]}})`.
2. `#resolveDependencies` BFS inverso (dependências profundas primeiro); targets = deps + primários.
3. `dryRun ?? false` → preview; senão `start()`.

### create_container
1. Pull da imagem (`docker.pull` + `followProgress`).
2. Conversões: env→`K=V`; portas→`ExposedPorts`/`PortBindings` (`/tcp` se sem protocolo); healthcheck seg→ns; `memory_mb`→bytes; CpuPeriod default 100000.
3. `createContainer({Image, HostConfig, NetworkingConfig})` → `start()` → `inspect()`.

## Fluxos Alternativos
- **Sem filtros no stop/start:** todos os running/parados (respeitando exclude).
- **Inspect falha (restart):** erro "Container not found".
- **Imagem não encontrada no pull:** erro normalizado do daemon.

## Dependências
- `DockerClient`, `ContainerFieldResolvers`, `tryCatch`, `Dockerode`.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| dependentes via labels, BFS, mesmo project | `stop.tool.ts:101-132` | 🟢 |
| dependências via BFS inverso | `start.tool.ts:93-129` | 🟢 |
| pull sempre antes do create | `create-container.tool.ts:154` | 🟢 |
| `dryRun ?? true` no stop | `stop.tool.ts:157` | 🟢 |

## Estado Interno
Sem estado persistente entre chamadas.

## Observabilidade
Respostas JSON normalizadas; previews de dryRun/confirmed.

## Riscos e Lacunas
- 🔴 DT2: stop dryRun default divergente.
- 🟡 pull duplicado quando imagem já existe localmente (DT4).
- 🟡 BFS depende de labels Compose presentes no container.
