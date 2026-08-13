# Perguntas em Aberto (Questionário para o Usuário)

> Geradas pelo Revisor (reversa-autonomous) com base nos artefatos de extração e na revisão contra o código-fonte.
> **Todas as perguntas foram respondidas pelo usuário em 2026-08-13.** As decisões já foram integradas aos `requirements.md`/`tasks.md` das units afetadas (confiança 🟢, `[DÚVIDA]` removidos).

## 🟥 Alta prioridade (bloqueiam decisões de comportamento)

### DT2 — `stop_containers`: dryRun default divergente
**Contexto:** `stop.tool.ts:157` — schema define `dryRun: boolean().default(false)`, mas o handler lê `dryRun ?? true` → default real de execução é **true** (sempre preview). `start_containers` usa `?? false` (correto).
**Spec afetada:** [`_reversa_sdd/ferramentas-containers/requirements.md`]
**Pergunta:** Alinhar o schema ao comportamento (default `true`) ou corrigir o handler (default `false`, executando por padrão)?
**Impacto:** Mudança de default no stop pode causar paradas acidentais.

**Resposta:** Corrigir handler → dryRun ?? false (executa por padrão); preview via dryRun:true

### DT4 — `create_container`: pull incondicional
**Contexto:** `create-container.tool.ts:154` — o create sempre faz pull da imagem antes de criar, mesmo se já existir localmente.
**Spec afetada:** [`_reversa_sdd/ferramentas-containers/requirements.md`]
**Pergunta:** Manter pull incondicional ou pular quando a imagem já existe localmente?
**Impacto:** Desempenho em re-criações; custo de rede.

**Resposta:** Pular pull quando a imagem já existe localmente (verificar antes de puxar)

### DT5 — `exec_command`: split de comando por espaços
**Contexto:** `exec-command.tool.ts:56` — `command.split(/\s+/)` não respeita aspas; comandos como `sh -c 'echo "a b"'` quebram.
**Spec afetada:** [`_reversa_sdd/operacoes-container/requirements.md`]
**Pergunta:** Adotar um parser com suporte a aspas ou manter split simples (documentar limitação)?
**Impacto:** Correção de comandos complexos.

**Resposta:** Adotar parser com suporte a aspas simples/duplas

### DT-IMG-01 — `delete_image`: sem proteção contra prefixo ambíguo
**Contexto:** `delete-image.tool.ts:29-39` — `find()` retorna o **primeiro** match; prefixo que casa múltiplas imagens deleta uma arbitrária. A spec inicial da revisão afirmava erro de ambiguidade, mas o código não tem essa guarda.
**Spec afetada:** [`_reversa_sdd/ferramentas-imagens/requirements.md`]
**Pergunta:** Adicionar guarda (erro quando >1 match) ou manter comportamento atual (deletar o primeiro)?
**Impacto:** Segurança de remoção por ID curto.

**Resposta:** Adicionar guarda de ambiguidade: erro quando o prefixo casa múltiplas imagens

### DT-CC-01 — `create_container`: descrição contradiz o comportamento
**Contexto:** `create-container.tool.ts:226-238` — descrição diz "Create a Docker container **without starting it**... After creation, use start_containers", mas o handler executa `container.start()` (linha 190). A spec registra cria **e** inicia.
**Spec afetada:** [`_reversa_sdd/ferramentas-containers/requirements.md`]
**Pergunta:** Corrigir a descrição (cria e inicia) ou mudar o comportamento (não iniciar)?
**Impacto:** Contrato exposto aos agentes; o RF-06 atual documenta o comportamento real.

**Resposta:** Corrigir descrição → cria e inicia ("Create a Docker container and start it")

### DT-ST — `docker_status`: formato de erro divergente
**Contexto:** `docker-status.tool.ts:90-94` — erro retorna `{status:"unavailable", error}` em JSON com `isError:true`; as demais tools usam texto `Error <ctx>: <msg>`. Também: falha em `info()/version()/df()` derruba a tool inteira (sem fallback por bloco).
**Spec afetada:** [`_reversa_sdd/ferramentas-daemon/requirements.md`]
**Pergunta:** Padronizar o formato de erro com as demais tools, ou manter o formato atual de "status unavailable"?
**Impacto:** Contrato uniforme de erros para os agentes.

**Resposta:** Padronizar erro com as demais tools (texto Error <ctx>: <msg> + isError:true)

## 🟨 Média prioridade (decisões de design)

### DT3 — `compose_service` × `exec_command`
**Contexto:** lacuna L2 do Detective — o prompt `compose_service` referencia tools (list_containers, start/stop/restart_container, container_logs); verificar se o contrato do prompt e das tools está coerente.
**Spec afetada:** [`_reversa_sdd/prompts/requirements.md`]
**Pergunta:** O prompt `compose_service` deve continuar orientando operações por container (via tools MCP) ou apenas gerar comandos `docker compose` (CLI)?

**Resposta:** Orientar via tools MCP (manter contrato atual do prompt)

### DT6 — Duplicação BFS stop/start
**Contexto:** `#resolveDependents` (stop) e `#resolveDependencies` (start) duplicam lógica BFS de labels Compose.
**Pergunta:** Extrair resolução de dependências para `src/docker/shared/` compartilhado?
**Impacto:** Manutenibilidade.

**Resposta:** Extrair resolver compartilhado de dependências para src/docker/shared/

## 🟩 Baixa prioridade (melhorias / documentação)

### DT1 — Versões divergentes
**Contexto:** `package.json` `0.0.1` vs `server.ts` McpServer `version: "0.1.0"`.
**Pergunta:** Alinhar a versão do pacote com a do server?

**Resposta:** Alinhar package.json → 0.1.0 (server é a fonte de verdade)

### DT7 — Sem Dockerfile próprio
**Contexto:** não há Dockerfile para empacotar o servidor MCP.
**Pergunta:** Criar Dockerfile/container da tool?

**Resposta:** Não criar Dockerfile agora; documentar como limitação

### DOC-01 — Documentação desatualizada (AGENTS.md / README)
**Contexto:** AGENTS.md lista apenas 3 prompts (container_troubleshoot, image_cleanup, volume_removal) e não documenta os 4 prompts Compose; também descreve `create_container` como "Cria e inicia" (consistente com o código, mas não com a descrição da tool).
**Pergunta:** Atualizar AGENTS.md/README para refletir os 7 prompts e os contratos reais?

**Resposta:** Atualizar AGENTS.md/README com os 7 prompts e contratos reais (na fase de implementação)

---

> **Status:** ✅ Todas respondidas e integradas. Decisões registradas nas seções "Decisões da revisão" de cada unit e em `gaps.md`.
