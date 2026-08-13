# Módulo Ferramentas Containers, Tarefas de Implementação

## Pré-requisitos
- [ ] `cliente-docker`, `compartilhados-docker`, `utilitarios` implementados

## Tarefas

- [ ] T-01, `list_containers` com filtros e enriquecimento
  - Origem no legado: `src/docker/tools/list/list.tool.ts`
  - Critério de pronto: filtros id/name/status + 11 flags include* + inspect único
  - Confiança: 🟢

- [ ] T-02, `stop_containers` com resolução de dependentes BFS
  - Origem no legado: `src/docker/tools/stop/stop.tool.ts`
  - Critério de pronto: primários + dependentes (revertidos); dryRun **default false** (DT2); preview via dryRun:true; summarized
  - Confiança: 🟢

- [ ] T-03, `start_containers` com resolução de dependências BFS
  - Origem no legado: `src/docker/tools/start/start.tool.ts`
  - Critério de pronto: dependências profundas primeiro; dryRun; summarized
  - Confiança: 🟢

- [ ] T-04, `restart_container`
  - Origem no legado: `src/docker/tools/restart/restart.tool.ts`
  - Critério de pronto: match nome exato ou prefixo ID; restart+inspect
  - Confiança: 🟢

- [ ] T-05, `delete_container` com gate confirmed
  - Origem no legado: `src/docker/tools/delete/delete.tool.ts`
  - Critério de pronto: preview sem confirmed; removeImage via ImageID
  - Confiança: 🟢

- [ ] T-06, `create_container` com pull condicional e conversões
  - Origem no legado: `src/docker/tools/create-container/create-container.tool.ts`
  - Critério de pronto: verificar imagem local → pull se ausente (DT4) → create→start→inspect; portas /tcp; healthcheck ns; CpuPeriod default; descrição "creates and starts" (DT-CC-01)
  - Confiança: 🟢

- [ ] T-07, Aplicar DT2 (dryRun default false no stop)
  - Origem no legado: `src/docker/tools/stop/stop.tool.ts:157`
  - Critério de pronto: handler usa `dryRun ?? false`; schema e handler consistentes
  - Confiança: 🟢

- [ ] T-08, Aplicar DT-CC-01 (descrição do create_container)
  - Origem no legado: `src/docker/tools/create-container/create-container.tool.ts:226-238`
  - Critério de pronto: descrição "Create a Docker container and start it" coerente com o handler
  - Confiança: 🟢

- [ ] T-09, Usar resolver compartilhado de dependências (DT6)
  - Origem no legado: `src/docker/tools/stop/stop.tool.ts` + `start/start.tool.ts`
  - Critério de pronto: stop/start consomem o resolutor BFS extraído em `compartilhados-docker`
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, list_containers: filtros e enriquecimento
- [ ] TT-02, stop_containers: dependentes revertidos, exclude, force, dryRun
- [ ] TT-03, start_containers: dependências primeiro, dryRun
- [ ] TT-04, restart_container: match e erro
- [ ] TT-05, delete_container: gate confirmed e preview
- [ ] TT-06, create_container: conversões e pull
- [ ] TT-07, stop_containers: dryRun default **false** (executa por padrão) — atualizar `tests/docker/tools/stop/stop.tool.test.ts` (DT2)
- [ ] TT-08, create_container: descrição "creates and starts" + pull condicional (imagem local → sem pull) — atualizar `tests/docker/tools/create-container/create-container.tool.test.ts` (DT-CC-01/DT4)
- [ ] TT-09, resolutor BFS compartilhado: stop e start produzem a mesma ordem de antes — atualizar testes de stop/start (DT6)

## Requisito obrigatório (testes)

- 🟢 **Obrigatório:** cada tarefa exige testes correspondentes — atualizar/criar os testes afetados e rodar `npm test`. A tarefa **só é considerada concluída com todos os testes passando** (comando: `npm test`). Sem exceção.

## Ordem Sugerida
1. T-01..T-06 independentes entre si (após dependências). T-07/T-08/T-09 são ajustes sobre T-02/T-06 e dependem de T-06 (shared resolver). Rodar `npm test` ao final de cada bloco.

## Lacunas Pendentes (🔴)
- Nenhuma (DT2, DT4 e DT-CC-01 resolvidos).
