# Inventário — dockerpilot-mcp

> Gerado pelo Scout em 2026-08-13.
> Escala de confiança: 🟢 CONFIRMADO (lido do código/arquivos), 🟡 INFERIDO, 🔴 LACUNA.

## Visão geral

Servidor **MCP (Model Context Protocol)** em TypeScript que expõe comandos Docker como **tools** e **prompts** para agentes de IA. Executa sobre stdio e fala com o daemon Docker via socket local através da biblioteca `dockerode`.

- **Repositório:** github.com/GleisonOliveira/dockerpilot-mcp
- **Pacote npm:** `dockerpilot-mcp` (binário `dockerpilot-mcp`)
- **Licença:** PolyForm Noncommercial 1.0.0
- **Requisito de runtime:** Node.js >= 22 (ESM, `"type": "module"`)
- **Requisição de infra:** Docker com socket em `/var/run/docker.sock` (Linux/macOS) ou `//./pipe/docker_engine` (Windows)

## Estrutura de diretórios

```
src/
  index.ts                        # entrypoint CLI: monta DI + servidor e conecta ao stdio
  server.ts                       # DockerPilotServer: instancia McpServer e registra tools/prompts
  tools.config.ts                 # registro central das 16 tools (ToolConstructor[])
  prompts.config.ts               # registro central dos 7 prompts (PromptConstructor[])
  di/
    tool-container.ts             # DI: instancia tools a partir de ToolConstructor[]
    prompt-container.ts           # DI: instancia prompts a partir de PromptConstructor[]
  utils/
    try-catch.ts                  # wrapper tryCatch<T> para erros assíncronos
  docker/
    client.ts                     # DockerClient (dockerode) + singleton dockerClient
    shared/
      base.tool.ts                # classe abstrata BaseTool (padrão de registro de tool)
      base.prompt.ts              # classe abstrata BasePrompt (padrão de registro de prompt)
      list.resolvers.ts           # resolvers de campos opcionais de containers
    tools/
      list/                       # list_containers
      list-images/                # list_images
      list-volumes/               # list_volumes
      stop/                       # stop_containers
      start/                      # start_containers
      restart/                    # restart_container
      delete/                     # delete_container
      delete-image/               # delete_image
      delete-volume/              # delete_volume
      create-volume/              # create_volume
      create-container/           # create_container
      pull-image/                 # pull_image
      docker-status/              # docker_status
      exec-command/               # exec_command
      container-logs/             # container_logs
      prune-images/               # prune_images
    prompts/
      container-troubleshoot/     # prompt container_troubleshoot
      image-cleanup/              # prompt image_cleanup
      volume-removal/             # prompt volume_removal
      compose-start/              # prompt compose_start
      compose-stop/               # prompt compose_stop
      compose-restart/            # prompt compose_restart
      compose-service/            # prompt compose_service
tests/
  di/                             # testes dos containers de DI
  docker/client.test.ts           # testes do DockerClient
  docker/shared/                  # testes de list.resolvers
  docker/tools/<tool>/            # 1 arquivo de teste por tool
  docker/prompts/<prompt>/        # testes de prompt + template + messages
  server.test.ts                  # testes do DockerPilotServer
  utils/                          # testes do try-catch
.github/
  labeler.yml                     # regras do action labeler
  pull_request_template.md        # template de PR
  workflows/
    main.yml                      # CI no push para main (check + cobertura)
    pr.yml                        # CI em PRs (label, validação de título, check)
    publish.yml                   # publicação npm via tag v* (trusted publishing)
```

## Tecnologias

- **Linguagem:** TypeScript (100% dos fontes em `src/` — 55 arquivos `.ts`)
- **Runtime:** Node.js >= 22 (ESM)
- **Build:** tsup (esbuild) → `dist/`
- **Execução em dev:** tsx
- **Testes:** Vitest + @vitest/coverage-v8 (threshold mínimo 95% linhas/funções/branches/statements)
- **Lint:** ESLint 10 + typescript-eslint + eslint-plugin-prettier
- **Formatação:** Prettier (printWidth 120)

## Bibliotecas principais (runtime)

