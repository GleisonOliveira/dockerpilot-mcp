# DockerPilot MCP

MCP server em TypeScript que expõe comandos Docker como ferramentas para agentes de IA.

Permite que agentes (Claude, Copilot, etc.) interajam com containers Docker via protocolo MCP — sem precisar de shell direto.

## Requisitos

- Docker rodando localmente com socket em `/var/run/docker.sock`
- Node.js 20+

## Instalação

```bash
npm install
npm run build
```

## Comandos

```bash
npm run dev           # roda em modo dev (tsx, sem build)
npm run dev:watch     # compila automaticamente ao salvar (tsup --watch)
npm run build         # compila para dist/
npm run start         # executa dist/index.js
npm test              # roda testes com Vitest
npm run test:watch    # testes em modo watch
npm run test:coverage # testes + relatório de cobertura
npm run lint          # verifica linting
npm run lint:fix      # corrige linting automaticamente
```

## Testando com MCP Inspector

Build uma vez e inspecione:

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

Para desenvolvimento com recompilação automática, use dois terminais:

```bash
# Terminal 1 — recompila ao salvar
npm run dev:watch

# Terminal 2 — Inspector (recarregue o browser para pegar novas mudanças)
npx @modelcontextprotocol/inspector node dist/index.js
```

## Integração com Claude Desktop

Adicione em `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dockerpilot": {
      "command": "node",
      "args": ["/caminho/para/container-commands-mcp/dist/index.js"]
    }
  }
}
```

## Arquitetura

```
src/
  index.ts              # entrypoint: conecta servidor ao transporte stdio
  server.ts             # registra todas as tools no McpServer
  docker/
    client.ts           # singleton Dockerode (socket /var/run/docker.sock)
    tools/
      list.ts           # tool list_containers
```

## Tools Disponíveis

| Tool | Descrição |
|------|-----------|
| `list_containers` | Lista containers Docker. `all=true` inclui parados. |

## Adicionando Nova Tool

1. Criar `src/docker/tools/<nome>.ts`
2. Exportar schema Zod (`<nome>Schema`) e função assíncrona
3. Registrar em `server.ts` com `server.registerTool(...)`
4. Criar teste em `tests/<nome>.test.ts` com mock do client

Padrão obrigatório:
- Validação via Zod
- Erros Docker propagados como exceção (MCP SDK converte automaticamente)
- Retorno sempre `{ content: [{ type: "text", text: JSON.stringify(...) }] }`

## Convenções

- Um arquivo por tool em `src/docker/tools/`
- Schemas Zod exportados com sufixo `Schema`
- Sem estado global além do singleton `docker` em `client.ts`
- Testes usam `vi.mock` para mockar o client — nunca dependem de Docker real
- Tools sem prefixo: `list_containers`, não `dockerpilot_list_containers`
