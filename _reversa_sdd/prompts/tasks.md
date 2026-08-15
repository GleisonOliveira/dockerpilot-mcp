# Módulo Prompts, Tarefas de Implementação

## Pré-requisitos
- [ ] SDK MCP instalado

## Tarefas

- [ ] T-01, Implementar `container_troubleshoot`
  - Origem no legado: `src/docker/prompts/container-troubleshoot/`
  - Critério de pronto: schema container_name?/symptom?; template + messages user/assistant em inglês
  - Confiança: 🟢

- [ ] T-02, Implementar `image_cleanup`
  - Origem no legado: `src/docker/prompts/image-cleanup/`
  - Critério de pronto: sem args; fases seguras
  - Confiança: 🟢

- [ ] T-03, Implementar `volume_removal`
  - Origem no legado: `src/docker/prompts/volume-removal/`
  - Critério de pronto: sem args; risco + dupla confirmação no conteúdo
  - Confiança: 🟢

- [ ] T-04, Implementar `compose_start`, `compose_stop`, `compose_restart`
  - Origem no legado: `src/docker/prompts/compose-{start,stop,restart}/`
  - Critério de pronto: schema project_dir?; orientação do projeto inteiro
  - Confiança: 🟢

- [ ] T-05, Implementar `compose_service`
  - Origem no legado: `src/docker/prompts/compose-service/`
  - Critério de pronto: schema service_name?/action?; orientação de serviço individual **via tools MCP** (DT3)
  - Confiança: 🟢

- [ ] T-06, Registrar todos no `prompts.config.ts`
  - Origem no legado: `src/prompts.config.ts`
  - Critério de pronto: `promptClasses` com os 7
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, registro dos 7 prompts
- [ ] TT-02, conteúdo em inglês e sem execução
- [ ] TT-03, schemas de args de cada prompt

## Ordem Sugerida
1. T-01..T-05 → T-06.

## Lacunas Pendentes (🔴)
- Nenhuma.
