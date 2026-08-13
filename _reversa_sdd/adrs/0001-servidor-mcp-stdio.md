# ADR-0001 — Servidor MCP com transporte stdio e registro programático de tools

**Data:** 2026-08-13 (retroativo, inferido do código e histórico git) | **Confiança:** 🟢 CONFIRMADO

## Contexto
O projeto precisa expor comandos Docker como ferramentas consumíveis por agentes de IA (Claude, Copilot, etc.) sem acesso a shell direto. O primeiro commit (`c547f49 feat: add list tool`) e a estrutura atual (`src/index.ts` → `DockerPilotServer` → `McpServer` → `StdioServerTransport`) mostram o desenho desde o início.

## Decisão
- Usar o SDK oficial `@modelcontextprotocol/sdk` com transporte **stdio** (entrada/saída padrão), sem servidor HTTP.
- Ferramentas e prompts são **registrados programaticamente** via contratos `BaseTool.register(server)` / `BasePrompt.register(server)`.
- Bootstrap centralizado em `index.ts` com DI por construtor (ver ADR-0003).

## Alternativas consideradas
- Transporte HTTP/SSE — não adotado; o stdio é o padrão de integração de agentes de desktop/CLI e dispensa rede.
- Registro imperativo inline — substituído pelo padrão de contratos (cada tool registra a si mesma).

## Consequências
- Simplicidade de deploy: `node dist/index.js` (sem porta).
- Acoplamento ao processo pai do agente (padrão MCP stdio).
- Versão exposta pelo `McpServer` (`0.1.0`) diverge do `package.json` (`0.0.1`) — dívida de versionamento (R25).
