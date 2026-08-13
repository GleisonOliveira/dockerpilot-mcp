# Módulo Ferramentas Daemon, Tarefas de Implementação

## Pré-requisitos
- [ ] `cliente-docker`, `utilitarios` implementados

## Tarefas

- [ ] T-01, Implementar `docker_status`
  - Origem no legado: `src/docker/tools/docker-status/docker-status.tool.ts`
  - Critério de pronto: version/system/containers/images/disk_usage/plugins/swarm/warnings via Promise.all
  - Confiança: 🟢

- [ ] T-02, Aplicar DT-ST (padronizar formato de erro)
  - Origem no legado: `src/docker/tools/docker-status/docker-status.tool.ts:90-94`
  - Critério de pronto: erro em texto `Error docker_status: <msg>` + isError:true; sem JSON `unavailable`
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, status saudável com saída completa (§2.16)
- [ ] TT-02, daemon fora do ar → "Error docker_status: <msg>" isError (DT-ST)
- [ ] TT-03, swarm inativo → {active:false, state:"inactive"} sem erro
- [ ] TT-04, erro padronizado (texto, sem JSON unavailable) — atualizar `tests/docker/tools/docker-status/docker-status.tool.test.ts` (DT-ST)

## Requisito obrigatório (testes)

- 🟢 **Obrigatório:** cada tarefa exige testes correspondentes — atualizar/criar os testes afetados e rodar `npm test`. A tarefa **só é considerada concluída com todos os testes passando** (comando: `npm test`). Sem exceção.

## Ordem Sugerida
1. T-01 → T-02 (ajuste de formato). Rodar `npm test` ao final de cada bloco.

## Lacunas Pendentes (🔴)
- Nenhuma (DT-ST resolvido).