| Biblioteca | Versão (package.json) | Papel |
|-----------|----------------------|-------|
| `@modelcontextprotocol/sdk` | ^1.12.0 (lock 1.29.0) | Protocolo MCP (McpServer, registro de tools/prompts, transporte stdio) |
| `dockerode` | ^5.0.0 | Cliente da API do Docker via socket |
| `zod` | ^3.23.8 | Validação de schemas de entrada das tools/prompts |

## Ponto de entrada

- **Entrypoint CLI:** `src/index.ts` (script `dev` → `tsx src/index.ts`; build → `dist/index.js`)
- **Fluxo de inicialização:**
  1. `dockerClient` (singleton) — conexão com o daemon
  2. `ToolContainer` instancia as 16 tools a partir de `toolClasses` (tools.config.ts)
  3. `PromptContainer` instancia os 7 prompts a partir de `promptClasses` (prompts.config.ts)
  4. `DockerPilotServer` cria o `McpServer` e registra todas as tools/prompts
  5. `server.start()` conecta o servidor ao `StdioServerTransport`

## Integrações externas

- **Docker daemon** — único sistema externo. Comunicação via socket `/var/run/docker.sock` (Unix) ou `//./pipe/docker_engine` (Windows). `DockerClient.checkConnection()` faz `ping()` e lança erro claro se o daemon estiver inacessível.
- **Registry de imagens** — indireto, via dockerode (`pull`), sem configuração própria.
- Sem banco de dados, sem serviços HTTP próprios (MCP roda sobre stdio), sem filas.

## CI/CD

| Workflow | Gatilho | Ações |
|----------|---------|-------|
| `.github/workflows/main.yml` | push para `main` | `npm ci` + `npm run check` (lint + typecheck + cobertura) + upload coverage Codecov |
| `.github/workflows/pr.yml` | PRs para `main` | label por título (Conventional Commits) + validação de título + `npm run check` |
| `.github/workflows/publish.yml` | tag `v*` | define versão no package.json, `npm ci` + `npm run build` + `npm publish --provenance` |

## Configurações

- `tsconfig.json` — target ES2022, module NodeNext, strict, rootDir `src`, outDir `dist`
- `eslint.config.js` — flat config; regra custom `no-unused-vars` com ignore de `_`; prettier como warn
- `.prettierrc` — printWidth 120, semi, singleQuote false, trailingComma all
- `vitest.config.ts` — coverage v8, thresholds 95%, excludes de index.ts e infra
- `.gitignore` — node_modules, dist, coverage, *.log, .env, .playwright-mcp
- Não há `.env.example` nem arquivos `config/`

## Banco de dados

**Ausente.** Nenhum arquivo DDL, migration, schema ou modelo ORM. O único "estado" persistido é o do próprio Docker daemon (containers, imagens, volumes, redes), acessado via API.

## Cobertura de testes

- **Framework:** Vitest 4
- **Arquivos de teste:** 50 (`tests/**/*.test.ts`)
- **Relação com fonte:** 1 arquivo de teste por tool/prompt, espelhando `src/`
- **Threshold:** 95% de cobertura (linhas, funções, branches, statements)
- **Padrão:** testes mockam o `DockerClient` (dockerode) — não dependem de Docker real

## Módulos identificados

1. **core** — `index.ts`, `server.ts`, `tools.config.ts`, `prompts.config.ts`
2. **di** — `tool-container.ts`, `prompt-container.ts`
3. **utils** — `try-catch.ts`
4. **docker-client** — `docker/client.ts` (DockerClient + singleton)
5. **docker-shared** — `base.tool.ts`, `base.prompt.ts`, `list.resolvers.ts`
6. **tools-containers** — `list`, `stop`, `start`, `restart`, `delete`, `create-container`
7. **tools-container-ops** — `exec-command`, `container-logs`
8. **tools-images** — `list-images`, `delete-image`, `pull-image`, `prune-images`
9. **tools-volumes** — `list-volumes`, `create-volume`, `delete-volume`
10. **tools-daemon** — `docker-status`
11. **prompts** — 7 prompts (troubleshoot, cleanup, removal, compose x4)

## Notas de confiança

- 🟢 Contagem de arquivos e estrutura confirmadas por leitura direta do disco.
- 🟢 Dependências confirmadas via `package.json` + `package-lock.json`.
- 🟡 Detalhes de comportamento de cada tool/prompt (schemas, flags, mensagens) exigem análise do Archaeologist.
