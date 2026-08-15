# Adendo — Corrigir gaps do sync inicial (aplicar decisões da revisão)

> Feature: `001-corrigir-gaps-sync-inicial`
> Data: 2026-08-12
> Cenário: legado

## Vigência

Vigente desde 2026-08-12.

## Resumo da entrega

Corrige os gaps G-01 a G-10 detectados na revisão da extração reversa, aplicando no código e na documentação as decisões já registradas pelo usuário (DT1–DT7, DT-IMG-01, DT-CC-01, DT-ST, DOC-01), alinhando o comportamento real das tools MCP e a documentação do projeto aos contratos já corrigidos em `_reversa_sdd/`. Nenhum contrato novo foi introduzido. 24 ações concluídas em 5 fases, com `npm run check` verde (606 testes, coverage 99.73% statements).

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|----------|-------|-----------------|-------|
| `_reversa_sdd/architecture.md` | `#6 Módulos (11) — docker-shared` | componente-novo | `parse-command.ts` e `dependency-resolver.ts` passam a existir como utilitários compartilhados puros (DT5/DT6) |
| `_reversa_sdd/architecture.md` | `#6 Módulos (11) — tools-containers` | regra-alterada | stop/start delegam a resolução de dependências aos resolutores compartilhados; default de `dryRun` do stop passou a executar (DT2/DT6) |
| `_reversa_sdd/architecture.md` | `#6 Módulos (11) — tools-images` | regra-nova | `delete_image` agora detecta prefixo ambíguo e exige o full image ID; 0 matches → "No image found matching" (DT-IMG-01) |
| `_reversa_sdd/architecture.md` | `#6 Módulos (11) — tools-container-ops` | regra-alterada | `exec_command` tokeniza o comando com o parser compartilhado (aspas e escapes preservados), não mais `split(/\s+/)` (DT5) |
| `_reversa_sdd/architecture.md` | `#6 Módulos (11) — tools-daemon` | regra-alterada | erro do `docker_status` passou a texto `Error docker_status: <msg>` + `isError:true` (DT-ST) |
| `_reversa_sdd/architecture.md` | `#6 Módulos (11) — prompts` | regra-alterada | prompt `compose_service` deixou de referenciar `exec_command` com `args` inexistente e orienta identificação de serviço via `list_containers` + `includeComposeMetadata` (DT3) |
| `_reversa_sdd/architecture.md` | `#6 Módulos (11) — core` | regra-alterada | versão do projeto unificada em `0.1.0`; AGENTS.md/README listam os 7 prompts reais, a limitação de Dockerfile (DT7) e a nota do `ToolContainer` (G-08) — DOC-01 |
| `_reversa_sdd/domain.md` | `#2.4 Criação e volume — R15` | regra-alterada | `create_container` só puxa a imagem quando `getImage().inspect()` falha (imagem local não dispara pull) (DT4) |
| `_reversa_sdd/domain.md` | `#2.3 Topologia Compose — R12/R13` | regra-alterada | ordem de parada/início mantida (folha→pai; dependência→dependor), agora via resolutores compartilhados com isolamento por project e `exclude` — regra preservada, implementação refatorada (DT6) |
| `_reversa_sdd/domain.md` | `#2.5 Relatório — R20` | regra-alterada | falha do daemon em `docker_status` mudou de `{status:"unavailable"}` para texto `Error docker_status: <msg>`; cálculo de `reclaimable_bytes` inalterado (DT-ST) |
| `_reversa_sdd/domain.md` | `#2.6 Observações — R23` | regra-alterada | divergência schema×handler do stop eliminada: `dryRun ?? true` → `dryRun ?? false` (DT2) |
| `_reversa_sdd/domain.md` | `#2.6 Observações — R24` | regra-alterada | contrato do prompt `compose_service` realinhado ao schema real de `exec_command` (DT3) |
| `_reversa_sdd/domain.md` | `#2.6 Observações — R25` | regra-alterada | `package.json` e `McpServer` ambos `0.1.0` (DT1) |

## Regras sob vigilância

- `W001` (dryRun default false) — `_reversa_forward/001-corrigir-gaps-sync-inicial/regression-watch.md`
- `W002` (pull condicional) — `_reversa_forward/001-corrigir-gaps-sync-inicial/regression-watch.md`
- `W003` (erro docker_status em texto) — `_reversa_forward/001-corrigir-gaps-sync-inicial/regression-watch.md`
- `W004` (ordem do resolutor compartilhado) — `_reversa_forward/001-corrigir-gaps-sync-inicial/regression-watch.md`
- `W005` (parseCommand no exec_command) — `_reversa_forward/001-corrigir-gaps-sync-inicial/regression-watch.md`
- `W006` (compose_service sem exec_command inválido) — `_reversa_forward/001-corrigir-gaps-sync-inicial/regression-watch.md`
- `W007` (versão 0.1.0 unificada) — `_reversa_forward/001-corrigir-gaps-sync-inicial/regression-watch.md`

## Fontes

- `_reversa_forward/001-corrigir-gaps-sync-inicial/legacy-impact.md`
- `_reversa_forward/001-corrigir-gaps-sync-inicial/regression-watch.md`
- `_reversa_forward/001-corrigir-gaps-sync-inicial/requirements.md`
- `_reversa_forward/001-corrigir-gaps-sync-inicial/actions.md`
- `_reversa_forward/001-corrigir-gaps-sync-inicial/progress.jsonl`

## Atualização 2026-08-14

Emenda E001 aplicada pelo `/reversa-add`: reversão parcial do DT3 no prompt `compose_service`. O prompt volta a orientar a IA a ler o arquivo `docker-compose.yml` (com fallbacks `compose.yaml`/`docker-compose.yaml`/`compose.yml`) para identificar os serviços e seus overrides de `container_name:` e, a partir dessas informações, operar o serviço via as tools MCP do projeto. A identificação via `list_containers` + `includeComposeMetadata` foi removida do template do assistente. A restrição do DT3 que motivou o ajuste original permanece: o prompt **não** referencia mais `exec_command` com `args` inexistente — a leitura do arquivo é instrução direta ao agente, não invocação de tool.

### Impacto adicional por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|----------|-------|-----------------|-------|
| `_reversa_sdd/architecture.md` | `#6 Módulos (11) — prompts` | regra-alterada | prompt `compose_service` identifica o serviço lendo o `docker-compose.yml` primeiro e então opera via tools MCP; identificação por `includeComposeMetadata` removida (E001) |
| `_reversa_sdd/domain.md` | `#2.6 Observações — R24` | regra-alterada | `compose_service` orienta leitura do arquivo compose + tools MCP; mantida a inexistência de referência inválida a `exec_command` |

### Regras sob vigilância

- `W006` (compose_service sem `exec_command` inválido) permanece vigente — `_reversa_forward/001-corrigir-gaps-sync-inicial/regression-watch.md`

### Fontes desta atualização

- `_reversa_forward/001-corrigir-gaps-sync-inicial/requirements.md` (seção `## Emendas`, E001)
- `_reversa_forward/001-corrigir-gaps-sync-inicial/legacy-impact.md`
- `_reversa_forward/001-corrigir-gaps-sync-inicial/progress.jsonl` (linha E001)
