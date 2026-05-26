# AGENTS.md — DockerPilot MCP

MCP server em TypeScript que expõe comandos Docker como ferramentas para agentes de IA.

## Propósito

Permite que agentes de IA (Claude, Copilot, etc.) interajam com containers Docker via protocolo MCP — sem precisar de shell direto.

## Arquitetura

```
src/
  index.ts                        # entrypoint: conecta servidor ao transporte stdio
  server.ts                       # registra tools e prompts no McpServer
  tools.config.ts                 # array com todas as ToolConstructor registradas
  prompts.config.ts               # array com todas as PromptConstructor registradas
  di/
    tool-container.ts             # DI: instancia tools a partir de ToolConstructor[]
    prompt-container.ts           # DI: instancia prompts a partir de PromptConstructor[]
  utils/
    try-catch.ts                  # wrapper tryCatch<T> para erros assíncronos
  docker/
    client.ts                     # singleton Dockerode (socket /var/run/docker.sock)
    shared/
      base.tool.ts                # classe abstrata BaseTool com método register()
      base.prompt.ts              # classe abstrata BasePrompt com método register()
      list.resolvers.ts           # ContainerFieldResolvers (campos opcionais de containers)
    tools/
      list/list.tool.ts                 # tool list_containers
      list-images/list-images.tool.ts   # tool list_images
      list-volumes/list-volumes.tool.ts # tool list_volumes
      stop/stop.tool.ts                 # tool stop_containers
      start/start.tool.ts               # tool start_containers
      delete/delete.tool.ts             # tool delete_container
      delete-image/delete-image.tool.ts # tool delete_image
      create-volume/create-volume.tool.ts # tool create_volume
      delete-volume/delete-volume.tool.ts # tool delete_volume
    prompts/
      container-troubleshoot/           # prompt container_troubleshoot
      image-cleanup/                    # prompt image_cleanup
      volume-removal/                   # prompt volume_removal
```

## Como Adicionar Nova Tool

1. Criar `src/docker/tools/<nome>/<nome>.tool.ts` exportando classe `extends BaseTool`
2. Definir schema Zod no arquivo da tool
3. Implementar `#handle(input)` usando `tryCatch` para capturar erros
4. Implementar `register(server)` chamando `server.registerTool(..., this.#handle.bind(this))`
5. Adicionar a classe em `src/tools.config.ts` no array `toolClasses`
6. Criar teste em `tests/docker/tools/<nome>/<nome>.tool.test.ts`

Padrão obrigatório:
- Validação via Zod no schema da tool
- Usar `tryCatch` de `utils/try-catch.ts` como wrapper de erros — nunca try/catch manual no `#handle`
- Retorno de erro: `{ content: [{ type: "text", text: "Error ...: <mensagem>" }], isError: true }`
- Retorno de sucesso: `{ content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] }`
- Usar método privado `#handle` (sintaxe de campo privado JS) para o handler
- Registrar via `this.#handle.bind(this)` no `register()`

## Como Adicionar Novo Prompt

1. Criar `src/docker/prompts/<nome>.prompt.ts` exportando classe `extends BasePrompt`
2. Definir schema Zod para os argumentos do prompt
3. Implementar `register(server)` chamando `server.registerPrompt(...)`
4. Adicionar a classe em `src/prompts.config.ts` no array `promptClasses`

Padrão obrigatório:
- Prompts devem ser escritos em inglês
- Schema Zod definido localmente no arquivo do prompt (não exportado)
- Prompts não recebem `DockerClient` — são apenas mensagens orientadoras para o agente
- `PromptConstructor` não aceita argumentos no construtor (diferente de `ToolConstructor`)

## Tools Disponíveis

| Tool | Descrição |
|------|-----------|
| `list_containers` | Lista containers Docker. `all=true` inclui parados. Suporta filtros por nome, id, status e campos opcionais (portas, mounts, redes, uso, healthcheck, etc.). |
| `list_images` | Lista imagens Docker. Suporta filtros por nome/tag, dangling e campos opcionais (digests, containers). |
| `list_volumes` | Lista volumes Docker. Suporta filtros por nome, driver, dangling e campos opcionais (containers usando o volume, tamanho). |
| `stop_containers` | Para containers em execução por nome ou ID. Suporta exclude, timeout, force, stopDependents e dryRun. |
| `start_containers` | Inicia containers parados por nome ou ID. Suporta exclude, startDependencies e dryRun. |
| `delete_container` | Remove container por ID. Requer `confirmed=true`. Exibe preview quando `confirmed=false`. Suporta `force` e `removeImage`. |
| `delete_image` | Remove imagem por ID (curto, completo ou tag). Requer `confirmed=true`. Exibe preview quando `confirmed=false`. Suporta `force`. |
| `create_volume` | Cria volume Docker com driver opcional (local/nfs/tmpfs/overlay2), opções de mount e configuração específica do driver. Retorna nome do volume e caminho sugerido para mount no container. |
| `delete_volume` | Remove volume Docker por ID. Requer `confirmed=true`. Exibe preview quando `confirmed=false`. Detecta se o volume está em uso antes de remover. |

## Prompts Disponíveis

| Prompt | Descrição | Quando ativar |
|--------|-----------|---------------|
| `container_troubleshoot` | Guia de diagnóstico para problemas com containers | Usuário reporta container com erro, não iniciando, porta ocupada, crash loop, etc. |
| `image_cleanup` | Guia para liberar espaço em disco removendo imagens dangling | Usuário reporta pouco espaço em disco ou quer limpar imagens Docker não utilizadas. |
| `volume_removal` | Workflow seguro de remoção de volume Docker com avaliação de risco e dupla confirmação para volumes de alto risco (bancos de dados, estado de aplicação, secrets). | Usuário quer remover um volume Docker com segurança. |

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

- Um diretório por tool em `src/docker/tools/<nome>/`
- Schema Zod definido localmente no arquivo da tool (não exportado)
- Sem estado global além do singleton `docker` em `client.ts`
- Testes mocam `DockerClient` diretamente — nunca dependem de Docker real
- Tools sem prefixo: `list_containers`, `stop_containers`, não `dockerpilot_*`
- Campos opcionais reutilizáveis entre tools vão em `src/docker/shared/`

## Testes

**Obrigatório:** toda feature adicionada ou modificada deve ter testes correspondentes. Sem exceção.

- Nova tool → novo arquivo `tests/docker/tools/<nome>/<nome>.test.ts`
- Novo campo/parâmetro em tool existente → novos casos de teste no arquivo de teste da tool
- Modificação de comportamento existente → atualizar testes afetados
- Rodar `npm test` antes de considerar a tarefa concluída
