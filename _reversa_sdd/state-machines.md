# Máquinas de Estado — dockerpilot-mcp

> Gerado pelo Detective em 2026-08-13. 🟢 CONFIRMADO (estados nativos do Docker; gatilhos lidos do código).

## 1. Estado de Container (entidade central)

```mermaid
stateDiagram-v2
    [*] --> created : create_container
    created --> running : start / start_containers
    created --> exited : delete?(não, remove direto)
    paused --> running : start / start_containers
    exited --> running : start / start_containers
    running --> paused : docker pause (externo)
    paused --> running : docker unpause (externo)
    running --> exited : stop / kill (force)
    running --> restarting : restart / restart_container
    restarting --> running : daemon reinicia processo
    exited --> exited : (estável)
    running --> dead : falha do daemon/erro fatal
    running --> removing : remove (force)
    created --> removed : delete_container
    exited --> removed : delete_container
    paused --> removed : delete_container (force)
    running --> removed : delete_container (force)
    removing --> removed
    dead --> removed : delete_container (force)
    dead --> removed : docker rm (externo)
```

### Valores possíveis (enum `VALID_STATES`)
`created`, `restarting`, `running`, `removing`, `paused`, `exited`, `dead`

### Transições acionadas pelas tools deste sistema
| De | Para | Gatilho | Condição |
|----|------|---------|----------|
| `exited` / `created` / `paused` | `running` | `start_containers` | candidato = estado ∈ {exited, created, paused} |
| `running` | `exited` | `stop_containers` | `stop({t: timeout})` ou `kill()` se `force` |
| `running` | `running` | `restart_container` | restart preserva estado final |
| qualquer | `removed` | `delete_container` | exige `confirmed=true`; `force` p/ running |
| `running` | `exited` | `stop_containers` com dependentes | dependentes param antes dos primários |

### Regras de transição
- 🟢 `start_containers` filtra por `status: ["exited","created","paused"]` — um container `restarting` **não** é candidato a start.
- 🟢 `exec_command` só opera em `running`.
- 🟢 `stop_containers` opera sobre `running` (list `all:false`).
- 🟢 Restart aceita qualquer estado (list `all:true`).

## 2. Estado de Healthcheck (do container)

```mermaid
stateDiagram-v2
    [*] --> starting : container inicia com healthcheck
    starting --> healthy : verificação ok
    starting --> unhealthy : falhas >= retries
    healthy --> unhealthy : falhas consecutivas
    unhealthy --> healthy : verificação ok
    starting --> none : sem healthcheck configurado (externo)
```

- 🟢 Expo sto pelo resolver `healthcheck` (inspect): `status`, `failing_streak`, `last_log`.
- 🟢 `last_log` = último item do array `Log` (usado pelo `container_troubleshoot`).

## 3. Workflow de operações destrutivas (gate de confirmação)

Estado do **agente/usuário**, não do container:

```mermaid
stateDiagram-v2
    [*] --> solicitacao : usuário pede operação
    solicitacao --> preview : chamada com confirmed=false (ou omitido)
    preview --> decisao : agente mostra preview e pergunta
    decisao --> negado : usuário recusa
    decisao --> confirmado : usuário confirma
    confirmado --> executado : chamada com confirmed=true
    negado --> [*]
    executado --> [*]
    executado --> erro : exceção do daemon
    erro --> [*]
```

- 🟢 Aplicável a: `delete_container`, `delete_image`, `delete_volume`, `prune_images`.
- 🟢 `delete_volume` tem estado adicional de **bloqueio**: se em uso → erro antes de executar.

## 4. Estado do daemon (docker_status)

```mermaid
stateDiagram-v2
    [*] --> running : checkConnection + info/version/df ok
    [*] --> unavailable : ping/info falha
    unavailable --> running : próxima chamada bem-sucedida
```

- 🟢 Retorno: `{status:"running", ...}` vs `{status:"unavailable", error}` (isError true).
