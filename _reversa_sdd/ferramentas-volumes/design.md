# Módulo Ferramentas Volumes, Design Técnico

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `ListVolumesTool.#handle` | `(input)` | `VolumeItem[]` | opcionais containers/usage |
| `CreateVolumeTool.#handle` | `({containerId, driver, ...})` | `{created, volume, container, mountOptions, note}` | containerId req |
| `DeleteVolumeTool.#handle` | `({name, confirmed})` | `preview \| deleted` | sem force |

## Fluxo Principal

### list_volumes
1. `listVolumes({filters})` — `dangling:["true"]` e/ou `driver` se pedido.
2. Filtro `name` (substring case-insensitive) cliente-side.
3. Base por volume: `{name, driver, mountpoint, scope, labels, options}`.
4. Opcionais: `usage` (`v.UsageData` → size_bytes/size_mb/ref_count), `containers` (via `listContainers({volume:[name]})`).

### create_volume
1. Guard: `containerId` obrigatório.
2. `findContainer` por prefixo de ID; erro se não achar.
3. `#buildDriverOpts` por driver:
   - local+mountpoint → `{device, type:"none", o:"bind"}`
   - nfs → `{addr?, device?:`:${share}`, vers?}`
   - tmpfs → `{size?, mode?}`
4. `#buildMountOptions` → `["ro"]`/`["nocopy"]` conforme flags.
5. `createVolume({Name, Driver, DriverOpts, Labels:{..., mcp.container.id, mcp.container.name}})`.
6. Retorna volume + container + mountOptions + note (Docker não suporta hot-mount).

### delete_volume
1. Guard: `name` obrigatório.
2. `#getUsingContainers` via `listContainers({all, filters:{volume:[name]}})` (catch → []).
3. Sem confirmed → preview `{name, driver, mountpoint, usingContainers, warning|null}` (exige volume existente).
4. Em uso → erro bloqueante com nomes/ids/states.
5. `getVolume(name).remove()` → `{deleted:true, name}`.

## Fluxos Alternativos
- **listContainers falha no getUsingContainers:** `.catch(() => [])`.
- **Preview de volume inexistente:** erro `No volume found with name: <name>`.

## Dependências
- `DockerClient`, `tryCatch`.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| containerId obrigatório + labels mcp.* | `create-volume.tool.ts:123-151` | 🟢 |
| campos estruturados por driver (não driver_opts) | `create-volume.tool.ts:92-113` | 🟢 |
| detecção de uso via filtro volume | `delete-volume.tool.ts:21-30` | 🟢 |
| sem force no delete_volume | `delete-volume.tool.ts:8-12` | 🟢 |

## Estado Interno
Sem estado.

## Observabilidade
Previews de confirmação; erros de uso com nomes dos containers.

## Riscos e Lacunas
- 🟡 Detecção de uso via `listContainers` depende do daemon indexar o filtro `volume`.
- 🟡 `overlay2` no enum, mas `#buildDriverOpts` não tem ramo específico (cai sem opts).
