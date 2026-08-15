# Data Delta: Corrigir gaps do sync inicial

> Identificador: `001-corrigir-gaps-sync-inicial`
> Data: `2026-08-12`

## 1. Escopo

O sistema **não possui modelo de dados persistente** (nenhum banco, arquivo de estado ou cache próprio — ver `_reversa_sdd/architecture.md#1`). As únicas estruturas de dados relevantes são:

- os **schemas Zod** de entrada das tools (contratos de input);
- as **formas de saída** (JSON) documentadas em `_reversa_sdd/data-dictionary.md`;
- os **labels** do Docker Compose usados pelo resolutor BFS.

## 2. Deltas de modelo

| Item | Antes | Depois | Onde |
|------|-------|--------|------|
| Contrato de entrada `stop_containers.dryRun` | schema `default false`, handler `?? true` (inconsistente) | schema `default false`, handler `?? false` (consistente) | `src/docker/tools/stop/stop.tool.ts` |
| Contrato de entrada `create_container` | pull incondicional | pull condicional (imagem ausente) | `src/docker/tools/create-container/create-container.tool.ts` |
| Formato de erro `docker_status` | JSON `{status:"unavailable", error}` | texto `Error docker_status: <msg>` + `isError:true` | `src/docker/tools/docker-status/docker-status.tool.ts` |
| Comportamento `delete_image` | `find()` primeiro match | lista de matches; erro se >1 | `src/docker/tools/delete-image/delete-image.tool.ts` |
| Comando `exec_command` | split por `/\s+/` | tokenização com aspas simples/duplas | `src/docker/tools/exec-command/exec-command.tool.ts` + helper `src/docker/shared/` |
| Resolução de dependências Compose | BFS duplicado em stop e start | BFS único em `src/docker/shared/dependency-resolver.ts` | `src/docker/shared/` |

## 3. Migrações

n/a — não há dados persistidos a migrar. Nenhuma migração de dados, índice ou schema de armazenamento.

## 4. Compatibilidade

- Schemas Zod de entrada **não mudam** nesta feature (apenas comportamento/descrição/erro). Agentes que já chamam as tools continuam válidos.
- Exceção intencional: chamadas de `stop_containers` **sem** `dryRun` passam a executar (default real muda de preview para execução). É o objetivo de DT2 e está documentado no contrato.
- `docker_status` em falha muda de `{status:"unavailable",...}` para texto `Error docker_status: <msg>` — contrato de erro só, agente precisa tratar texto.
