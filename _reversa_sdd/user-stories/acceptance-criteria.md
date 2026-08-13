# Critérios de Aceitação por User Story

> Geração: Writer (reversa-autonomous), `2026-08-13`.

## US-01 — Gestão de containers
- GIVEN containers running com dependências Compose WHEN stop_containers com stopDependents THEN dependentes param antes dos primários e são marcados `dependent:true`.
- GIVEN containers parados com dependências WHEN start_containers com startDependencies THEN dependências iniciam antes e são marcadas `dependency:true`.
- GIVEN delete sem confirmed WHEN delete_container THEN preview é retornado e nada é removido.
- GIVEN create_container com imagem WHEN a criação termina THEN container está running, portas/volumes/networks corretos.

## US-02 — Diagnóstico de aplicações
- GIVEN container running e ID prefixo WHEN exec_command THEN exitCode, success e output são retornados; `silent` omite output.
- GIVEN container parado WHEN exec_command THEN erro "Container is not running".
- GIVEN nome passado como id WHEN exec_command ou container_logs THEN erro (nomes não são resolvidos).
- GIVEN container_logs com tail THEN retorna as N linhas finais (stdout+stderr), vazias filtradas.
- GIVEN daemon saudável WHEN docker_status THEN status/version/system/containers/images/disk_usage/plugins/swarm/warnings são retornados (§2.16).
- GIVEN daemon fora do ar WHEN docker_status THEN {status:"unavailable", error} com isError.

## US-03 — Gestão de imagens
- GIVEN pull_image({image:"nginx:latest"}) WHEN o pull conclui THEN {pulled, image, id, tags, size_bytes} são retornados.
- GIVEN delete_image sem confirmed THEN preview (tags/size_mb/created/force) é retornado e nada é removido.
- GIVEN id de imagem inexistente THEN erro "No image found matching".
- GIVEN prune_images sem confirmed THEN preview com count e total_size_mb sem remover.
- GIVEN list_images com dangling THEN apenas dangling são retornados.

## US-04 — Persistência com volumes
- GIVEN create_volume({containerId, driver:"nfs", nfsServer, nfsShare, nfsVersion}) THEN volume criado com DriverOpts {addr, device, vers}, labels mcp.* e container associado; mountOptions retornados.
- GIVEN create_volume({containerId, driver:"local", mountpoint}) THEN DriverOpts {device, type:"none", o:"bind"}.
- GIVEN volume montado em container WHEN delete_volume confirmed THEN erro bloqueante listando os containers (sem force disponível).
- GIVEN delete_volume sem confirmed THEN preview com usingContainers e warning é retornado e nada é removido.

## US-05 — Orientação operacional
- GIVEN o cliente MCP lista prompts THEN os 7 prompts estão disponíveis (container_troubleshoot, image_cleanup, volume_removal, compose_start, compose_stop, compose_restart, compose_service).
- GIVEN volume de alto risco (banco/estado/secrets) WHEN volume_removal THEN fluxo exige duas confirmações.
- GIVEN prompts em uso THEN conteúdo está em inglês e não executa tools por conta própria.
