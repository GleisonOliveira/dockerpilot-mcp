# Módulo Core, Tarefas de Implementação

## Pré-requisitos
- [ ] Dependências listadas em `design.md` disponíveis (@modelcontextprotocol/sdk, dockerode, zod)

## Tarefas

- [ ] T-01, Implementar bootstrap em `src/index.ts`
  - Origem no legado: `src/index.ts`
  - Critério de pronto: instancia dockerClient, ToolContainer, PromptContainer, DockerPilotServer e chama start()
  - Confiança: 🟢

- [ ] T-02, Implementar `DockerPilotServer` com McpServer e registro de tools/prompts
  - Origem no legado: `src/server.ts`
  - Critério de pronto: registro de 23 contratos; versão 0.1.0; start() conecta stdio
  - Confiança: 🟢

- [ ] T-03, Manter `tools.config.ts` com as 16 classes
  - Origem no legado: `src/tools.config.ts`
  - Critério de pronto: array exportado com todas as classes de tool
  - Confiança: 🟢

- [ ] T-04, Manter `prompts.config.ts` com as 7 classes
  - Origem no legado: `src/prompts.config.ts`
  - Critério de pronto: array exportado com todas as classes de prompt
  - Confiança: 🟢

- [ ] T-05, Aplicar DT1 (alinhar versões do servidor com o package.json)
  - Origem no legado: `src/server.ts`, `package.json` (`0.0.1` vs `0.1.0`)
  - Critério de pronto: `package.json` → `0.1.0`, mesma versão nos dois pontos
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Teste de inicialização que registra as 16 tools
- [ ] TT-02, Teste de inicialização que registra os 7 prompts
- [ ] TT-03, version do server e package.json iguais (0.1.0) — atualizar/criar teste de versão (DT1)

## Requisito obrigatório (testes)

- 🟢 **Obrigatório:** cada tarefa exige testes correspondentes — atualizar/criar os testes afetados e rodar `npm test`. A tarefa **só é considerada concluída com todos os testes passando** (comando: `npm test`). Sem exceção.

## Ordem Sugerida
1. T-02 (núcleo do servidor) → T-01 (bootstrap) → T-03/T-04 (registros). Bloqueio: T-01 depende de T-02, T-03, T-04. T-05 independente. Rodar `npm test` ao final de cada bloco.

## Lacunas Pendentes (🔴)
- Nenhuma (DT1 resolvido).
