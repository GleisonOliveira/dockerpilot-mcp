# Módulo DI, Tarefas de Implementação

## Pré-requisitos
- [ ] Tipos `BaseTool`/`BasePrompt` e `DockerClient` definidos

## Tarefas

- [ ] T-01, Implementar `ToolContainer`
  - Origem no legado: `src/di/tool-container.ts`
  - Critério de pronto: instancia todas as tools com client; getTools() na ordem
  - Confiança: 🟢

- [ ] T-02, Implementar `PromptContainer`
  - Origem no legado: `src/di/prompt-container.ts`
  - Critério de pronto: instancia prompts sem args; getPrompts() na ordem
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Teste de instanciação com client injetado
- [ ] TT-02, Teste de instanciação sem argumentos
- [ ] TT-03, Teste com array vazio

## Ordem Sugerida
1. T-01, T-02 (independentes). Bloqueiam o bootstrap (unit `nucleo`).

## Lacunas Pendentes (🔴)
- Nenhuma.
