# Onboarding: Corrigir gaps do sync inicial

> Identificador: `001-corrigir-gaps-sync-inicial`
> Data: `2026-08-12`

## 1. Pré-requisitos

- Node.js 20+ com `npm install` concluído
- Docker rodando localmente com socket em `/var/run/docker.sock`

## 2. Testar o código antes das correções (linha de base)

```bash
npm test
```

Registre quantos testes falham ou passam — isso é a linha de base da regressão. Esperado: **verde**, pois o legado é a fonte da extração.

## 3. Aplicar as correções e testar por bloco

### Bloco A — ferramentas-containers (DT2, DT4, DT-CC-01, DT6)

1. `stop.tool.ts`: handler `dryRun ?? true` → `dryRun ?? false`.
2. `create-container.tool.ts`: checar imagem local antes do pull; descrição → "Create a Docker container and start it".
3. Extrair resolutor BFS para `src/docker/shared/dependency-resolver.ts` e consumir em stop/start.

```bash
npm test tests/docker/tools/stop tests/docker/tools/start tests/docker/tools/create-container
```

### Bloco B — operacoes-container (DT5)

1. Criar parser de comando com aspas em `src/docker/shared/`.
2. Usar no `exec-command.tool.ts`.

```bash
npm test tests/docker/tools/exec-command
```

### Bloco C — ferramentas-imagens (DT-IMG-01)

1. `delete-image.tool.ts`: `#findImage` com lista de matches e guarda de ambiguidade.

```bash
npm test tests/docker/tools/delete-image
```

### Bloco D — ferramentas-daemon (DT-ST)

1. `docker-status.tool.ts`: erro em texto `Error docker_status: <msg>`.

```bash
npm test tests/docker/tools/docker-status
```

### Bloco E — core (DT1)

1. `package.json`: version → `0.1.0`.

### Bloco F — documentação (DOC-01/G-08/DT7)

1. AGENTS.md: seção "Prompts Disponíveis" com os 7 prompts; nota do `ToolContainer`; limitação Dockerfile.
2. README.md: seção "Available Prompts" com os 7 prompts; nota da limitação.

## 4. Verificação final

```bash
npm test          # suíte completa
npm run lint      # lint sem warnings
npm run typecheck # tipos
npm run test:coverage  # coverage (threshold 95%)
```

## 5. Teste manual (agente + Docker real)

Com o daemon ativo:

1. `npm run dev` e abra o inspector MCP (`npm run inspect`).
2. Liste as tools e confira a descrição de `create_container` = "Create a Docker container and start it".
3. Liste os prompts e confira os 7.
4. `stop_containers` sem `dryRun` sobre um container descartável → deve **parar de fato** (não preview).
5. `docker_status` com daemon parado → deve retornar `Error docker_status: ...` com `isError:true`.
6. `exec_command({id, command:"sh -c 'echo \"a b\"'"})` em um container com shell → saída `a b`.
7. `delete_image` com um prefixo de 2 imagens → erro orientando ID completo.

## 6. Saídas esperadas

| Item | Caminho |
|------|---------|
| requirements.md | `_reversa_forward/001-corrigir-gaps-sync-inicial/requirements.md` |
| roadmap.md | `_reversa_forward/001-corrigir-gaps-sync-inicial/roadmap.md` |
| actions.md (após `/reversa-to-do`) | `_reversa_forward/001-corrigir-gaps-sync-inicial/actions.md` |
