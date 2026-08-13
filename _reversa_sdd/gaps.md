# Gaps e Inconsistências (Revisão)

> Revisão do Revisor (reversa-autonomous) — comparação da extração (`_reversa_sdd/`) contra o código-fonte e documentação do legado.
> Severidade: 🔴 Crítico (inconsistência que muda o contrato) / 🟡 Médio / 🟢 Baixo.

## 🔴 Críticos

| ID | Gap | Onde (extração) | Evidência (código) | Status |
|----|-----|-----------------|--------------------|--------|
| G-01 | `delete_image` sem guarda de ambiguidade — spec afirmava "erro em id ambíguo", código deleta o primeiro match | `ferramentas-imagens/requirements.md` | `delete-image.tool.ts:29-39` (`find()` sem checar `matches.length`) | ✅ RESOLVIDO (DT-IMG-01: guarda de ambiguidade) |
| G-02 | Descrição da tool `create_container` diz "without starting it / use start_containers", código inicia o container | `ferramentas-containers/requirements.md` | `create-container.tool.ts:226-238` (description) vs `:190` (`container.start()`) | ✅ RESOLVIDO (DT-CC-01: corrigir descrição → cria e inicia) |
| G-03 | `stop_containers` dryRun default divergente: schema `false`, handler `?? true` | `ferramentas-containers/requirements.md` | `stop.tool.ts:157` vs `:157` handler | ✅ RESOLVIDO (DT2: handler → `?? false`) |

## 🟡 Médios

| ID | Gap | Onde (extração) | Evidência | Status |
|----|-----|-----------------|-----------|--------|
| G-04 | `create_volume` exige `containerId` (labels mcp.* + mountOptions) — spec antiga citava `driver_opts` e mountPath `/mnt/<name>` | `ferramentas-volumes/requirements.md` | `create-volume.tool.ts:21-85` | ✅ CORRIGIDO |
| G-05 | AGENTS.md lista apenas 3 prompts; na real são 7 (4 Compose não documentados) | `AGENTS.md` | `src/prompts.config.ts` | ⏳ DOC-01 — atualizar docs na fase de implementação |
| G-06 | `docker_status` erro com formato próprio `{status:"unavailable", error}` — diverge do padrão `Error <ctx>: <msg>`; e falha de info/version/df derruba a tool inteira | `ferramentas-daemon/requirements.md` | `docker-status.tool.ts:90-94` | ✅ RESOLVIDO (DT-ST: padronizar formato; execução estrita mantida via ADR-0007) |
| G-07 | `compose_service` prompt fora do contrato de `exec_command` (L2 do Detective) | `prompts/requirements.md` | `compose-service.prompt.ts` | ✅ RESOLVIDO (DT3: orienta via tools MCP) |
| G-08 | `ToolContainer` instancia sem try/catch (criação falha derruba o server) | `injecao-de-dependencia/requirements.md` | `di/tool-container.ts` | ✅ DOCUMENTADO |

## 🟢 Baixos

| ID | Gap | Onde | Evidência | Status |
|----|-----|------|-----------|--------|
| G-09 | Versão divergente: package.json `0.0.1` vs server `0.1.0` | — | `package.json` vs `server.ts` | ✅ DECIDIDO (DT1: package.json → 0.1.0) |
| G-10 | Sem Dockerfile próprio do servidor MCP | — | — | ✅ DECIDIDO (DT7: não criar agora; documentar limitação) |

## Correções aplicadas nesta revisão

- `ferramentas-imagens/requirements.md` — pull → `{pulled, image, id, tags, size_bytes}`; preview delete → tags/size_mb/created; prune → count/total_size_mb; dangling vazio → `{deleted:false, message}`.
- `ferramentas-volumes/requirements.md` — create_volume reescrito (containerId obrigatório, labels mcp.*, mountOptions, sem `/mnt/`).
- `ferramentas-daemon/requirements.md` — erro em formato `{status:"unavailable"}`; swarm inativo sem erro; Documento sem fallback por bloco.
- `ferramentas-containers/requirements.md` + `tasks.md` — DT2 + DT-CC-01 com origem no legado e confiança.
- `openapi/dockerpilot-mcp.yaml` — outputs reais de pull_image, delete_image (preview), prune_images e docker_status; `/docker_status` com descrição estruturada completa.
- `user-stories/acceptance-criteria.md` e `scenarios.md` — US-03/US-04/US-05 corrigidos (ambiguidade, containerId, 7 prompts, formato docker_status).
- `questions.md` — reescrito com numeração alinhada aos DT do Arquiteto (DT1-DT7) + novos DT-IMG-01, DT-CC-01, DT-ST, DOC-01.

## Decisões do usuário integradas (2026-08-13)

| ID | Decisão | Units afetadas |
|----|---------|----------------|
| DT2 | stop `dryRun ?? false` (executa por padrão) | ferramentas-containers |
| DT4 | create_container pula pull se imagem existe | ferramentas-containers |
| DT5 | exec_command com parser de aspas | operacoes-container |
| DT-IMG-01 | delete_image com guarda de ambiguidade | ferramentas-imagens |
| DT-CC-01 | descrição create_container → "creates and starts" | ferramentas-containers |
| DT-ST | docker_status com erro padronizado | ferramentas-daemon |
| DT3 | compose_service orienta via tools MCP | prompts |
| DT6 | resolver BFS compartilhado em docker/shared/ | compartilhados-docker + ferramentas-containers |
| DT1 | package.json → 0.1.0 | — (implementação) |
| DT7 | sem Dockerfile agora; documentar limitação | — (implementação) |
| DOC-01 | atualizar AGENTS.md/README com 7 prompts | — (implementação, fora da extração) |

> Nota sobre a regra do Reversa: arquivos do legado (AGENTS.md/README, `package.json`, código das tools) **não** são modificados na extração — as decisões ficam registradas nas specs e serão aplicadas na fase de implementação.

## Requisito obrigatório — testes (2026-08-13)

- 🟢 **Obrigatório:** toda correção dos itens DT exige **correção/atualização dos testes correspondentes** (arquivos em `tests/docker/tools/<tool>/`) e **rodar `npm test` com todos os testes passando** como condição para considerar a tarefa concluída. Sem exceção.
- Registrado em cada `tasks.md` afetado (seção "Requisito obrigatório (testes)" + novas TT de regressão por DT).
