# Módulo Ferramentas Containers, Contratos

> Schemas (Zod) e formas de saída das 6 tools. Fonte: `data-dictionary.md`.

## list_containers
Input: `all=false`, `id?`, `name?`, `status?` ∈ created|restarting|running|removing|paused|exited|dead, `includePorts/Mounts/Networks/Usage/Labels/Healthcheck/RestartInfo/ComposeMetadata/DependencyInfo/ResourceLimits/StateDetails` = false.
Output: `Array<{id(12), names, image, status, state}>` + opcionais (ver data-dictionary §2.1).

## stop_containers
Input: `names?`, `ids?`, `exclude?`, `timeout=10`, `force=false`, `stopDependents=false`, `summarized=true`, `dryRun=false`.
Output: preview `{dryRun, force, timeout, stopDependents, wouldStop[]}` | `{success:true}` | `{dryRun:false, results:[{id,name,dependent,stopped,error?}]}`.

## start_containers
Input: `names?`, `ids?`, `exclude?`, `startDependencies=false`, `summarized=true`, `dryRun=false`.
Output: preview `{dryRun, startDependencies, wouldStart[]}` | `{success:true}` | `{dryRun:false, results:[{id,name,dependency,started,error?}]}`.

## restart_container
Input: `id` (req).
Output: `{restarted:true, container:{id,name,status}}`.

## delete_container
Input: `id` (req), `force=false`, `removeImage=false`, `confirmed` (req).
Output: preview `{confirmed:false, message, preview:{id,name,image,state,status,force,removeImage}}` | `{deleted:true, id, name}` (+ image result se removeImage).

## create_container
Input: `image` (req), `name?`, `command?: string[]`, `env?: record`, `ports?: [{host,container}]`, `volumes?: string[]`, `networks?: string[]`, `restart_policy?` ∈ no|always|on-failure|unless-stopped, `healthcheck?: {test:string[], interval_seconds?, timeout_seconds?, retries?, start_period_seconds?}`, `resources?: {memory_mb?, cpu_shares?, cpu_quota?≥1000, cpu_period?≥1000}`, `labels?: record`.
Output: `{created, started, container:{id,name,image,status,ports,networks,restartPolicy}}`.

## Erro padrão (todas)
`{content:[{type:"text", text:"Error <ctx>: <msg>"}], isError:true}`.
