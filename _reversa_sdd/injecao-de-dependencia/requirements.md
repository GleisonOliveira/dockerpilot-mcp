# Requirements: Módulo DI (injeção por construtor)

> Identificador: `injecao-de-dependencia`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
Containers triviais de instanciação: `ToolContainer` mapeia `ToolConstructor[]` → `BaseTool[]` injetando o `DockerClient`; `PromptContainer` mapeia `PromptConstructor[]` → `BasePrompt[]` sem argumentos. Separa o registro declarativo (config arrays) da instanciação.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.2 di` | map-and-store; ToolContainer com client, PromptContainer sem args | 🟢 |
| `_reversa_sdd/adrs/0003-di-por-construtor.md` | decisão arquitetural | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Desenvolvedor | adicionar tool/prompt | criar classe + 1 linha no config; container instancia sozinho |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** `ToolConstructor` recebe `DockerClient` no construtor; `PromptConstructor` não recebe argumentos. 🟢
   - Origem no legado: `src/di/*.ts`
   - Tipo: confirmada
2. **RN-02:** Instanciação sem lazy loading nem ciclo de vida. 🟢
   - Origem no legado: `src/di/tool-container.ts`
   - Tipo: confirmada

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | `ToolContainer` instancia cada classe com o client | Must | getTools() devolve BaseTool[] na ordem do array | 🟢 |
| RF-02 | `PromptContainer` instancia cada classe sem args | Must | getPrompts() devolve BasePrompt[] na ordem | 🟢 |
| RF-03 | Tipos `ToolConstructor`/`PromptConstructor` exportados | Must | assinaturas de construtor tipadas | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Manutenibilidade | zero lógica além do map | `src/di/*.ts` (poucas linhas) | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: instancia tools com client
  Dado um array de ToolConstructor e um DockerClient
  Quando ToolContainer é construído
  Então getTools() retorna instâncias com o client injetado

Cenário: instancia prompts sem client
  Dado um array de PromptConstructor
  Quando PromptContainer é construído
  Então getPrompts() retorna instâncias sem argumentos
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01..03 | Must | base de todo o bootstrap |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda.

## 10. Lacunas

- Nenhuma.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
