# Análise de Código — dockerpilot-mcp

> Gerado pelo Archaeologist em 2026-08-13. Doc level: completo.
> Escala de confiança: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA

---

## 1. Arquitetura geral

Servidor **MCP** que expõe o daemon Docker como ferramentas. Padrão: **herança + registro central + DI por construtor**, sem frameworks de inversão de controle.

Fluxo de bootstrap (`src/index.ts`):
1. `dockerClient` singleton → `ToolContainer` (instancia tools com o client) → `PromptContainer` (instancia prompts sem args) → `DockerPilotServer`.
2. `DockerPilotServer` cria `McpServer` e itera `toolContainer.getTools()` / `promptContainer.getPrompts()` chamando `register(server)`.
3. `server.start()` conecta ao `StdioServerTransport` (só finaliza se o processo for encerrado).

**Contratos de extensão:**
- `ToolConstructor = new (client: DockerClient) => BaseTool`
- `PromptConstructor = new () => BasePrompt`
- `BaseTool.register(server: McpServer): void` (abstrato)
- `BasePrompt.register(server: McpServer): void` (abstrato)

**Padrão transversal de handler de tool:** cada `#handle`:
1. Validação manual de campos obrigatórios (não confia só no Zod) → retorno `isError: true` precoce.
2. Envolve o corpo inteiro em `tryCatch` (nunca try/catch manual).
3. `await this.client.checkConnection()` — ping no daemon antes de qualquer operação.
4. Chama dockerode via `this.client.getDocker()`.
5. Sucesso → `{ content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] }`.
6. Falha → `{ content: [{ type: "text", text: "Error <nome>: <erro>" }], isError: true }`.

**Tratamento de erros (`utils/try-catch.ts`):** wrapper genérico `tryCatch<T>` que normaliza qualquer erro para `{ success: false, error: string }`, extraindo `err.message` quando `err instanceof Error`.

---

## 2. Módulo por módulo

### 2.1 core — `src/index.ts`, `src/server.ts`, `src/tools.config.ts`, `src/prompts.config.ts`

- **`index.ts`**: monta a DI e chama `server.start()`. Sem lógica de negócio. 🟢
- **`server.ts` (`DockerPilotServer`)**: compõe `McpServer` (nome `dockerpilot-mcp`, versão `0.1.0`); registra tools e prompts na ordem em que os containers devolvem. `start()` conecta ao stdio. 🟢
- **`tools.config.ts`**: lista estática com as 16 classes de tool. 🟢
- **`prompts.config.ts`**: lista estática com as 7 classes de prompt. 🟢
- **Observação de versão:** `package.json` versão `0.0.1`; `McpServer` reporta `0.1.0` — versões distintas (possível lag no versionamento). 🟡

### 2.2 di — `tool-container.ts`, `prompt-container.ts`

- `ToolContainer` mapeia `ToolConstructor[]` → `BaseTool[]` injetando o `DockerClient`. `getTools()` expõe a lista. 🟢
- `PromptContainer` idêntico, sem injeção. 🟢
- DI é um "map-and-store" trivial; sem lazy loading, sem ciclo de vida. 🟢

### 2.3 utils — `try-catch.ts`

- `TryCatchResult<T> = { success: true; result: T } | { success: false; error: string }` (union discriminada). 🟢
- Pega qualquer exceção, inclui erro não-Error via `String(err)`. 🟢

### 2.4 docker-client — `docker/client.ts`

- `DockerClient` encapsula `Dockerode`. Socket: `/var/run/docker.sock` (Unix) ou `//./pipe/docker_engine` (Windows, detectado via `process.platform`). 🟢
- `checkConnection()` → `docker.ping()`; falha vira `Error` com mensagem orientada por plataforma. 🟢
- `dockerClient` singleton exportado. 🟢

### 2.5 docker-shared — `base.tool.ts`, `base.prompt.ts`, `list.resolvers.ts`

- `BaseTool`/`BasePrompt`: contratos abstratos de registro (ver 2.1). 🟢
- **`ContainerFieldResolvers`** — funções estáticas de enriquecimento de containers:
  - `ports`, `mounts`, `labels`, `networks` (mapeia redes → `{name, ip, gateway, mac, network_id}` com `network_id` truncado em 12 chars), `composeMetadata`, `dependencyInfo`, `restartInfo`, `healthcheck`, `resourceLimits`, `stateDetails` — derivados de `ContainerInfo`/`ContainerInspectInfo`. 🟢
  - `usage(c, docker)` — **único resolver assíncrono**; calcula CPU% e memória via `docker.getContainer(id).stats({stream:false})`. Retorna `{ usage: null }` se o container não estiver `running` ou se stats falhar. 🟢

