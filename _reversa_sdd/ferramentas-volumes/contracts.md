# Módulo Ferramentas Volumes, Contratos

## list_volumes
Input: `name?` (substring), `driver?`, `includeContainers=false`, `includeUsage=false`, `dangling=false`.
Output: `Array<{name, driver, mountpoint, scope, labels, options}>` + `usage?` (`{size_bytes, size_mb, ref_count}`) e `containers?` (array `{id(12), name, state}`).

## create_volume
Input: `containerId` (req, prefixo), `name?`, `driver=local` ∈ local|nfs|tmpfs|overlay2, `containerPath?`, `readOnly=false`, `nocopy=false`, `mountpoint?` [local], `nfsServer?`/`nfsShare?`/`nfsVersion?("3"|"4")` [nfs], `tmpfsSize?`/`tmpfsMode?` [tmpfs], `labels?`.
Output: `{created:true, volume:{name, driver, mountpoint, scope, labels, options}, container:{id(12), name, state}, mountOptions:{containerPath, readOnly, nocopy, extraOptions}, note}`.

## delete_volume
Input: `name` (req), `confirmed` (req). Sem `force`.
Output:
- preview: `{confirmed:false, message, preview:{name, driver, mountpoint, usingContainers, warning\|null}}`
- sucesso: `{deleted:true, name}`
- em uso: erro `Cannot delete volume "<name>": in use by container(s): ...`

## Erro padrão
`{content:[{type:"text", text:"Error <ctx>: <msg>"}], isError:true}`.
