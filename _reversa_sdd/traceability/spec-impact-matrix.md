# Spec Impact Matrix — dockerpilot-mcp

> Gerado pelo Architect em 2026-08-13. 🟢 CONFIRMADO.

Matriz: **componente-fonte** (linha) × **componentes afetados** (colunas). Onde há mudança na fonte, precisa revisar os destinos (código e testes).

## Componentes

| Sigla | Componente |
|-------|-----------|
| C1 | `index.ts` / bootstrap |
| C2 | `DockerPilotServer` |
| C3 | `ToolContainer` / `PromptContainer` (di) |
| C4 | `tools.config.ts` / `prompts.config.ts` |
| C5 | `BaseTool` / `BasePrompt` (docker-shared) |
| C6 | `ContainerFieldResolvers` (list.resolvers) |
| C7 | `DockerClient` / `client.ts` |
| C8 | `utils/try-catch.ts` |
| C9 | tools-containers (6) |
| C10 | tools-container-ops (2) |
| C11 | tools-images (4) |
| C12 | tools-volumes (3) |
| C13 | tools-daemon (1) |
| C14 | prompts (7) |
| C15 | Docker daemon / API versão |
| C16 | testes (50) |

## Matriz de impacto

| Fonte \ Atinge | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | C13 | C14 | C15 | C16 |
|----------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **C1 index/bootstrap** | — | ✅ | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | — | 🟡 |
| **C2 DockerPilotServer** | — | — | — | — | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 🟡 |
| **C3 DI containers** | ✅ | — | — | ✅ | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| **C4 config arrays** | — | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 🟡 |
| **C5 BaseTool/BasePrompt** | — | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| **C6 Resolvers** | — | — | — | — | — | — | — | — | ✅ | — | — | — | — | — | — | ✅ |
| **C7 DockerClient** | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| **C8 tryCatch** | — | — | — | — | — | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ |
| **C9 tools-containers** | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ | ✅ |
| **C10 tools-container-ops** | — | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ | ✅ |
| **C11 tools-images** | — | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ | ✅ |
| **C12 tools-volumes** | — | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ | ✅ |
| **C13 tools-daemon** | — | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — | — | ✅ | ✅ |
| **C14 prompts** | — | ✅ | — | ✅ | ✅ | — | — | — | ✅ | ✅ | — | ✅ | — | — | — | ✅ |
| **C15 Docker API** | — | — | — | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | — | 🟡 |

## Leituras recomendadas

- **Alterar uma tool** → revisar `C4` (registro), `C9/C10/C11/C12/C13` (implementação), `C16` (testes da tool) e `C14` (prompts que a citam).
- **Alterar o schema de `exec_command`** → afeta prompt `compose_service` (lacuna L2 já registrada).
- **Alterar `ContainerFieldResolvers`** → afeta `list_containers` e seus testes; não afeta outras tools.
- **Alterar `DockerClient`/socket** → afeta todas as 16 tools + bootstrap (componente mais crítico).
- **Alterar contrato `BaseTool`** → afeta todas as tools e o DI.

## Impacto de dívidas (DT)

| Dívida | Impacto |
|--------|---------|
| DT1 versão divergente | publicadores/consumidores do npm; sem impacto de código |
| DT2 `dryRun ?? true` stop | UX/integração do `stop_containers`; testes que assumem execução imediata |
| DT3 compose_service × exec_command | prompt gera chamadas inválidas; exige ajuste de prompt ou schema |
| DT5 split `/\s+/` | comandos com aspas falham; afeta C10 e testes |