### 2.6 tools-containers (list, stop, start, restart, delete, create-container)

**`list_containers`** (`list.tool.ts`):
- Filtros no servidor: `id` (prefixo, case-insensitive, precedência sobre name), `name` (substring case-insensitive), `status` (enum de 7 estados). Filtro de status vai como `filters` JSON no `listContainers`. 🟢
- Enriquecimento sob demanda com 10 flags `include*`. Para flags que exigem inspect, um único `inspect()` é feito e compartilhado (`needsInspect`). Resolvers rodam em `Promise.all`. 🟢
- Base do item: `{ id (12 chars), names, image, status, state }`. 🟢

**`stop_containers`** (`stop.tool.ts`):
- Seleção de alvos primários: por names (substring) ou ids (prefixo); sem filtros → todos os running. Exclusão via `exclude`. 🟢
- **Algoritmo de dependentes (`#resolveDependents`):** BFS por fronteira sobre containers do **mesmo Compose project** cuja label `com.docker.compose.depends_on` (parse: split `,` → item `"svc:condition"` → nome antes de `:`) inclui o service de um alvo da fronteira. Resultado **revertido** (dependentes mais externos primeiro). 🟢
- `dryRun` retorna preview (`wouldStop` com `dependent` flag). `force` usa `kill()` (SIGKILL), senão `stop({t: timeout})`. `summarized: true` (default) esconde a lista por-container em execução real. 🟢

**`start_containers`** (`start.tool.ts`):
- Alvos: containers `exited|created|paused`. **`#resolveDependencies`:** espelho de BFS, mas invertido semanticamente — acha quem um target **depende** (deve iniciar antes). Reverse final = folhas antes de raízes. 🟢
- `dryRun` preview; execução com `start()`. 🟢

**`restart_container`** (`restart.tool.ts`):
- Aceita nome (exato, sem `/`) ou prefixo de ID. Erro se não achar. `restart()` + `inspect()` → `{id, name, status}`. 🟢

**`delete_container`** (`delete.tool.ts`):
- **Gate de segurança:** `confirmed: true` obrigatório; senão retorna preview (não executa). 🟢
- `#findContainer` por prefixo de ID. `force` + `removeImage` opcionais; remoção da imagem usa `ImageID` (não o nome). 🟢

**`create_container`** (`create-container.tool.ts`):
- **Faz pull automático** da imagem via `docker.pull` + `modem.followProgress` antes de criar. 🟢
- Conversões: env record → array `K=V`; portas → `ExposedPorts` (`container/tcp` se sem protocolo) e `PortBindings` (`HostPort`); healthcheck segundos → nanosegundos (`*1e9`); `resources.memory_mb` → bytes; `CpuPeriod` default `100000` quando `cpu_quota` informado sem period. 🟢
- Redes → `NetworkingConfig.EndpointsConfig` com `{}` por rede. Restart policy enum 4 valores. 🟢
- Retorna `{created, started, container:{id, name, image, status, ports, networks, restartPolicy}}`. 🟢

### 2.7 tools-container-ops (exec-command, container-logs)

**`exec_command`** (`exec-command.tool.ts`):
- **Não aceita nome** — apenas ID (prefixo). Requer container `running`. 🟢
- `command` string → split por `/\s+/` → `exec({Cmd, AttachStdout, AttachStderr})`, `start({hijack:true})`.
- **Parser de stream multiplexado:** loop de frames com header de 8 bytes (4 bytes stream + 4 bytes size big-endian); coleta payloads e concatena. Fallback para `raw.toString()` se nenhum frame válido. 🟢
- `exec.inspect()` → `ExitCode`; `success = exitCode === 0`; `silent` omite `output`. 🟢

**`container_logs`** (`container-logs.tool.ts`):
- ID (prefixo), `tail` (int positivo, default 5). `container.logs({stdout, stderr, tail})`. 🟢
- Mesmo parser de frames multiplexados; resultado quebra linhas e filtra vazias → `logs: string[]`. 🟢

### 2.8 tools-images (list-images, delete-image, pull-image, prune-images)

**`list_images`** (`list-images.tool.ts`):
- Filtros: `name`/tag (substring case-insensitive em RepoTags e RepoDigests), `dangling`, `all`, `includeDigests`, `includeContainers` (via filtro `ancestor` no listContainers). 🟢
- Base: `{id (12), tags, created (ISO), size_mb, virtual_size_mb, containers}`. 🟢

**`delete_image`** (`delete-image.tool.ts`):
- **Gate `confirmed`.** `#findImage` aceita ID curto (12), ID completo (sem `sha256:`), ID com prefixo `sha256:`, ou tag (igual ou prefixo). 🟢
- Preview com `{id, tags, size_mb, created, force}`. Remoção com `force` opcional. 🟢

