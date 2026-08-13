# Cenários Gherkin por Unit

> Geração: Writer (reversa-autonomous), `2026-08-13`. Cenários consolidados dos requirements de cada unit.

## core
- GIVEN stdio conectado WHEN index.ts inicializa THEN McpServer registra 16 tools e 7 prompts e escuta no transporte.
- GIVEN uma tool configurada WHEN server inicia THEN a tool é registrada no servidor MCP (tools são globais, sem namespace).

## injecao-de-dependencia
- GIVEN toolClasses válidas WHEN ToolContainer resolve THEN todas instanciam com DockerClient injetado.
- GIVEN uma classe inválida WHEN ToolContainer resolve THEN a instanciação lança sem tratamento (sem try/catch no container).

## utilitarios
- GIVEN uma promise que rejeita WHEN tryCatch resolve THEN retorna {success:false, error} sem lançar.
- GIVEN uma promise que resolve WHEN tryCatch resolve THEN retorna {success:true, result}.

## cliente-docker
- GIVEN socket em /var/run/docker.sock WHEN client é carregado THEN expõe dockerode singleton.
- GIVEN socket ausente WHEN client é carregado THEN falha com mensagem clara de permissão/daemon.

## compartilhados-docker
- GIVEN list_containers com includeStateDetails WHEN container processado THEN item inclui state_details do inspect.
- GIVEN container não running WHEN includeUsage pedido THEN usage retorna null.

## ferramentas-containers (ver também acceptance-criteria US-01)
- GIVEN project Compose A←B WHEN stop com stopDependents THEN B para antes de A e marcado dependent.
- GIVEN delete sem confirmed THEN preview; GIVEN create nginx ports 8080→80 THEN expõe "80/tcp".

## operacoes-container (US-02)
- GIVEN running + prefixo id WHEN exec THEN exitCode/output; parado → erro; nome → erro.
- GIVEN logs com tail THEN N linhas finais, vazias filtradas.

## ferramentas-imagens (US-03)
- pull nginx:latest → {pulled, image, id, tags, size_bytes}; delete sem confirmed → preview (tags/size_mb/created); prune sem confirmed → preview (count/total_size_mb); prune sem dangling → {deleted:false, message}.
- delete_image com prefixo ambíguo → deleta o primeiro match (sem guarda de ambiguidade).

## ferramentas-volumes (US-04)
- create_volume exige containerId (associa via labels mcp.*); nfs → DriverOpts {addr, device, vers}; delete em uso → erro bloqueante; delete sem confirmed → preview com usingContainers.

## ferramentas-daemon (US-02)
- daemon saudável → relatório completo (§2.16); fora do ar → {status:"unavailable", error} com isError; swarm inativo → {active:false, state:"inactive"} sem erro.
- Falha em info/version/df derruba a tool inteira (Promise.all estrito, sem fallback por bloco).

## prompts (US-05)
- 7 prompts disponíveis: container_troubleshoot, image_cleanup, volume_removal, compose_start, compose_stop, compose_restart, compose_service; volume de alto risco → dupla confirmação; conteúdo em inglês sem execução.
