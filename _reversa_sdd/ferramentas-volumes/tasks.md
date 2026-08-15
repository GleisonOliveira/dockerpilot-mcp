# Módulo Ferramentas Volumes, Tarefas de Implementação

## Pré-requisitos
- [ ] `cliente-docker`, `utilitarios` implementados

## Tarefas

- [ ] T-01, Implementar `list_volumes` (filtros + opcionais)
  - Origem no legado: `src/docker/tools/list-volumes/list-volumes.tool.ts`
  - Critério de pronto: base `{name,driver,mountpoint,scope,labels,options}` + usage/containers
  - Confiança: 🟢

- [ ] T-02, Implementar `create_volume` (containerId + campos por driver)
  - Origem no legado: `src/docker/tools/create-volume/create-volume.tool.ts`
  - Critério de pronto: buildDriverOpts por driver; labels mcp.*; sem hot-mount
  - Confiança: 🟢

- [ ] T-03, Implementar `delete_volume` (gate + uso, sem force)
  - Origem no legado: `src/docker/tools/delete-volume/delete-volume.tool.ts`
  - Critério de pronto: preview com usingContainers; erro bloqueante em uso; remove
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, list_volumes filtros e opcionais
- [ ] TT-02, create_volume nfs/local com campos por driver + labels mcp.*
- [ ] TT-03, delete_volume gate + uso detectado + erro bloqueante

## Ordem Sugerida
1. T-01..T-03 independentes.

## Lacunas Pendentes (🔴)
- Nenhuma.
