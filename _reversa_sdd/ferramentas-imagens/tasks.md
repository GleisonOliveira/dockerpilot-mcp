# Módulo Ferramentas Imagens, Tarefas de Implementação

## Pré-requisitos
- [ ] `cliente-docker`, `utilitarios` implementados

## Tarefas

- [ ] T-01, Implementar `list_images` (filtros + opcionais)
  - Origem no legado: `src/docker/tools/list-images/list-images.tool.ts`
  - Critério de pronto: base `{id,tags,created,size_mb,virtual_size_mb,containers}` + digests/running_containers
  - Confiança: 🟢

- [ ] T-02, Implementar `delete_image` (gate + find + guarda de ambiguidade)
  - Origem no legado: `src/docker/tools/delete-image/delete-image.tool.ts`
  - Critério de pronto: preview; find() com guarda — erro se 0 matches ou >1 match (DT-IMG-01); full ID/short ID/sha256:/tag
  - Confiança: 🟢

- [ ] T-03, Implementar `pull_image` (sem parse de tag)
  - Origem no legado: `src/docker/tools/pull-image/pull-image.tool.ts`
  - Critério de pronto: pull + followProgress; id via slice(7,19)
  - Confiança: 🟢

- [ ] T-04, Implementar `prune_images` (gate + allSettled)
  - Origem no legado: `src/docker/tools/prune-images/prune-images.tool.ts`
  - Critério de pronto: vazio/preview/sucesso com freed+failed
  - Confiança: 🟢

- [ ] T-05, Documentar limitação DT-PULL (sem feedback progressivo)
  - Origem no legado: `src/docker/tools/pull-image/pull-image.tool.ts`
  - Critério de pronto: limitação registrada na spec; sem mudança de comportamento
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, list_images com filtros dangling/name/all e opcionais
- [ ] TT-02, delete_image gate + 0 matches + prefixo ambíguo (DT-IMG-01)
- [ ] TT-03, pull_image happy path e validação de campo vazio
- [ ] TT-04, prune_images vazio/preview/sucesso parcial (allSettled)
- [ ] TT-05, delete_image com prefixo ambíguo → erro orientando ID completo — atualizar `tests/docker/tools/delete-image/delete-image.tool.test.ts` (DT-IMG-01)

## Requisito obrigatório (testes)

- 🟢 **Obrigatório:** cada tarefa exige testes correspondentes — atualizar/criar os testes afetados e rodar `npm test`. A tarefa **só é considerada concluída com todos os testes passando** (comando: `npm test`). Sem exceção.

## Ordem Sugerida
1. T-01..T-04 independentes; T-05 apenas documentação. Rodar `npm test` ao final de cada bloco.

## Lacunas Pendentes (🔴)
- Nenhuma (DT-IMG-01 resolvido; DT-PULL é limitação documentada).
