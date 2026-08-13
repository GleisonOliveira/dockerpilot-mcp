# Permissões — dockerpilot-mcp

> Gerado pelo Detective em 2026-08-13. 🟢 CONFIRMADO.

## 1. Modelo de acesso

**Não há RBAC, autenticação nem multiusuário.** O servidor MCP é executado localmente e fala com o daemon Docker via socket local (`/var/run/docker.sock` ou pipe do Windows).

O controle de acesso é composto por três camadas:

1. **Soberania do socket** — só quem tem acesso ao socket do Docker (permissões do host / grupo `docker`) consegue operar.
2. **Gate de confirmação** — operações destrutivas exigem `confirmed=true`; sem ela, o agente só recebe preview.
3. **Preview (dryRun)** — operações de mudança de estado não-destrutivas podem ser pré-visualizadas.

## 2. Matriz de tools × mecanismos de segurança

| Tool | confirmed | dryRun | exclude | Outra proteção |
|------|:---------:|:------:|:-------:|----------------|
| `list_containers` | — | — | — | read-only |
| `list_images` | — | — | — | read-only |
| `list_volumes` | — | — | — | read-only |
| `docker_status` | — | — | — | read-only |
| `container_logs` | — | — | — | read-only; só ID; require running? (não — lê parados ok) |
| `exec_command` | — | — | — | só ID; **exige running** |
| `pull_image` | — | — | — | idempotente (pull) |
| `create_volume` | — | — | — | exige `containerId` (associação rastreada por labels) |
| `create_container` | — | — | — | pull + criação |
| `start_containers` | — | ✅ | ✅ | alvos: exited/created/paused |
| `stop_containers` | — | ✅ (handler `?? true`) | ✅ | alvos: running; timeout/force |
| `restart_container` | — | — | — | nome exato ou prefixo ID |
| `delete_container` | ✅ | — | — | `force`, `removeImage` opcionais |
| `delete_image` | ✅ | — | — | `force` opcional; 4 formas de match |
| `delete_volume` | ✅ | — | — | **bloqueia volume em uso** |
| `prune_images` | ✅ | — | — | só dangling; `force` opcional |

✅ = mecanismo presente e obrigatório para a operação destrutiva.

## 3. Regras de permissão derivadas

- **P1** 🟢 — Operações destrutivas (delete/prune) nunca executam com `confirmed` ausente ou falso; retornam preview com instrução ao agente.
- **P2** 🟢 — `stop_containers`/`start_containers` aceitam `exclude` para proteção de nomes/IDs.
- **P3** 🟢 — `exec_command` restringe o alvo a container em execução e por ID (sem nomes), reduzindo superfície de execução arbitrária.
- **P4** 🟢 — `delete_volume` não expõe "forçar": volume em uso é barrado com erro orientador.
- **P5** 🟢 — Associação `create_volume` → container via labels cria rastreabilidade, mas **não** é um bind real; o mount exige recriação do container.
- **P6** 🟡 — O gate de confirmação depende do agente respeitar o texto do preview ("Ask the user to confirm"); não há verificação técnica de autorização humana além do próprio `confirmed`.

## 4. Limitações / lacunas

- 🔴 **L-P1** — Sem granularidade por recurso/usuário: qualquer agente com acesso ao socket pode chamar qualquer tool (limitado apenas pelos gates).
- 🟡 **L-P2** — `dryRun` divergente no stop (default efetivo `true`) amplia proteção, mas o schema documenta `false` — comportamento pode confundir integrações.
