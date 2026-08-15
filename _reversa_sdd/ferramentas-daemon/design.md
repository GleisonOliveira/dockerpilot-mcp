# Módulo Ferramentas Daemon, Design Técnico

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `DockerStatusTool.#handle` | `()` | `StatusReport` | sem input |

## Fluxo Principal
1. `Promise.all([docker.info(), docker.version(), docker.df()])` — se qualquer um rejeitar, a tool inteira falha.
2. Monta relatório:
   - `status: "running"`
   - `version`: engine/api/go/os/arch/kernel/build_time (de `version()`).
   - `system`: hostname/os/os_type/kernel/architecture/cpus/memory_total_bytes/docker_root_dir/logging_driver/cgroup_driver/cgroup_version (de `info()`).
   - `containers`: total/running/paused/stopped (Containers*).
   - `images`: total.
   - `disk_usage.images`: count, total_size_bytes, reclaimable_bytes (soma de ReclaimableSize onde Containers===0).
   - `disk_usage.volumes`: count, total_size_bytes (soma de UsageData.Size).
   - `disk_usage.build_cache`: count, total_size_bytes.
   - `plugins`: volume/network/log (de info.Plugins).
   - `swarm`: `{active, state}` (`LocalNodeState ?? "inactive"`).
   - `warnings`: info.Warnings ?? [].

## Fluxos Alternativos
- **Erro (daemon fora do ar):** `{content:[{type:"text", text: JSON.stringify({status:"unavailable", error})}], isError:true}` — formato próprio, divergente das outras tools.

## Dependências
- `DockerClient`, `tryCatch`.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| containers direto de info.Containers* | `docker-status.tool.ts:42-47` | 🟢 |
| sem fallback por bloco (Promise.all estrito) | `docker-status.tool.ts:16` | 🟢 |
| erro em JSON `{status:"unavailable"}` | `docker-status.tool.ts:90-94` | 🟢 |

## Estado Interno
Sem estado.

## Observabilidade
Relatório JSON único com avisos do daemon.

## Riscos e Lacunas
- 🔴 DT-ST: formato de erro não padronizado.
- 🟡 `df()` pode demorar com muitos containers/imagens (sem timeout).
