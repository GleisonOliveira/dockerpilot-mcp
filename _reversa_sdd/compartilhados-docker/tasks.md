# Módulo Compartilhados Docker, Tarefas de Implementação

## Pré-requisitos
- [ ] Tipos Dockerode (`ContainerInfo`, `ContainerInspectInfo`) disponíveis

## Tarefas

- [ ] T-01, Implementar `BaseTool` e `BasePrompt` abstratos
  - Origem no legado: `src/docker/shared/base.tool.ts`, `base.prompt.ts`
  - Critério de pronto: register() abstrato obrigatório
  - Confiança: 🟢

- [ ] T-02, Implementar resolvers síncronos (ports, mounts, networks, labels, composeMetadata, dependencyInfo)
  - Origem no legado: `src/docker/shared/list.resolvers.ts`
  - Critério de pronto: saídas conforme data-dictionary §2.1
  - Confiança: 🟢

- [ ] T-03, Implementar resolvers via inspect (healthcheck, restartInfo, resourceLimits, stateDetails)
  - Origem no legado: `src/docker/shared/list.resolvers.ts`
  - Critério de pronto: tratam inspect ausente → null
  - Confiança: 🟢

- [ ] T-04, Implementar `usage` async com cálculo de CPU% e memória
  - Origem no legado: `src/docker/shared/list.resolvers.ts:28`
  - Critério de pronto: delta cgroup; container parado → null; falha → null
  - Confiança: 🟢

- [ ] T-05, Integrar no `list_containers` com inspect único compartilhado
  - Origem no legado: `src/docker/tools/list/list.tool.ts`
  - Critério de pronto: 1 inspect por container; Promise.all dos resolvers
  - Confiança: 🟢

- [ ] T-06, Extrair resolutor BFS de dependências Compose (DT6)
  - Origem no legado: `src/docker/tools/stop/stop.tool.ts` (#resolveDependents) + `start/start.tool.ts` (#resolveDependencies)
  - Critério de pronto: resolutor único em `src/docker/shared/`; stop/start o consomem (labels mcp.project/mcp.service, mesma ordem BFS)
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Teste de cada resolver com dados mockados
- [ ] TT-02, Teste de usage para container parado
- [ ] TT-03, Teste de inspect falha → null
- [ ] TT-04, Teste do resolutor BFS (ordem dependentes/dependências; projeto isolado)
- [ ] TT-05, stop e start usando o resolutor compartilhado mantêm comportamento — atualizar `tests/docker/tools/stop/stop.tool.test.ts` e `tests/docker/tools/start/start.tool.test.ts` (DT6)

## Requisito obrigatório (testes)

- 🟢 **Obrigatório:** cada tarefa exige testes correspondentes — atualizar/criar os testes afetados e rodar `npm test`. A tarefa **só é considerada concluída com todos os testes passando** (comando: `npm test`). Sem exceção.

## Ordem Sugerida
1. T-02/T-03 → T-04 → T-05 (integração com list_containers). T-06 junto com ferramentas-containers T-09. Rodar `npm test` ao final de cada bloco.

## Lacunas Pendentes (🔴)
- Nenhuma (DT6 resolvido).