**`pull_image`** (`pull-image.tool.ts`):
- `docker.pull(image)` + `followProgress`; depois `listImages` filtrado por `reference` para capturar o resultado. Retorna `{pulled, image, id (slice 7,19), tags, size_bytes}`. 🟢
- 🟡 Se o filtro por `reference` não retornar nada (ex. tag resolvida por digest), `id`/`tags`/`size_bytes` vêm `null`/`[]`.

**`prune_images`** (`prune-images.tool.ts`):
- Lista dangling (`filters: {dangling:["true"]}`); se vazio → `{deleted:false, message}`. Gate `confirmed` → preview com contagem e `total_size_mb`. 🟢
- Remoção paralela com `Promise.allSettled`; separa `succeeded`/`failed`, soma `total_freed_mb`. 🟢

### 2.9 tools-volumes (list-volumes, create-volume, delete-volume)

**`list_volumes`** (`list-volumes.tool.ts`):
- Filtros: `name` (substring), `driver`, `dangling`. `includeContainers` (filtro `volume` no listContainers), `includeUsage` (UsageData). 🟢

**`create_volume`** (`create-volume.tool.ts`):
- Requer `containerId` (prefixo) — associa o volume a um container **via labels** (`mcp.container.id`, `mcp.container.name`), não via mount. 🟢
- Drivers: `local|nfs|tmpfs|overlay2`. `#buildDriverOpts`: local+bind (`device=path, type=none, o=bind`), nfs (`addr, device=:share, vers`), tmpfs (`size, mode`). 🟢
- Mount options: `ro`, `nocopy`. Nota no retorno explica que **Docker não faz hot-mount**; container precisa ser recriado. 🟢

**`delete_volume`** (`delete-volume.tool.ts`):
- Gate `confirmed`. Lista containers em uso (filtro `volume`). Preview avisa se em uso; **bloqueia remoção** se houver containers usando (erro explícito — Docker não força remoção de volume em uso). 🟢

### 2.10 tools-daemon (docker-status)

**`docker_status`** (`docker-status.tool.ts`):
- `Promise.all([info, version, df])` → agrega: versão do engine (version), info do host (system), contadores (containers/images), **disk_usage** (images/volumes/build_cache com `reclaimable_bytes` somado apenas para imagens com `Containers === 0`), plugins, swarm (`LocalNodeState === "active"`), warnings. 🟢
- Em erro → `{ status: "unavailable", error }` com `isError: true`. 🟢

### 2.11 prompts (7 prompts)

Todos seguem o padrão `server.registerPrompt(name, {description, argsSchema}, (args) => ({messages}))`. As mensagens são construídas por funções `build*Messages` em templates, que delegam para `messages/user.message.ts` e `messages/assistant.message.ts`.

| Prompt | Args (Zod) | Conteúdo |
|--------|-----------|----------|
| `container_troubleshoot` | `container_name?`, `symptom?` | Guia de diagnóstico em 5 passos: verificar daemon → estado do container → causas (exit codes, OOM, porta, rede, healthcheck, dead, dependências) → ações (start/stop/restart com dryRun) → logs. Usa list_containers/start/stop/container_logs. 🟢 |
| `image_cleanup` | — | Preview → mostrar ao usuário → autorização → `prune_images confirmed:true` → relatório. 🟢 |
| `volume_removal` | — | Workflow destrutivo com **avaliação de risco** (sinais de banco/estado/secrets no nome do volume e de containers) e **dupla confirmação** para alto risco (typing `DELETE`). Stop force → delete → restart. 🟢 |
| `compose_start` | `project_dir?` | Instrui `docker compose up -d` via Bash + verificação com list_containers. 🟢 |
| `compose_stop` | `project_dir?` | `docker compose down` via Bash + verificação + prune opcional. 🟢 |
| `compose_restart` | `project_dir?` | Opção A (restart) / B (down + up). 🟢 |
| `compose_service` | `service_name?`, `action? (start\|stop\|restart)` | Gerencia **um** serviço via tools MCP (não Bash): ler compose file, localizar container, start/stop/restart, logs. 🟢 |

🟡 **Inconsistência detectada:** o passo "0. Read the Compose file" de `compose_service` instrui `exec_command` com `args: { command: "cat", args: ["docker-compose.yml"] }`, mas a tool `exec_command` só aceita `{id, command, silent}` — o bloco `args` na instrução não corresponde ao schema real. 🔴 LACUNA (não validei a runtime; é uma instrução de prompt, não código).

---

## 3. Algoritmos e lógica não-trivial

