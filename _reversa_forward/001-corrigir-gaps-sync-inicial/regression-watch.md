# Regression Watch — 001-corrigir-gaps-sync-inicial

> Data: `2026-08-12`
> Feature: `001-corrigir-gaps-sync-inicial`
> Origem dos watch items: seção "Modificadas" do `legacy-impact.md`

## Watch principal

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|
| W001 | `_reversa_sdd/domain.md#2.6 R23` | `stop_containers` sem `dryRun` executa de fato (default `false`), coerente com o schema | presença | Handler volta a `dryRun ?? true` (primeira chamada retorna preview) ou schema diverge do handler |
| W002 | `_reversa_sdd/domain.md#2.4 R15` | `create_container` só puxa a imagem quando `getImage().inspect()` falha; imagem local não dispara pull | presença | Pull executado incondicionalmente, independente da existência local |
| W003 | `_reversa_sdd/domain.md#2.5 R20` | Falha do daemon em `docker_status` → texto `Error docker_status: <msg>` + `isError:true` | redação | Retorna objeto `{status:"unavailable"}` no erro |
| W004 | `_reversa_sdd/domain.md#2.3 R12/R13` | Ordem de parada folha→pai e de início dependência→dependor, restritas ao mesmo project e respeitando `exclude`, via resolutores compartilhados | presença | Ordem revertida/incorreta, vazamento entre projects ou `exclude` ignorado |
| W005 | `_reversa_sdd/domain.md#2.6 R22 (exec_command)` | `exec_command` tokeniza o comando com `parseCommand` (aspas e escapes preservados), não com `split(/\s+/)` | presença | Comando com aspas volta a ser fragmentado ou `parseCommand` deixa de ser usado |
| W006 | `_reversa_sdd/domain.md#2.6 R24` | Prompt `compose_service` orienta via tools MCP; **não** referencia `exec_command` com `args` inexistente no schema | ausência | Qualquer nova referência a `tool: exec_command` (ou `args.command:"cat"`) no template do prompt |
| W007 | `_reversa_sdd/domain.md#2.6 R25` | `package.json` e `src/server.ts` reportam a mesma versão (`0.1.0`) | presença | Versões voltam a divergir |

## Observações (sem peso de regressão — origens originalmente 🟡/🔴)

- **R24 (🟡)** — divergência do prompt `compose_service` vs schema de `exec_command` foi corrigida (DT3). Não havia regra 🟢 prévia; correção coberta pelo teste de regressão em `tests/docker/prompts/compose-service/compose-service.prompt.test.ts`.
- **R25 (🟡)** — versões divergentes corrigidas (DT1). Não havia regra 🟢 prévia; correção coberta por `tests/server.test.ts` (TT-03).
- **L1 (🔴)** — motivação histórica do `dryRun ?? true` no stop não documentada em ADR: tornou-se obsoleta (DT2 aplicou `?? false`); se o handler reverter para preview-por-padrão, W001 dispara.
- **L3 (🔴)** — não há ADRs formais; decisões DT1–DT7/DT-IMG-01/DT-CC-01/DT-ST/DOC-01 registradas em `_reversa_sdd/gaps.md` e `_reversa_forward/001-corrigir-gaps-sync-inicial/`.

## Histórico de re-extrações

(vazio — será preenchido quando `/reversa` rodar novamente sobre o código novo)

## Arquivadas

(vazio — 7 watch items ativos)
