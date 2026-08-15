# Dependências — dockerpilot-mcp

> Gerado pelo Scout em 2026-08-13.
> Fontes: `package.json`, `package-lock.json`. Versões das dependências diretas lidas de `package.json`; versões resolvidas no lockfile.

## Gerenciador de pacotes

- **npm** (com `package-lock.json` commitado)
- `engines.node`: `>=22`

## Dependências de runtime (diretas)

| Pacote | Faixa (package.json) | Versão resolvida (lock) | Finalidade |
|--------|----------------------|-------------------------|------------|
| `@modelcontextprotocol/sdk` | ^1.12.0 | 1.29.0 | SDK oficial do protocolo MCP: `McpServer`, `StdioServerTransport`, registro de tools/prompts |
| `dockerode` | ^5.0.0 | 5.x | Cliente da API Docker (socket) |
| `zod` | ^3.23.8 | 3.x | Validação de schemas de entrada |

## Dependências de desenvolvimento (diretas)

| Pacote | Faixa (package.json) | Finalidade |
|--------|----------------------|------------|
| `@eslint/js` | ^10.0.1 | Regras base do ESLint (flat config) |
| `@types/dockerode` | ^3.3.31 | Tipos do dockerode |
| `@types/node` | ^22.10.0 | Tipos do Node |
| `@vitest/coverage-v8` | ^4.1.7 | Provider de cobertura do Vitest |
| `eslint` | ^10.4.0 | Linter |
| `eslint-config-prettier` | ^10.1.8 | Desliga regras conflitantes ESLint×Prettier |
| `eslint-plugin-prettier` | ^5.5.5 | Roda Prettier como regra do ESLint |
| `prettier` | ^3.8.3 | Formatação |
| `tsup` | ^8.3.5 | Build (esbuild) |
| `tsx` | ^4.19.2 | Execução TS em dev |
| `typescript` | ^5.7.2 | Compilador |
| `typescript-eslint` | ^8.59.4 | Regras TS do ESLint |
| `vitest` | ^4.1.7 | Test runner |

## Scripts npm

| Script | Comando | Uso |
|--------|---------|-----|
| `dev` | `tsx src/index.ts` | servidor em dev (sem build) |
| `dev:watch` | `tsup src/index.ts --format esm --dts --watch` | recompila ao salvar |
| `prebuild` | `eslint src tests --max-warnings 0 && tsc --noEmit` | guard antes do build |
| `build` | `tsup src/index.ts --format esm --dts` | compila para `dist/` |
| `start` | `node dist/index.js` | executa build |
| `test` | `vitest run` | roda testes |
| `test:watch` | `vitest` | testes em watch |
| `test:coverage` | `vitest run --coverage` | testes + cobertura |
| `lint` | `eslint src tests` | lint |
| `lint:fix` | `eslint src tests --fix` | lint automático |
| `typecheck` | `tsc --noEmit` | checagem de tipos |
| `check` | `npm run lint && npm run typecheck && npm run test:coverage` | pipeline completo (usado na CI) |
| `inspect` | `npx @modelcontextprotocol/inspector node dist/index.js` | inspeção MCP |

## Dependências transitivas notáveis (lock)

- **Transpilação/build:** `esbuild` (0.28.x), `@rolldown/binding-*`, `rollup` (4.x), `@oxc-project/types`
- **gRPC/proto (runtime do MCP SDK):** `@grpc/grpc-js` (1.14.4), `@grpc/proto-loader`, `@protobufjs/*`
- **Servidor HTTP (sub-dependência, não usada diretamente):** `hono` (4.13.1), `@hono/node-server` — presença registrada nos merges de dependabot
- **Sanitização de dependências:** `ip-address`, `fast-uri`, `body-parser` (atualizados via dependabot)
- **Bundle de produção:** arquivos publicados no npm: apenas `dist` (campo `files`)

## Observações

- 🟢 Sem dependências peer obrigatórias fora do Node 22+.
- 🟢 O runtime não faz chamadas HTTP diretas no código próprio — o transporte MCP é stdio; `hono` entra transitivamente via MCP SDK.
- 🟡 A versão resolvida exata de `dockerode` e `zod` no lockfile não foi extraída linha a linha; a análise fina de versões não é necessária para a arquitetura.
