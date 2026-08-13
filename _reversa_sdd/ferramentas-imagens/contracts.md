# Módulo Ferramentas Imagens, Contratos

## list_images
Input: `name?` (substring em tags/digests), `all=false` (incluir intermediárias), `includeDigests=false`, `includeContainers=false`, `dangling=false`.
Output: `Array<{id(12), tags: string[], created(ISO), size_mb, virtual_size_mb, containers}>` + `digests?` (flag includeDigests) e `running_containers?` (array `{id(12), name}`, flag includeContainers).

## delete_image
Input: `id` (req: short/full/`sha256:`/tag), `force=false`, `confirmed` (req).
Output: preview `{confirmed:false, message, preview:{id(12), tags, size_mb, created, force}}` | `{deleted:true, id(12), tags, removed}`.
Observação: o primeiro match do `find()` vence — sem guarda de ambiguidade.

## pull_image
Input: `image` (req).
Output: `{pulled:true, image, id: string\|null, tags: string[], size_bytes: number\|null}`.

## prune_images
Input: `force=false`, `confirmed` (req).
Output:
- vazio: `{deleted:false, message:"No dangling images found."}`
- preview: `{confirmed:false, message, preview:{count, total_size_mb, images:[{id, size_mb, created}]}}`
- sucesso: `{deleted:true, count, failed_count, total_freed_mb, images:[{id, size_mb, removed}], errors?: string[]}`

## Erro padrão
`{content:[{type:"text", text:"Error <ctx>: <msg>"}], isError:true}`.
