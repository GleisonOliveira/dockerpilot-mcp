# Investigation: Corrigir gaps do sync inicial

> Identificador: `001-corrigir-gaps-sync-inicial`
> Data: `2026-08-12`
> Feature: `_reversa_forward/001-corrigir-gaps-sync-inicial/requirements.md`

## 1. Pergunta de pesquisa

Como aplicar as 14 decisões da revisão (DT1-DT7, DT-IMG-01, DT-CC-01, DT-ST, DOC-01 + TEST-MANDATORY) no código legado com o menor delta possível e sem regressão de comportamento não intencional?

## 2. Fontes internas consultadas

| Fonte | O que sustenta |
|-------|----------------|
| `_reversa_sdd/gaps.md` | G-01..G-10 com evidência no código e status |
| `_reversa_sdd/questions.md` | Respostas do usuário a cada DT |
| `_reversa_sdd/domain.md#2.6` | R23 (dryRun ?? true), R24 (compose_service), R25 (versões) |
| `_reversa_sdd/architecture.md#7` | Dívidas técnicas DT1-DT7 |
| `_reversa_sdd/adrs/0002,0005,0007` | Gates de confirmação, guards dentro do tryCatch, execução estrita docker_status |
| `src/docker/tools/stop/stop.tool.ts:157` | `input.dryRun ?? true` no handler |
| `src/docker/tools/start/start.tool.ts:159` | `input.dryRun ?? false` (padrão de referência correto) |
| `src/docker/tools/create-container/create-container.tool.ts:154,226-238` | pull incondicional + descrição "without starting it" |
| `src/docker/tools/delete-image/delete-image.tool.ts:27-42` | `find()` no primeiro match, sem guarda de ambiguidade |
| `src/docker/tools/docker-status/docker-status.tool.ts:88-94` | erro em `{status:"unavailable", error}` |
| `src/docker/tools/exec-command/exec-command.tool.ts:56` | `command.split(/\s+/)` |
| `src/docker/tools/stop/stop.tool.ts:101-132` / `start/start.tool.ts:93-129` | BFS duplicado (`#resolveDependents`/`#resolveDependencies`) |
| `src/docker/prompts/compose-service/compose-service.prompt.ts` | já orienta via tools MCP (DT3 conforme) |
| `src/server.ts:15` | `version: "0.1.0"` (fonte de verdade) |
| `package.json:3` | `version: "0.0.1"` (divergente — DT1) |
| `AGENTS.md` / `README.md` | listam apenas 3 prompts (G-05) |
| `tests/docker/tools/*/` | arquivos de teste a atualizar por DT |

## 3. Alternativas avaliadas

| Decisão | Alternativas | Veredito |
|---------|--------------|----------|
| DT2 | (a) mudar handler p/ `?? false`; (b) mudar schema p/ `default true` | (a) — alinha à resposta do usuário e ao `start_containers`; (b) mudaria o contrato |
| DT4 | (a) `getImage().inspect()` antes do pull; (b) `listImages` + filtro; (c) manter pull incondicional | (a) — chamada única e direta; (b) exige parse extra de `RepoTags`; (c) custo de rede mantido |
| DT-IMG-01 | (a) lista de matches + erro se >1; (b) `find()` no primeiro; (c) exigir ID completo sempre | (a) — combina segurança com usabilidade de prefixo; (c) quebra contratos de tag |
| DT-ST | (a) texto `Error docker_status: <msg>`; (b) manter JSON `unavailable` | (a) — uniformiza com as demais tools (ADR-0005) |
| DT5 | (a) parser de aspas; (b) manter split + documentar | (a) — decisão do usuário; correção de comandos compostos |
| DT6 | (a) extrair BFS para `src/docker/shared/`; (b) manter duplicação | (a) — DT6 decidida; elimina duplicação mantendo semântica |

## 4. Padrões aplicáveis

- **Extrair função pura** (shared helpers): parser de comando (DT5) e resolutor BFS (DT6) como funções puras sem estado, testáveis isoladamente.
- **Guard interno ao tryCatch** (ADR-0005): a guarda de ambiguidade do `delete_image` lança dentro do bloco do `tryCatch`, retornando `Error deleting image: ...` como `outcome.result`/`outcome.error` — mesmo padrão dos guards atuais de campo obrigatório.
- **Contrato de erro uniforme** (ADR-0005): `Error <ctx>: <msg>` + `isError:true` em todas as tools.
- **Delta mínimo**: nenhuma mudança de schema Zod nesta feature (contratos de entrada intactos); apenas comportamento/descrição/saída de erro.

## 5. Fonte externa

Não são necessárias fontes externas: todas as decisões estão registradas no repositório (`questions.md`, `gaps.md`) e as evidências são o próprio código legado.

## 6. Links

- ADR-0002 (confirmação): `_reversa_sdd/adrs/0002-confirmacao-explicita-destrutivas.md`
- ADR-0005 (guards no tryCatch): `_reversa_sdd/adrs/0005-guards-dentro-do-handler-trycatch.md`
- ADR-0007 (docker_status estrito): `_reversa_sdd/adrs/0007-execucao-estrita-docker-status.md`
- ADR-0004 (topologia por labels): `_reversa_sdd/adrs/0004-topologia-compose-via-labels.md`
