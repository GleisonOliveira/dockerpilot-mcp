# Domínio — dockerpilot-mcp

> Gerado pelo Detective em 2026-08-13. Doc level: completo.
> Escala: 🟢 CONFIRMADO | 🟡 INFERIDO | 🔴 LACUNA

---

## 1. Glossário

| Termo | Definição |
|-------|-----------|
| **MCP (Model Context Protocol)** | Protocolo que expõe ferramentas e prompts a agentes de IA. Aqui, servidor comunicando via stdio. |
| **Tool** | Função executável registrada no servidor MCP (ex.: `list_containers`). Contrato: schema Zod + handler. |
| **Prompt** | Mensagem orientadora registrada que guia o agente, sem executar código (ex.: `container_troubleshoot`). |
| **DockerClient** | Singleton que encapsula Dockerode e a verificação de conexão com o daemon. |
| **tryCatch** | Wrapper genérico de erro assíncrono; retorna `{success}` discriminado. |
| **dryRun** | Modo preview que lista o que seria alterado sem executar. |
| **confirmed** | Flag obrigatória (`true`) para executar operações destrutivas. |
| **Container** | Instância executável de uma imagem; entidade central com 7 estados. |
| **Image** | Pacote imutável com código/ambiente; pode ser dangling (sem tag e sem referência). |
| **Volume** | Persistência nomeada gerenciada pelo daemon; pode estar em uso por containers. |
| **Dangling image** | Imagem sem `RepoTags` e sem container referenciando-a — candidata a `prune_images`. |
| **Dependente (Compose)** | Container cuja label `com.docker.compose.depends_on` declara dependência de outro service no mesmo project. |
| **Project (Compose)** | Grupo de containers identificado pela label `com.docker.compose.project`. |
| **Frame multiplexado** | Formato de stream do Docker: header de 8 bytes (`[4B stream][4B size BE]`) + payload. |
| **Prefix ID** | Primeiros caracteres do hash do container/imagem (mínimo p/ lookup). |
| **Gate de confirmação** | Fluxo em 2 etapas: preview (`confirmed=false`) → execução (`confirmed=true`). |

## 2. Regras de domínio

### 2.1 Segurança e idempotência
- **R01** 🟢 — Operações destrutivas exigem `confirmed: true` explícito: `delete_container`, `delete_image`, `delete_volume`, `prune_images`. Sem a flag, devolvem preview e não executam.
- **R02** 🟢 — O preview instrui o agente a perguntar ao usuário antes de repetir com `confirmed: true` ("Ask the user to confirm before retrying").
- **R03** 🟢 — `stop_containers`/`start_containers` suportam `dryRun` para pré-visualizar alvos; `exclude` protege containers.
- **R04** 🟢 — `delete_volume` bloqueia remoção de volume em uso (Docker não força remoção de volume ativo).
- **R05** 🟢 — `exec_command` só executa em containers `running`; container parado gera erro explícito ("Start it first").
- **R06** 🟢 — Todas as tools chamam `checkConnection()` (ping no daemon) antes de operar.

### 2.2 Identidade e matching
- **R07** 🟢 — IDs aceitam prefixo (case-insensitive); nomes aceitam substring (case-insensitive) em stop/start/list; `restart_container` exige nome exato ou prefixo de ID.
- **R08** 🟢 — `exec_command` e `container_logs` aceitam **apenas ID** (nomes NÃO são aceitos).
- **R09** 🟢 — Respostas normalizam IDs para 12 chars (exceto `pull_image`, que usa `slice(7,19)`); nomes sem o `/` inicial.
- **R10** 🟢 — `delete_image` aceita short ID, full ID, ID com prefixo `sha256:` ou tag.

### 2.3 Topologia Compose
- **R11** 🟢 — Topologia é derivada de labels (sem ler arquivo compose): `com.docker.compose.project`, `.service`, `.depends_on`, `.project.config_files`, `.project.working_dir`, `.container-number`.
- **R12** 🟢 — `stopDependents`/`startDependencies` resolvem fecho transitivo **apenas dentro do mesmo project** e respeitam `exclude`.
- **R13** 🟢 — Ordem de parada: dependentes mais externos primeiro (resultado revertido). Ordem de início: dependências profundas primeiro.
- **R14** 🟢 — Label `depends_on` é parseada como lista CSV; entradas `"svc:condition"` usam o nome antes do `:`.

