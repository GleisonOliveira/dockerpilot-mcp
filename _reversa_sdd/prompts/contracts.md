# Módulo Prompts, Contratos

## container_troubleshoot
Args: `container_name?` (string), `symptom?` (string).
Orientação: diagnóstico — inspecionar state/status, logs, healthcheck, recursos; corrigir (restart, rebuild, rede); verificar.

## image_cleanup
Args: nenhum.
Orientação: liberar espaço — verificar daemon, analisar imagens dangling, remover com confirmação, verificar espaço liberado.

## volume_removal
Args: nenhum.
Orientação: workflow seguro — listar containers que usam o volume, avaliação de risco (databases/app state/secrets), dupla confirmação para alto risco, aviso de perda de dados, parar containers, deletar, reiniciar.

## compose_start
Args: `project_dir?` (string).
Orientação: subir o projeto Compose inteiro em modo detached (`docker compose up -d`).

## compose_stop
Args: `project_dir?` (string).
Orientação: parar/derrubar o projeto Compose inteiro (`docker compose down`).

## compose_restart
Args: `project_dir?` (string).
Orientação: reiniciar todos os serviços do projeto.

## compose_service
Args: `service_name?` (string), `action?` ∈ start|stop|restart.
Orientação: gerenciar um serviço individual (não o projeto) usando list_containers, start_containers, stop_containers, restart_container e container_logs.

## Erro padrão (se aplicável)
`{content:[{type:"text", text:"Error <ctx>: <msg>"}], isError:true}`.
