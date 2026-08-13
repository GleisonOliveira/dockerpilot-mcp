# ADR-0003 — DI por construtor com containers de tools e prompts

**Data:** 2026-08-13 (retroativo; commit `c5a1885 feat(prompts): add container_troubleshoot prompt with DI pattern`, 2026-05-23) | **Confiança:** 🟢 CONFIRMADO

## Contexto
16 tools precisam do `DockerClient`; prompts não precisam de client (são mensagens orientadoras). O registro de cada tool exige `server.registerTool(...)` com nome, descrição, schema e handler.

## Decisão
- `ToolConstructor = new (client: DockerClient) => BaseTool` e `PromptConstructor = new () => BasePrompt`.
- `ToolContainer`/`PromptContainer` mapeiam as listas estáticas (`tools.config.ts`/`prompts.config.ts`) instanciando cada classe e expondo `getTools()`/`getPrompts()`.
- Tools registram a si mesmas em `register(server)` com handler `#handle` privado.
- **Toda tool** segue o padrão: schema Zod → guard de campo obrigatório → `tryCatch` → `checkConnection()` → dockerode → retorno normalizado.

## Alternativas consideradas
- DI com container de inversão de controle externo — rejeitado (excesso para o tamanho do projeto).
- Registro manual de cada tool em `server.ts` — substituído pelo map-and-store (novas tools = 1 classe + 1 entrada no config).

## Consequências
- Novo recurso = 1 classe + 1 linha no array config (processo documentado no AGENTS.md).
- `DockerClient` é singleton global (`dockerClient`); acoplamento baixo, sem lifecycle.
- Prompts seguem contrato distinto (sem client) — impossível um prompt ganhar acesso acidental ao daemon.
