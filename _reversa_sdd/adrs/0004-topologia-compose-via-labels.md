# ADR-0004 — Topologia Compose derivada de labels (sem ler arquivo)

**Data:** 2026-08-13 (retroativo; commits `ce3b4a0 feat(start,stop): add start_containers tool and improve stop_containers`, 2026-05-22) | **Confiança:** 🟢 CONFIRMADO

## Contexto
Para `stopDependents` e `startDependencies`, o sistema precisa saber quais containers dependem de quais dentro de um projeto Compose — sem acesso ao arquivo `docker-compose.yml` (o agente só fala via MCP/Docker API).

## Decisão
- A topologia é derivada **exclusivamente das labels** que o Compose grava nos containers: `com.docker.compose.project`, `.service` e `.depends_on`.
- Resolução por **BFS de fronteira** (fecho transitivo):
  - `stop_containers.#resolveDependents` → quem depende de um alvo; resultado **revertido** (dependentes externos param primeiro).
  - `start_containers.#resolveDependencies` → de quem um alvo depende; resultado revertido (folhas iniciam antes).
- Escopo restrito a containers do **mesmo project**; `exclude` é respeitado em todos os níveis.
- Label `depends_on` parseada como CSV; `"svc:condition"` → nome antes do `:`.

## Alternativas consideradas
- Interpretar arquivos compose via `compose config`/CLI — rejeitado (dependência de CLI e do diretório do projeto).
- Manter grafo persistente — rejeitado (labels são a fonte de verdade viva do daemon).

## Consequências
- Funciona para projetos Compose que aplicam labels (padrão do Compose v2); projetos sem labels não têm dependentes resolvidos.
- Matching por service/project é case-insensitive.
- Duplicação deliberada entre stop/start (`resolveDependents` vs `resolveDependencies`), que reflete a inversão do grafo.
