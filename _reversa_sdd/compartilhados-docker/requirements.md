# Requirements: Módulo Compartilhados Docker

> Identificador: `compartilhados-docker`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
Contratos abstratos `BaseTool`/`BasePrompt` com `register(server)` e o `ContainerFieldResolvers`, que enriquece containers com campos opcionais (ports, mounts, networks, labels, usage, healthcheck, restart, compose, dependencies, resource limits, state details). Usado por `list_containers` sob demanda.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.5 docker-shared` | resolvers estáticos + contracts | 🟢 |
| `_reversa_sdd/code-analysis.md#3` | algoritmo de CPU% (usage) | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Desenvolvedor | criar tool/prompt | estender BaseTool/BasePrompt |
| Agente | inspecionar container | list_containers com include* flags |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** Resolvers que exigem inspect compartilham uma única chamada `inspect()` por container. 🟢
   - Origem no legado: `src/docker/tools/list/list.tool.ts:70`
   - Tipo: confirmada
2. **RN-02:** `usage` só calcula para container `running`; falha de stats → `usage: null`. 🟢
   - Origem no legado: `src/docker/shared/list.resolvers.ts:29`
   - Tipo: confirmada
3. **RN-03:** `network_id` truncado em 12 chars. 🟢
   - Origem no legado: `src/docker/shared/list.resolvers.ts:19`
   - Tipo: confirmada
4. **RN-04:** Resolução de dependências Compose (BFS por labels `mcp.project`/`mcp.service`) extraída para `docker/shared/`, consumida por `stop_containers` e `start_containers` — decisão DT6 (no legado a lógica estava duplicada em cada tool). 🟢

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | `BaseTool.register(server)` abstrato | Must | toda tool implementa | 🟢 |
| RF-02 | `BasePrompt.register(server)` abstrato | Must | todo prompt implementa | 🟢 |
| RF-03 | Resolvers estáticos de campos opcionais | Must | 11 métodos conforme data-dictionary §2.1 | 🟢 |
| RF-04 | Cálculo de `usage` (CPU%, mem) | Must | fórmula de delta cgroup | 🟢 |
| RF-05 | Resolutor BFS de dependências Compose compartilhado (DT6) | Must | `stop_containers` e `start_containers` consomem o mesmo resolutor | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | 1 inspect por container p/ flags que exigem | `list.tool.ts:70` | 🟢 |
| Desempenho | resolvers em `Promise.all` | `list.tool.ts:79` | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: enriquecimento com include
  Dado list_containers com includeStateDetails
  Quando o container é processado
  Então o item inclui state_details derivado do inspect

Cenário: usage de container parado
  Dado um container não running
  Quando includeUsage é pedido
  Então usage retorna null
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01/02 | Must | contrato de todas as tools/prompts |
| RF-03/04 | Must | base do list_containers |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda.

## 10. Lacunas

> DT6 resolvida na revisão — decisão do usuário: extrair resolver BFS compartilhado (RN-04/RF-05).

## 11. Decisões da revisão

| ID | Decisão | Resultado |
|----|---------|-----------|
| DT6 | duplicação BFS stop/start | Extrair resolutor de dependências para `src/docker/shared/` |

## 12. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
| 2026-08-13 | Revisão: DT6 resolvido (RN-04/RF-05) | reversa-reviewer |
