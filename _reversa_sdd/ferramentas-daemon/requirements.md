# Requirements: Módulo Ferramentas Daemon

> Identificador: `ferramentas-daemon`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
Uma tool: `docker_status` (sem parâmetros). Retorna saúde do daemon: versão do engine, contadores de containers, uso de disco (imagens/volumes/build cache), plugins, estado do Swarm e avisos.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.10 tools-daemon` | fluxo docker_status | 🟢 |
| `_reversa_sdd/data-dictionary.md#1.16/2.16` | contrato de saída | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Agente | diagnóstico | saber se o daemon responde e como está o espaço |
| Desenvolvedor | healthcheck | ver versão do engine |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** `info()`/`version()`/`df()` rodam em `Promise.all`; se **qualquer uma** falhar, a tool falha como um todo (sem fallback por bloco). 🟢 (`docker-status.tool.ts:16`)
2. **RN-02:** contadores vêm direto de `info.Containers*`; `running` é `ContainersRunning` (pausados reportados separadamente). 🟢 (`docker-status.tool.ts:42-47`)
3. **RN-03:** erro de daemon fora do ar retorna **formato padronizado** `Error docker_status: <msg>` com `isError:true`, igual às demais tools (decisão DT-ST; no legado retornava `{status:"unavailable", error}` em JSON). 🟢 (`docker-status.tool.ts:90-94`)
4. **RN-04:** Swarm ausente → `{active:false, state:"inactive"}` (via `?? "inactive"`), sem derrubar a tool. 🟢 (`docker-status.tool.ts:81-82`)

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | `docker_status()` sem parâmetros | Must | saída completa conforme data-dictionary §2.16 | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Confiabilidade | chamadas em paralelo (Promise.all) | `docker-status.tool.ts:16` | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: status saudável
  Dado um daemon Docker respondendo
  Quando docker_status é chamado
  Então retorna status:"running", version, system, containers, images, disk_usage, plugins, swarm e warnings

Cenário: daemon fora do ar
  Dado um daemon inacessível
  Quando docker_status é chamado
  Então retorna erro "Error docker_status: <msg>" com isError:true (formato padronizado — DT-ST)

Cenário: swarm inativo
  Dado um daemon sem swarm ativo
  Quando docker_status é chamado
  Então swarm é {active:false, state:"inactive"} sem erro
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | única tool do módulo |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda.

## 10. Lacunas

> DT-ST resolvida na revisão — decisão do usuário: padronizar formato de erro (RN-03).

## 11. Decisões da revisão

| ID | Decisão | Resultado |
|----|---------|-----------|
| DT-ST | formato de erro do `docker_status` | Padronizar com as demais tools: texto `Error <ctx>: <msg>` + `isError:true` |

## 12. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
| 2026-08-13 | Correções da revisão: RN-01 (sem fallback por bloco), RN-02 (ContainersRunning direto), RN-03 (erro em JSON), estrutura de saída real | reversa-reviewer |
| 2026-08-13 | Revisão: DT-ST resolvido (formato de erro padronizado, RN-03) | reversa-reviewer |
