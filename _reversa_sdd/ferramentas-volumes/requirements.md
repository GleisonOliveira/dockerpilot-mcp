# Requirements: Módulo Ferramentas Volumes

> Identificador: `ferramentas-volumes`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
Três tools: `list_volumes`, `create_volume` e `delete_volume`. Cobre listagem com opcionais, criação associada a um container (via labels `mcp.container.*`) com drivers e opções de mount, e remoção com gate de confirmação + detecção de uso.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.9 tools-volumes` | fluxos das 3 tools | 🟢 |
| `_reversa_sdd/data-dictionary.md#1.3/1.9/1.10` | schemas de entrada | 🟢 |
| `_reversa_sdd/data-dictionary.md#2.3/2.9/2.10` | formas de saída | 🟢 |
| `_reversa_sdd/domain.md#R11,R12,R17` | drivers e gates | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Agente | persistência | criar volume ligado a um container, remover volume não usado |
| Desenvolvedor | aplicação com dados | preparar volume para montar no container |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** `delete_volume` exige `confirmed: true`; senão preview com `usingContainers` e `warning`. 🟢 (`delete-volume.tool.ts:46`)
2. **RN-02:** `delete_volume` detecta uso via `listContainers({filters:{volume:[name]}})`; volume em uso → erro bloqueante (Docker não remove volume em uso; **não existe** `force`). 🟢 (`delete-volume.tool.ts:21-30,69-75`)
3. **RN-03:** `create_volume` **exige `containerId`** (prefixo); o volume é associado ao container via labels `mcp.container.id` e `mcp.container.name`. 🟢 (`create-volume.tool.ts:10,123-151`)
4. **RN-04:** `create_volume` recebe campos estruturados por driver (mountpoint/nfsServer/nfsShare/nfsVersion/tmpfsSize/tmpfsMode) — **não** recebe `driver_opts` genérico. 🟢 (`create-volume.tool.ts:44-76,92-113`)
5. **RN-05:** Docker não suporta hot-mount; `containerPath`/readOnly/nocopy são apenas informativos (note orienta a recriar o container). 🟢 (`create-volume.tool.ts:174-177`)

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | `list_volumes` com filtros (name, driver, dangling) e opcionais (containers, usage) | Must | saída conforme data-dictionary §2.3 | 🟢 |
| RF-02 | `create_volume({containerId, driver?, ...campos por driver})` | Must | retorna volume + associação ao container + mountOptions | 🟢 |
| RF-03 | `delete_volume({name, confirmed})` com gate + detecção de uso | Must | erro se em uso; preview sem confirmed | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Segurança | remoção destrutiva com confirmação e check de uso | `delete-volume.tool.ts:21-30` | 🟢 |
| Rastreabilidade | associação container↔volume via labels | `create-volume.tool.ts:147-150` | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: criar volume nfs associado a container
  Dado um container running e create_volume({containerId, driver:"nfs", nfsServer:"1.2.3.4", nfsShare:"/export", nfsVersion:"4"})
  Quando o volume é criado
  Então retorna o volume com Driver nfs e Opts {addr, device:":/export", vers:"4"}, labels mcp.container.* e container associado

Cenário: criar volume local com bind mount
  Dado create_volume({containerId, driver:"local", mountpoint:"/mnt/data"})
  Quando o volume é criado
  Então DriverOpts = {device:"/mnt/data", type:"none", o:"bind"}

Cenário: deletar volume em uso
  Dado um volume usado por container
  Quando delete_volume({name, confirmed:true})
  Então retorna erro bloqueante listando os containers

Cenário: deletar sem confirmação
  Dado um volume existente
  Quando delete_volume({name, confirmed:false})
  Então retorna preview com usingContainers e warning, sem remover
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01..03 | Must | gestão de volumes |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda.

## 10. Lacunas

- Nenhuma.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
| 2026-08-13 | Correções da revisão: RN-03/RN-04 (schema real com containerId + campos por driver), RN-05 (sem hot-mount), RF-02/03 reformulados | reversa-reviewer |
