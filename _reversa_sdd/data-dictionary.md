# Dicionário de Dados — dockerpilot-mcp

> Gerado pelo Archaeologist em 2026-08-13. Confiança: 🟢 CONFIRMADO (lido do código-fonte).
> Cobre: entidades de entrada (schemas Zod das tools), entidades de saída (formas de resposta) e saídas dos resolvers.

---

## 1. Entidades de entrada (schemas Zod das tools)

### 1.1 list_containers
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `all` | boolean | false | incluir parados |
| `id` | string | — | prefixo, case-insensitive; precede `name` |
| `name` | string | — | substring, case-insensitive |
| `status` | enum | — | `created\|restarting\|running\|removing\|paused\|exited\|dead` |
| `includePorts` | boolean | false | |
| `includeMounts` | boolean | false | |
| `includeNetworks` | boolean | false | |
| `includeUsage` | boolean | false | só running; stats async |
| `includeLabels` | boolean | false | |
| `includeHealthcheck` | boolean | false | requer inspect |
| `includeRestartInfo` | boolean | false | requer inspect |
| `includeComposeMetadata` | boolean | false | |
| `includeDependencyInfo` | boolean | false | |
| `includeResourceLimits` | boolean | false | requer inspect |
| `includeStateDetails` | boolean | false | requer inspect |

### 1.2 list_images
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `name` | string | — | substring em RepoTags/RepoDigests, case-insensitive |
| `all` | boolean | false | incluir intermediárias |
| `includeDigests` | boolean | false | |
| `includeContainers` | boolean | false | filtro `ancestor` |
| `dangling` | boolean | false | filtro `dangling:["true"]` |

### 1.3 list_volumes
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `name` | string | — | substring, case-insensitive |
| `driver` | string | — | filtro `driver` |
| `includeContainers` | boolean | false | filtro `volume` |
| `includeUsage` | boolean | false | pode ser lento |
| `dangling` | boolean | false | filtro `dangling:["true"]` |

### 1.4 stop_containers
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `names` | string[] | — | substring, case-insensitive; omitir = todos running |
| `ids` | string[] | — | prefixo |
| `exclude` | string[] | — | nomes ou IDs protegidos |
| `timeout` | number (int ≥0) | 10 | segundos antes do SIGKILL |
| `force` | boolean | false | kill() imediato |
| `stopDependents` | boolean | false | BFS sobre depends_on (mesmo project) |
| `summarized` | boolean | true | true → `{success:true}` |
| `dryRun` | boolean | false | ⚠ handler efetivamente usa `?? true` (linha 157) |

### 1.5 start_containers
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `names` | string[] | — | substring; omitir = todos parados |
| `ids` | string[] | — | prefixo |
| `exclude` | string[] | — | |
| `startDependencies` | boolean | false | BFS inverso sobre depends_on |
| `summarized` | boolean | true | |
| `dryRun` | boolean | false | handler usa `?? false` (correto) |

### 1.6 delete_container
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `id` | string (req) | — | prefixo de ID |
| `force` | boolean | false | SIGKILL em running |
| `removeImage` | boolean | false | remove imagem via `ImageID` após remoção |
| `confirmed` | boolean (req) | — | **gate obrigatório** |

### 1.7 delete_image
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `id` | string (req) | — | short ID / full ID / `sha256:` / tag |
| `force` | boolean | false | remove mesmo em stopped containers |
| `confirmed` | boolean (req) | — | **gate obrigatório** |

### 1.8 prune_images
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `force` | boolean | false | |
| `confirmed` | boolean (req) | — | **gate obrigatório** |

### 1.9 delete_volume
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `name` | string (req) | — | nome exato |
| `confirmed` | boolean (req) | — | **gate obrigatório** |

### 1.10 create_volume
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `containerId` | string (req) | — | prefixo; associa via labels |
| `name` | string | — | omitir → Docker gera |
| `driver` | enum | `local` | `local\|nfs\|tmpfs\|overlay2` |
| `containerPath` | string | — | mount path sugerido (não monta) |
| `readOnly` | boolean | false | mount opt `ro` |
| `nocopy` | boolean | false | mount opt `nocopy` |
| `mountpoint` | string | — | [local] `device,type=none,o=bind` |
| `nfsServer` | string | — | [nfs] opt `addr` |
| `nfsShare` | string | — | [nfs] opt `device=:share` |
| `nfsVersion` | enum | — | `"3"\|"4"` (opt `vers`) |
| `tmpfsSize` | string | — | [tmpfs] opt `size` (ex. 100m) |
| `tmpfsMode` | string | — | [tmpfs] opt `mode` (octal) |
| `labels` | record<string,string> | — | + labels `mcp.container.id`, `mcp.container.name` |

