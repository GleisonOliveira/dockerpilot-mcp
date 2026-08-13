# Módulo Cliente Docker, Tarefas de Implementação

## Pré-requisitos
- [ ] `dockerode` instalado

## Tarefas

- [ ] T-01, Implementar `DockerClient` com socket por plataforma
  - Origem no legado: `src/docker/client.ts`
  - Critério de pronto: getDocker() configurado; win32 usa pipe
  - Confiança: 🟢

- [ ] T-02, Implementar `checkConnection` com ping e erro orientado
  - Origem no legado: `src/docker/client.ts`
  - Critério de pronto: ping rejeita com mensagem clara por plataforma
  - Confiança: 🟢

- [ ] T-03, Exportar singleton `dockerClient`
  - Origem no legado: `src/docker/client.ts`
  - Critério de pronto: import único reutilizável
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, getDocker retorna Dockerode
- [ ] TT-02, checkConnection com daemon mockado ok
- [ ] TT-03, checkConnection falha com mensagem

## Ordem Sugerida
1. T-01 → T-02 → T-03. Bloqueia todas as units de tools.

## Lacunas Pendentes (🔴)
- Nenhuma.
