# Módulo DI, Design Técnico

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `ToolContainer.constructor` | `(constructors: ToolConstructor[], client: DockerClient)` | `ToolContainer` | |
| `ToolContainer.getTools` | `()` | `BaseTool[]` | |
| `PromptContainer.constructor` | `(constructors: PromptConstructor[])` | `PromptContainer` | |
| `PromptContainer.getPrompts` | `()` | `BasePrompt[]` | |
| `ToolConstructor` | `new (client: DockerClient) => BaseTool` | tipo | |
| `PromptConstructor` | `new () => BasePrompt` | tipo | |

## Fluxo Principal
1. Recebe array de construtores e (tools) o client.
2. `map(ctor => new ctor(client))` ou `map(ctor => new ctor())`.
3. Expõe via `getTools()`/`getPrompts()`.

## Fluxos Alternativos
- **Array vazio:** containers devolvem lista vazia; registro não falha.

## Dependências
- `DockerClient`, `BaseTool`, `BasePrompt`.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| DI por construtor, sem IoC container | `src/di/tool-container.ts` | 🟢 |
| Prompt sem acesso ao daemon (nenhum client) | `src/di/prompt-container.ts` | 🟢 |

## Estado Interno
Sem estado mutável; arrays imutáveis após construção.

## Observabilidade
Sem logs.

## Riscos e Lacunas
- Nenhum relevante.