### 1.11 create_container
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `image` | string (req) | — | nome + tag opcional |
| `name` | string | — | |
| `command` | string[] | — | override do CMD |
| `env` | record<string,string> | — | → `K=V` |
| `ports` | array<{host, container}> | — | host `'8080'`/`'0.0.0.0:8080'`; container `'80'`/`'80/tcp'` |
| `volumes` | string[] | — | formato Docker; `:ro` aceito |
| `networks` | string[] | — | → EndpointsConfig `{}` |
| `restart_policy` | enum | — | `no\|always\|on-failure\|unless-stopped` |
| `healthcheck` | {test, interval_seconds?, timeout_seconds?, retries?, start_period_seconds?} | — | seg→ns (×1e9) |
| `resources` | {memory_mb?, cpu_shares?, cpu_quota?≥1000, cpu_period?≥1000} | — | mb→bytes; CpuPeriod default 100000 se só quota |
| `labels` | record<string,string> | — | |

### 1.12 exec_command
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `id` | string (req) | — | prefixo; **nome NÃO aceito**; exige running |
| `command` | string (req) | — | split `/\s+/` |
| `silent` | boolean | false | omite `output` |

### 1.13 container_logs
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `id` | string (req) | — | prefixo; **nome NÃO aceito** |
| `tail` | number (int, ≥1) | 5 | linhas finais |

### 1.14 pull_image
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `image` | string (req) | — | `nginx:latest`; default latest |

### 1.15 restart_container
| Campo | Tipo | Default | Regras |
|-------|------|---------|--------|
| `id` | string (req) | — | nome exato (sem `/`) ou prefixo de ID |

### 1.16 docker_status
Sem parâmetros (`inputSchema: {}`).

---

## 2. Entidades de saída (formas de resposta)

### 2.1 list_containers → array de itens
Base: `{ id: string(12), names: string[], image: string, status: string, state: string }`
+ opcionais por flag:
- `ports` → `ContainerInfo.Ports`
- `mounts` → `ContainerInfo.Mounts`
- `networks` → `[{ name, ip, gateway, mac, network_id(12) }]`
- `usage` → `{ cpu_percent, mem_usage_mb, mem_limit_mb, mem_percent }` | `null` (não running / falha)
- `labels` → `Record<string,string>`
- `healthcheck` → `{ status, failing_streak, last_log }` | `null`
- `restart_info` → `{ policy, max_retry_count, restart_count }`
- `compose_metadata` → `{ project, service, config_files, working_dir, container_number }` | `null`
- `dependency_info` → `string[]`
- `resource_limits` → `{ memory_mb, memory_reservation_mb, memory_swap_mb, nano_cpus, cpu_shares, cpu_quota, cpu_period, pids_limit }`
- `state_details` → `{ pid, exit_code, error, started_at, finished_at, oom_killed, paused, restarting, dead }`

### 2.2 list_images → array
`{ id(12), tags, created(ISO), size_mb, virtual_size_mb, containers }` + `digests` (flag) + `running_containers: [{id(12), name}]` (flag).

### 2.3 list_volumes → array
`{ name, driver, mountpoint, scope, labels, options }` + `usage: {size_bytes, size_mb, ref_count}` + `containers: [{id(12), name, state}]`.

### 2.4 stop_containers
dryRun: `{ dryRun: true, force, timeout|null, stopDependents, wouldStop: [{id(12), name, dependent}] }`
real (summarized): `{ success: true }`
real (full): `{ dryRun: false, results: [{id(12), name, dependent, stopped, error?}] }`

### 2.5 start_containers
dryRun: `{ dryRun: true, startDependencies, wouldStart: [{id(12), name, dependency}] }`
real (summarized): `{ success: true }`
real (full): `{ dryRun: false, results: [{id(12), name, dependency, started, error?}] }`

### 2.6 delete_container
preview: `{ confirmed: false, message, preview: {id(12), name, image, state, status, force, removeImage} }`
sucesso: `{ deleted: true, id(12), name }` (+ `{imageRemoved, image, imageError}` se removeImage).

