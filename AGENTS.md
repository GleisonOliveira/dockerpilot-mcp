# AGENTS.md — DockerPilot MCP

MCP server em TypeScript que expõe comandos Docker como ferramentas para agentes de IA.

## Propósito

Permite que agentes de IA (Claude, Copilot, etc.) interajam com containers Docker via protocolo MCP — sem precisar de shell direto.

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

## Como Adicionar Nova Tool

1. Criar `src/docker/tools/<nome>.ts`
2. Exportar schema Zod (`<nome>Schema`) e função assíncrona
3. Registrar em `server.ts` com `server.registerTool(...)`
4. Criar teste em `tests/<nome>.test.ts` com mock do `docker` client

Padrão obrigatório:
- Validação via Zod
- Erros Docker propagados como exceção (MCP SDK converte automaticamente)
- Retorno sempre `{ content: [{ type: "text", text: JSON.stringify(...) }] }`

## Requisitos

- Docker rodando localmente com socket acessível em `/var/run/docker.sock`
- Node.js 20+

## Comandos

```bash
npm run dev           # roda servidor em modo dev (tsx, sem build)
npm run build         # compila para dist/
npm run start         # executa dist/index.js
npm test              # roda testes com Vitest
npm run test:coverage # testes + relatório de cobertura
npm run lint          # verifica linting
npm run lint:fix      # corrige linting automaticamente
```

## Testar o Servidor MCP

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Ou configurar no Claude Desktop (`claude_desktop_config.json`):

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

## Convenções

- Um arquivo por tool em `src/docker/tools/`
- Schemas Zod exportados com sufixo `Schema`
- Sem estado global além do singleton `docker` em `client.ts`
- Testes usam `vi.mock` para mockar o client — nunca dependem de Docker real
- Tools sem prefixo: `list_containers`, não `dockerpilot_list_containers`

## Testes

**Obrigatório:** toda feature adicionada ou modificada deve ter testes correspondentes. Sem exceção.

- Nova tool → novo arquivo `tests/docker/tools/<nome>/<nome>.test.ts`
- Novo campo/parâmetro em tool existente → novos casos de teste no arquivo de teste da tool
- Modificação de comportamento existente → atualizar testes afetados
- Rodar `npm test` antes de considerar a tarefa concluída
