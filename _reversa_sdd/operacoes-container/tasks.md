# Módulo Operações em Container, Tarefas de Implementação

## Pré-requisitos
- [ ] `cliente-docker`, `utilitarios` implementados

## Tarefas

- [ ] T-01, Implementar `exec_command`
  - Origem no legado: `src/docker/tools/exec-command/exec-command.tool.ts`
  - Critério de pronto: ID-only, running required, exitCode/success/output, silent
  - Confiança: 🟢

- [ ] T-02, Implementar `container_logs`
  - Origem no legado: `src/docker/tools/container-logs/container-logs.tool.ts`
  - Critério de pronto: ID-only, tail default 5, logs limpos
  - Confiança: 🟢

- [ ] T-03, Extrair parse de frames para função compartilhada (remover duplicação)
  - Origem no legado: `exec-command.tool.ts:70-83`, `container-logs.tool.ts:54-62`
  - Critério de pronto: parser único com fallback raw
  - Confiança: 🟢

- [ ] T-04, Implementar parser de comando com suporte a aspas (DT5)
  - Origem no legado: `exec-command.tool.ts:56`
  - Critério de pronto: comandos com aspas simples/duplas preservados; `sh -c 'echo "a b"'` não quebra
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, exec happy path (exit 0, output)
- [ ] TT-02, exec com silent (sem output)
- [ ] TT-03, exec em container parado → erro
- [ ] TT-04, exec com nome → erro (não resolve)
- [ ] TT-05, logs com tail e limpeza de linhas
- [ ] TT-06, exec com comando contendo aspas (`sh -c 'echo "a b"'`) preservado — atualizar `tests/docker/tools/exec-command/exec-command.tool.test.ts` (DT5)

## Requisito obrigatório (testes)

- 🟢 **Obrigatório:** cada tarefa exige testes correspondentes — atualizar/criar os testes afetados e rodar `npm test`. A tarefa **só é considerada concluída com todos os testes passando** (comando: `npm test`). Sem exceção.

## Ordem Sugerida
1. T-01/T-02 → T-03 (refactor opcional) → T-04 (parser com aspas). Rodar `npm test` ao final de cada bloco.

## Lacunas Pendentes (🔴)
- Nenhuma (DT5 resolvido).
