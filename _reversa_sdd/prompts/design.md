# Módulo Prompts, Design Técnico

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `ContainerTroubleshootPrompt.register` | `(server)` | `void` | args: container_name?, symptom? |
| `ImageCleanupPrompt.register` | `(server)` | `void` | sem args |
| `VolumeRemovalPrompt.register` | `(server)` | `void` | sem args |
| `ComposeStartPrompt.register` | `(server)` | `void` | args: project_dir? |
| `ComposeStopPrompt.register` | `(server)` | `void` | args: project_dir? |
| `ComposeRestartPrompt.register` | `(server)` | `void` | args: project_dir? |
| `ComposeServicePrompt.register` | `(server)` | `void` | args: service_name?, action? |

## Fluxo Principal
1. Cliente pede um prompt com argumentos.
2. `registerPrompt(nome, {description, argsSchema}, (args) => ({messages: build<Nome>Messages(args)}))`.
3. `build<Nome>Messages` (no `.template.ts`) monta as mensagens `user`/`assistant` (texto orientador em inglês, definido em `messages/*.ts`).
4. O agente (cliente MCP) executa as tools por conta própria.

## Fluxos Alternativos
- **Argumentos ausentes:** schemas opcionais → orientação genérica.

## Dependências
- `@modelcontextprotocol/sdk` (McpServer), `BasePrompt`.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| mensagens em arquivos separados (user/assistant) | `messages/*.ts` em cada prompt | 🟢 |
| template builder por prompt | `*.template.ts` | 🟢 |
| prompts não recebem DockerClient | `prompt-container.ts`, `base.prompt.ts` | 🟢 |
| prompts de Compose usam args `project_dir`/`service_name`+`action` | `compose-*.prompt.ts` | 🟢 |

## Estado Interno
Sem estado.

## Observabilidade
Sem logs; visíveis via listagem de prompts.

## Riscos e Lacunas
- 🟡 Qualidade da orientação depende do conteúdo estático (sem contexto dinâmico do daemon).
- 🟡 `compose_*` prompts orientam comandos `docker compose` (CLI), enquanto as tools MCP operam por container — fluxo híbrido.
