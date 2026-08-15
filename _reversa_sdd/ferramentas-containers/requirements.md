# Requirements: Módulo Ferramentas Containers

> Identificador: `ferramentas-containers`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
Six tools de ciclo de vida de containers: `list_containers`, `stop_containers`, `start_containers`, `restart_container`, `delete_container` e `create_container`. Inclui resolução de dependências Compose via labels (BFS), gates de confirmação/dryRun e criação com pull automático.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.6 tools-containers` | schemas e fluxos das 6 tools | 🟢 |
| `_reversa_sdd/data-dictionary.md#1.1/1.4/1.5/1.6/1.11/1.15` | contratos de entrada/saída | 🟢 |
| `_reversa_sdd/domain.md#R01-R13,R15-R17,R23` | regras de domínio | 🟢 |
| `_reversa_sdd/adrs/0002/0004` | gates e topologia por labels | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Agente de IA | gerenciar containers | listar, parar dependentes, iniciar dependências, criar app |
| Desenvolvedor | operar stack Compose | stop/start com ordem correta de dependências |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** `delete_container` exige `confirmed: true`; senão retorna preview. 🟢 (`domain.md#R01`)
2. **RN-02:** `stop_containers` alvos = running (names substring / ids prefixo / todos); `exclude` protege. 🟢
3. **RN-03:** `start_containers` alvos = `exited|created|paused`. 🟢
4. **RN-04:** Dependências Compose resolvidas por BFS apenas no mesmo project (labels). 🟢 (`adrs/0004`)
5. **RN-05:** `create_container` faz pull da imagem **apenas se ela não existir localmente** (decisão DT4 — o legado puxava incondicionalmente). 🟢 (`create-container.tool.ts:154`)
6. **RN-06:** `stop_containers` handler usa `dryRun ?? false` — default real de execução = **false** (executa), alinhado ao schema e ao `start_containers` (decisão DT2; no legado era `?? true`). 🟢
7. **RN-07:** descrição da tool `create_container` é "Create a Docker container and start it" — cria **e inicia** (decisão DT-CC-01; o legado descrevia "without starting it", contrariando o handler). 🟢

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | `list_containers` com filtros e enriquecimento opcional | Must | 11 flags include* + filtros id/name/status | 🟢 |
| RF-02 | `stop_containers` com names/ids/exclude/timeout/force/stopDependents/dryRun/summarized | Must | ordem: dependentes externos primeiro | 🟢 |
| RF-03 | `start_containers` com startDependencies/dryRun/summarized | Must | ordem: dependências profundas primeiro | 🟢 |
| RF-04 | `restart_container` por nome exato ou prefixo ID | Must | retorna id/name/status | 🟢 |
| RF-05 | `delete_container` com gate confirmed + force + removeImage | Must | preview sem confirmed | 🟢 |
| RF-06 | `create_container` (imagem, name, command, env, ports, volumes, networks, restart_policy, healthcheck, resources, labels) | Must | verifica imagem local → pull se ausente → create → start → inspect | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Segurança | operações destrutivas com confirmação | `delete.tool.ts:84` | 🟢 |
| Confiabilidade | `summarized` default true (resposta mínima em execução real) | `stop.tool.ts:191` | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: parada com dependentes
  Dado um project Compose com serviço A dependido por B
  Quando stop_containers({names:["A"], stopDependents:true})
  Então B é parado antes de A e marcado dependent:true

Cenário: delete sem confirmação
  Dado um container existente
  Quando delete_container({id, confirmed:false})
  Então retorna preview e não remove

Cenário: criação com porta sem protocolo
  Dado create_container({image:"nginx", ports:[{host:"8080", container:"80"}]})
  Quando o container é criado
  Então expõe "80/tcp" e bind 8080
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01..06 | Must | núcleo de gestão de containers |
| dryRun/R07 | Should | proteção extra de UX |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda.

## 10. Lacunas

> Resolvidas na revisão — decisões do usuário registradas (ver §12).

## 11. Decisões da revisão

| ID | Decisão | Resultado |
|----|---------|-----------|
| DT2 | default do `stop_containers` | Corrigir handler → `dryRun ?? false` (executa por padrão); preview via `dryRun:true` |
| DT4 | pull no `create_container` | Pular pull quando a imagem já existe localmente |
| DT-CC-01 | descrição × comportamento do `create_container` | Corrigir descrição → "creates and starts"; comportamento atual (inicia) mantido |

## 12. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
| 2026-08-13 | Revisão: DT2/DT4/DT-CC-01 resolvidos com decisões do usuário (RN-05/06/07, RF-06) | reversa-reviewer |