| Algoritmo | Local | Descrição |
|-----------|-------|-----------|
| Cálculo de CPU% do container | `list.resolvers.ts:usage` | Delta de `cpu_stats.cpu_usage.total_usage` e `precpu_stats`; `numCpus` de `online_cpus` (fallback `percpu_usage.length`, fallback 1); `cpuPercent = (delta/systemDelta) * numCpus * 100`. Memória exclui cache (`usage - stats.cache`). Arredonda 2 casas. 🟢 |
| Resolução de dependentes (stop) | `stop.tool.ts:#resolveDependents` | Fecho transitivo BFS sobre `depends_on` (mesmo project); ordem invertida. 🟢 |
| Resolução de dependências (start) | `start.tool.ts:#resolveDependencies` | Fecho transitivo BFS inverso; dependências profundas primeiro. 🟢 |
| Parse de stream multiplexado do Docker | `exec-command.tool.ts` e `container-logs.tool.ts` | Frames `[4B stream][4B size BE][payload]`; concatena payloads; fallback raw. 🟢 |
| Parse de label `depends_on` | stop/start | `"a:condition_started,b"` → `["a","b"]` (nome antes de `:`). 🟢 |
| Normalização de portas | `create-container.tool.ts` | `"80"` → `"80/tcp"`; `"80/udp"` preservado. 🟢 |
| Conversões de unidades | create-container | Healthcheck seg→ns; `memory_mb`→bytes; CpuPeriod default 100000µs. 🟢 |
| Disk usage reclaimable | `docker-status.tool.ts` | Só soma `ReclaimableSize` de imagens sem containers (`Containers === 0`). 🟢 |
| Match de imagem | `delete-image.tool.ts:#findImage` | 4 formas: short ID, full ID, `sha256:` full, tag (igual/prefixo). 🟢 |
| Remoção em lote tolerante a falha | `prune-images.tool.ts` | `allSettled` → sucesso/falha separados; soma espaço liberado. 🟢 |

---

## 4. Padrões e convenções de domínio

- **Labels Docker Compose usadas como fonte de verdade de topologia:** `com.docker.compose.project`, `.service`, `.depends_on`, `.project.config_files`, `.project.working_dir`, `.container-number`. 🟢
- **Labels próprias (`create_volume`):** `mcp.container.id`, `mcp.container.name` para associar volume→container sem bind. 🟢
- **IDs sempre truncados para 12 chars** nas respostas (exceto `pull_image` que usa `slice(7,19)`). 🟢
- **Nomes de containers normalizados:** `/` inicial removido. 🟢
- **Filtros passados ao dockerode sempre como JSON string** (`JSON.stringify({...})`) quando o método espera `filters`. 🟢
- **Case-insensitive em todos os matches de nome/ID** (`toLowerCase()`), exceto match exato de nome no `restart_container` (case-insensitive via lower ambos). 🟢
- **Safe-by-default:** todas as operações destrutivas (delete container/image/volume, prune) exigem `confirmed: true` explícito; stop/start têm `dryRun`. 🟢

## 5. Observações de design / riscos

- `stop.tool.ts:#handle` usa `input.dryRun ?? true` (linha 157) — **default efetivo de dryRun é `true`**, embora o schema declare default `false`. Sempre retorna preview na primeira chamada. 🟢🟡 (comportamento intencional de segurança provável, mas divergente do schema; flag de confiança: padrão em `start` usa `?? false` corretamente).
- `start.tool.ts` filtra por `status: ["exited","created","paused"]` — um container `restarting` não é candidato a start. 🟢
- `create_container` faz pull de imagem sempre, mesmo que já exista localmente (não verifica antes). 🟢
- `exec_command`/`container_logs` não aceitam nomes — contrato explícito documentado na tool. 🟢
- Versões conflitantes `0.0.1` (package.json) vs `0.1.0` (McpServer). 🟡
- Nenhuma autenticação, nenhuma variável de ambiente lida pelo runtime além do socket de plataforma. Sem configuração por ambiente. 🟢

## 6. Resumo

- **Arquivos-fonte:** 55 (`src/`), 50 testes.
- **Tools:** 16 — 6 containers, 2 container-ops, 4 images, 3 volumes, 1 daemon.
- **Prompts:** 7 — 3 standalone + 4 compose.
- **Classes:** `DockerClient`, `DockerPilotServer`, `ToolContainer`, `PromptContainer`, `ContainerFieldResolvers`, `ListContainersTool` + 15 tools, `ContainerTroubleshootPrompt` + 6 prompts, `BaseTool`, `BasePrompt`.
- **Algoritmos não-triviais:** 10 (seção 3).
- **Entidades/DTOs:** os schemas Zod das 16 tools + formas de resposta por tool + saídas de resolvers (ver `data-dictionary.md`).
