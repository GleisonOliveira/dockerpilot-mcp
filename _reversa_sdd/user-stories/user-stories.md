# User Stories — DockerPilot MCP

> Geração: Writer (reversa-autonomous), `2026-08-13`.
> Personas derivadas de `_reversa_sdd/personas.md`.

## US-01 — Gestão de containers
**Como** um agente de IA gerenciando uma stack Docker,
**quero** listar, parar, iniciar, reiniciar e remover containers com ordem correta de dependências,
**para** executar manutenção sem quebrar a topologia da aplicação.
Critérios de aceite em `user-stories/acceptance-criteria.md` (US-01). Referência: `ferramentas-containers`.

## US-02 — Diagnóstico de aplicações
**Como** um desenvolvedor diagnosticando um serviço com problema,
**quero** inspecionar status, executar comandos e ler logs de um container por ID,
**para** encontrar a causa raiz sem acessar shell direto.
Critérios: US-02. Referência: `operacoes-container`, `ferramentas-daemon`.

## US-03 — Gestão de imagens
**Como** um operador de CI/CD,
**quero** puxar, listar e remover imagens com confirmação e preview,
**para** manter o registro local enxuto sem perda acidental.
Critérios: US-03. Referência: `ferramentas-imagens`.

## US-04 — Persistência com volumes
**Como** um desenvolvedor cuidando de dados da aplicação,
**quero** criar e remover volumes com detecção de uso e dupla confirmação quando necessário,
**para** persistir dados com segurança e evitar exclusão de estado.
Critérios: US-04. Referência: `ferramentas-volumes`, `prompts` (volume_removal).

## US-05 — Orientação operacional
**Como** um usuário iniciante do MCP server,
**quero** contar com prompts orientadores para troubleshooting e limpeza,
**para** executar procedimentos complexos seguindo boas práticas.
Critérios: US-05. Referência: `prompts`.
