# Requirements: Módulo Operações em Container

> Identificador: `operacoes-container`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
Duas tools: `exec_command` (executa comando em container running) e `container_logs` (últimas N linhas). Ambas aceitam apenas ID (prefixo), jamais nome; ambas fazem parse de stream multiplexado (frames de 8 bytes).

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.7 tools-container-ops` | fluxo exec/logs e parser | 🟢 |
| `_reversa_sdd/data-dictionary.md#1.12/1.13` | contratos | 🟢 |
| `_reversa_sdd/domain.md#R08,R21` | ID-only; frames | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Agente | inspecionar runtime | `ls -la /app`, ler logs de erro |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** `exec_command` só executa em container `running`. 🟢 (`domain.md#R05`)
2. **RN-02:** `exec_command`/`container_logs` aceitam apenas ID (prefixo), nomes NÃO. 🟢 (`domain.md#R08`)
3. **RN-03:** comando é dividido por parser que **respeita aspas simples/duplas** (decisão DT5; o legado usava `split(/\s+/)`, quebrando `sh -c 'echo "a b"'`). 🟢

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | `exec_command({id, command, silent=false})` | Must | retorna containerId, exitCode, success, output (omitido se silent); comando com aspas preservado (DT5) | 🟢 |
| RF-02 | `container_logs({id, tail=5})` | Must | logs: string[] (stdout+stderr), linhas vazias filtradas | 🟢 |
| RF-03 | Parse de frames multiplexados com fallback raw | Must | stream → texto | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Segurança | execução restrita a container running e por ID | `exec-command.tool.ts:46-52` | 🟢 |
| Desempenho | tail default 5 linhas | `container-logs.tool.ts:9` | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: execução em container running
  Dado um container running com ID prefixo conhecido
  Quando exec_command({id, command:"ls -la"})
  Então retorna exitCode 0 e output com a listagem

Cenário: execução em container parado
  Dado um container parado
  Quando exec_command é chamado
  Então retorna erro "Container is not running"

Cenário: nome não aceito
  Dado um nome de container
  Quando exec_command({id:"meu-container"})
  Então retorna erro "Container not found" (nomes não são resolvidos)
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01..03 | Must | ferramentas de diagnóstico |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda.

## 10. Lacunas

> DT5 resolvida na revisão — decisão do usuário: parser com suporte a aspas (RN-03).

## 11. Decisões da revisão

| ID | Decisão | Resultado |
|----|---------|-----------|
| DT5 | split de comando no `exec_command` | Adotar parser com suporte a aspas simples/duplas |

## 12. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
| 2026-08-13 | Revisão: DT5 resolvido (parser com aspas, RN-03/RF-01) | reversa-reviewer |
