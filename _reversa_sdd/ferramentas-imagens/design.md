# Módulo Ferramentas Imagens, Design Técnico

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `ListImagesTool.#handle` | `(input)` | `ImageItem[]` | opcionais digests/running_containers |
| `DeleteImageTool.#handle` | `({id, force, confirmed})` | `preview \| deleted` | find() primeiro match |
| `PullImageTool.#handle` | `({image})` | `{pulled, image, id, tags, size_bytes}` | sem parse de tag |
| `PruneImagesTool.#handle` | `({force, confirmed})` | `preview \| deleted \| vazio` | allSettled |

## Fluxo Principal

### list_images
1. `listImages({all, digests, filters})` — `dangling:["true"]` se pedido.
2. Filtro `name` (substring case-insensitive em RepoTags **e** RepoDigests).
3. Base por imagem: `{id(12), tags, created(ISO), size_mb, virtual_size_mb, containers}`.
4. Opcionais: `digests` (RepoDigests), `running_containers` (via `listContainers({ancestor})`, `Promise.all`).

### delete_image
1. Guard: `confirmed` verdadeiro senão preview `{id, tags, size_mb, created, force}`.
2. `find()` sobre listImages: shortId(12) / fullId / `sha256:` / tag (prefixo ou exato).
3. 0 matches → erro `No image found matching: <id>`.
4. `getImage(match.Id).remove({force})` → `{deleted, id(12), tags, removed}`.

### pull_image
1. Guard: `image` não vazio.
2. `docker.pull(image)` + `modem.followProgress` (aguarda fim do stream).
3. `listImages({filters:{reference:[image]}})` → `pulled = images[0]`.
4. Retorna `{pulled, image, id: pulled?.Id.slice(7,19) ?? null, tags, size_bytes}`.

### prune_images
1. `listImages({filters:{dangling:["true"]}})`.
2. Vazio → `{deleted:false, message:"No dangling images found."}`.
3. Guard confirmed senão preview `{count, total_size_mb, images:[{id, size_mb, created}]}`.
4. `Promise.allSettled` remove por imagem; separa fulfilled/rejected.
5. Retorna `{deleted, count, failed_count, total_freed_mb, images, errors?}`.

## Fluxos Alternativos
- **Inclusão de containers no list_images:** `listContainers` falha → `.catch(() => [])`.
- **allSettled parcial:** `errors` presente apenas se houver falha.

## Dependências
- `DockerClient`, `tryCatch`.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| find() sem guarda de ambiguidade | `delete-image.tool.ts:29-39` | 🟢 |
| pull sem parse de name:tag | `pull-image.tool.ts:34` | 🟢 |
| preview do prune calculado de listImages | `prune-images.tool.ts:26-41` | 🟢 |
| allSettled no prune | `prune-images.tool.ts:55` | 🟢 |

## Estado Interno
Sem estado.

## Observabilidade
Previews de dry-run/confirmação; métricas de freed/failed.

## Riscos e Lacunas
- 🔴 DT-IMG-01: prefixo de ID ambíguo deleta o primeiro match (falta guarda).
- 🔴 DT-PULL: sem feedback progressivo no pull.
- 🟡 `id: slice(7,19)` depende do formato `sha256:<64hex>` do daemon.