### 2.7 delete_image
preview: `{ confirmed: false, message, preview: {id(12), tags, size_mb, created(ISO), force} }`
sucesso: `{ deleted: true, id(12), tags, removed }`

### 2.8 prune_images
vazio: `{ deleted: false, message }`
preview: `{ confirmed: false, message, preview: {count, total_size_mb, images: [{id(12), size_mb, created}]} }`
sucesso: `{ deleted: true, count, failed_count, total_freed_mb, images: [{id(12), size_mb, removed}], errors? }`

### 2.9 delete_volume
preview: `{ confirmed: false, message, preview: {name, driver, mountpoint, usingContainers, warning|null} }`
sucesso: `{ deleted: true, name }`

### 2.10 create_volume
`{ created: true, volume: {name, driver, mountpoint, scope, labels, options}, container: {id(12), name, state}, mountOptions: {containerPath|null, readOnly, nocopy, extraOptions}, note }`

### 2.11 create_container
`{ created: true, started: true, container: {id(12), name, image, status, ports, networks, restartPolicy} }`

### 2.12 exec_command
`{ containerId(12), command, exitCode, success, output? }` (`silent` omite output).

### 2.13 container_logs
`{ containerId(12), tail, logs: string[] }`

### 2.14 pull_image
`{ pulled: true, image, id: slice(7,19)|null, tags, size_bytes|null }`

### 2.15 restart_container
`{ restarted: true, container: {id(12), name, status} }`

### 2.16 docker_status
`{ status: "running", version: {engine, api, go, os, arch, kernel, build_time}, system: {hostname, os, os_type, kernel, architecture, cpus, memory_total_bytes, docker_root_dir, logging_driver, cgroup_driver, cgroup_version}, containers: {total, running, paused, stopped}, images: {total}, disk_usage: {images: {count, total_size_bytes, reclaimable_bytes}, volumes: {count, total_size_bytes}, build_cache: {count, total_size_bytes}}, plugins: {volume, network, log}, swarm: {active, state}, warnings }`

### 2.17 Erro padrão (todas as tools)
`{ content: [{ type: "text", text: "Error <contexto>: <mensagem>" }], isError: true }`

---

## 3. Contratos com o daemon Docker (dockerode)

| Fonte | Chamada dockerode | Notas |
|-------|-------------------|-------|
| list | `listContainers({all, filters?})` | `filters` como JSON string |
| list images | `listImages({all, digests, filters?})` | |
| list volumes | `listVolumes({filters?})` | destrutura `{Volumes}` |
| stop | `stop({t})` / `kill()` | |
| start | `start()` | |
| restart | `restart()` + `inspect()` | |
| delete container | `remove({force})` / imagem `remove({force})` via `ImageID` | |
| delete image | `remove({force})` | |
| prune | `remove({force})` por imagem | `allSettled` |
| delete volume | `listVolumes(filters name)` + `getVolume(name).remove()` | bloqueia em uso |
| create volume | `createVolume({Name, Driver, DriverOpts, Labels})` | |
| create container | `pull` + `createContainer` + `start` + `inspect` | HostConfig/NetworkingConfig |
| exec | `exec({Cmd, AttachStdout, AttachStderr})` → `start({hijack:true})` → `inspect()` | frames multiplexados |
| logs | `logs({stdout, stderr, tail})` | frames multiplexados |
| pull | `pull` + `modem.followProgress` + `listImages({filters reference})` | |
| status | `info()` + `version()` + `df()` | |

## 4. Constantes de domínio

| Constante | Valor |
|-----------|-------|
| `VALID_STATES` | created, restarting, running, removing, paused, exited, dead |
| `RESTART_POLICIES` | no, always, on-failure, unless-stopped |
| `VALID_DRIVERS` | local, nfs, tmpfs, overlay2 |
| `NFS_VERSION` | "3", "4" |
| Labels Compose lidas | `com.docker.compose.project`, `.service`, `.depends_on`, `.project.config_files`, `.project.working_dir`, `.container-number` |
| Labels MCP gravadas | `mcp.container.id`, `mcp.container.name` |
| Formato ID em respostas | 12 chars (exceto pull_image: `slice(7,19)`) |
| Socket | `/var/run/docker.sock` (Unix) · `//./pipe/docker_engine` (Windows) |