### 2.4 Criação e volume
- **R15** 🟢 — `create_container` faz pull da imagem antes de criar (sempre, mesmo se já existir localmente).
- **R16** 🟢 — Portas sem protocolo são normalizadas para `/tcp`; `host` aceita `'8080'` ou `'0.0.0.0:8080'`.
- **R17** 🟢 — Healthcheck converte segundos → nanosegundos (×1e9); `memory_mb` → bytes; `CpuPeriod` default `100000` quando só `cpu_quota` é informado.
- **R18** 🟢 — `create_volume` associa volume ao container **via labels** `mcp.container.id`/`mcp.container.name` (não é um mount); Docker não suporta hot-mount — recriar o container para aplicar.
- **R19** 🟢 — `create_volume` valida opções por driver: local (bind), nfs (`addr`, `device=:share`, `vers`), tmpfs (`size`, `mode`).

### 2.5 Relatório e observabilidade
- **R20** 🟢 — `docker_status` computa `reclaimable_bytes` apenas de imagens sem containers (`Containers === 0`); falha do daemon → `{status: "unavailable"}`.
- **R21** 🟢 — `prune_images` usa `Promise.allSettled` e separa sucesso/falha por imagem.
- **R22** 🟢 — Streams (exec/logs) são parseados por frames multiplexados com fallback para texto cru.

### 2.6 Observações e divergências
- **R23** 🟢 — `stop_containers`: o handler aplica `dryRun ?? true` (linha 157), divergente do schema (`default false`). Efeito: primeira chamada sempre retorna preview. Provável proteção intencional.
- **R24** 🟡 — `compose_service` (prompt) instrui `exec_command` com um argumento `args` inexistente no schema real da tool (contrato do prompt ≠ contrato da tool).
- **R25** 🟡 — Versões divergentes: `package.json` `0.0.1` vs `McpServer` `0.1.0`.
- **R26** 🟢 — Sem autenticação de usuário nem RBAC: o controle de acesso é o socket local do daemon + gates das tools.

## 3. Evidências do histórico git

| Commit | Evidência |
|--------|-----------|
| `dc22486 test(delete): fix empty-id assertions to match guard inside tryCatch` | Decisão: guards de campo obrigatório retornam erro como `outcome.result` **dentro** do `tryCatch`, não como retorno top-level — padronização do fluxo de erro. |
| `c5a1885 feat(prompts): add container_troubleshoot prompt with DI pattern` | Decisão: prompts seguem DI via container próprio (sem client). |
| `ce3b4a0 feat(start,stop): add start_containers tool and improve stop_containers` | Decisão: stop evolui para suportar dependentes; start espelha o padrão. |
| `c9a2456 feat(tools): add delete-container, delete-image, list-volumes and image-cleanup prompt` | Introdução dos gates de confirmação e do prompt de limpeza. |
| `d47da02 feat: add volume tools` | Introdução de create/list/delete volume com associação por labels. |
| `2e2ee4c feat: add compose prompts` | 4 prompts Compose; start/stop/restart via Bash, service via tools MCP. |
| `ab20256 feat(tools): add prune_images tool` | Bulk delete de dangling com allSettled. |
| `b9d8987 test(coverage): expand test suite` / `c44a260 wip: add coverage` | Cobertura (threshold 95%) é requisito do projeto. |
| `ba178df fix: package.json ... to reduce vulnerabilities` + dependabot/snyk PRs | Manutenção contínua de dependências (CI, segurança). |

## 4. Lacunas 🔴

- **L1** — Motivação da divergência `dryRun ?? true` no stop não está documentada em ADR nem comentário.
- **L2** — Contrato do prompt `compose_service` não bate com o schema de `exec_command` (R24).
- **L3** — Não há ADRs formais no repositório; decisões estão implícitas nos commits. (Reconstruídas retroativamente — ver `adrs/`.)
