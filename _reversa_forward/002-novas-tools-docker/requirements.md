# Requirements: Adicionar novas tools Docker de diagnóstico, redes, build e operação

> Identificador: `002-novas-tools-docker`
> Data: `2026-08-14`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Expande o servidor MCP dockerpilot de 16 para 38 tools, cobrindo lacunas hoje abertas: diagnóstico em tempo real (`container_stats`, `container_processes`), inspeção profunda (`inspect_container`, `inspect_image`), gestão de redes (`list_networks`, `inspect_network`, `create_network`, `delete_network`, `connect_network`, `disconnect_network`), transferência de arquivos (`copy_to_container`, `copy_from_container`), build e publish de imagens (`build_image`, `push_image`, `tag_image`) e operações complementares de ciclo de vida (`pause_container`, `unpause_container`, `rename_container`, `kill_container`) e limpeza (`prune_containers`, `prune_volumes`, `prune_networks`). Todas seguem os padrões já estabelecidos do legado: `BaseTool`, `tryCatch`, `checkConnection()`, gates de confirmação para operações destrutivas e formato de erro `Error <nome>: <msg>` com `isError: true`.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#6 Módulos (11)` | tools-containers, tools-container-ops, tools-images, tools-volumes, tools-daemon — padrão BaseTool/tryCatch | 🟢 |
| `_reversa_sdd/domain.md#2.1 Segurança e idempotência` | R01 (confirmed), R03 (dryRun), R06 (checkConnection) | 🟢 |
| `_reversa_sdd/domain.md#2.2 Identidade e matching` | R07 (prefixo de ID, substring de nome), R08 (apenas ID em exec/logs), R09 (IDs 12 chars) | 🟢 |
| `_reversa_sdd/code-analysis.md#2.5 docker-shared` | `ContainerFieldResolvers.usage` já usa `stats({stream:false})` — base de `container_stats` | 🟢 |
| `_reversa_sdd/code-analysis.md#2.8 tools-images` | `prune_images` com `Promise.allSettled` e separação sucesso/falha — padrão reutilizável para prunes novos | 🟢 |
| `_reversa_sdd/code-analysis.md#3 Algoritmos` | Cálculo de CPU%/memória (stats), remoção em lote tolerante a falha (allSettled) | 🟢 |
| `_reversa_sdd/architecture.md#5 Integrações externas` | Dockerode expõe métodos para redes, build, push, copy (superfície da API Docker) | 🟡 |
| `_reversa_sdd/addenda/001-corrigir-gaps-sync-inicial.md` | DT5 parser compartilhado; DT-ST erro padronizado; gates de confirmação vigentes | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Agente de IA | diagnosticar containers sem shell | chamar `container_stats` para CPU/memória ao investigar lentidão, `container_processes` para listar processos |
| Desenvolvedor/DevOps | inspecionar estado e configs | `inspect_container`/`inspect_image` para ver env, mounts, healthcheck, layers |
| Desenvolvedor/DevOps | gerenciar redes | `list_networks`, `create_network`, `connect_network`/`disconnect_network`, `delete_network` |
| Desenvolvedor/DevOps | build e publish | `build_image` a partir de Dockerfile, `push_image` para registry, `tag_image` para versionar |
| Desenvolvedor/DevOps | transferir arquivos | `copy_to_container`/`copy_from_container` (equivalente a `docker cp`) |
| Mantenedor/DevOps | limpeza de disco | `prune_containers`/`prune_volumes`/`prune_networks` para remover recursos órfãos |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** todas as novas operações destrutivas (`delete_network`, `prune_containers`, `prune_volumes`, `prune_networks`, `kill_container` com sinal destrutivo) exigem `confirmed: true` explícito; sem a flag devolvem preview e não executam. 🟢
   - Origem no legado: `_reversa_sdd/domain.md#R01` (gate `confirmed` para operações destrutivas)
   - Tipo: estendida
2. **RN-02:** operações de alvo único por ID (`container_stats`, `container_processes`, `inspect_container`, `inspect_image`, `pause_container`, `unpause_container`, `rename_container`, `kill_container`) aceitam prefixo de ID (case-insensitive), seguindo R07/R08. Nomes **não** são aceitos nessas tools. 🟡
   - Origem no legado: `_reversa_sdd/domain.md#R08` (apenas ID em exec/logs)
   - Tipo: nova (estende o contrato de ID-only para novas tools de alvo único)
3. **RN-03:** redes são identificadas por **nome exato ou ID** (`list_networks` filtra por nome substring; `inspect_network`/`delete_network`/`connect_network`/`disconnect_network` aceitam nome ou ID). 🟡
   - Origem no legado: `_reversa_sdd/domain.md#R07` (nomes com substring em list) e modelo de matching do restart
   - Tipo: nova
4. **RN-04:** `build_image` aceita contexto como **tar.gz em base64 ou caminho local de diretório** com Dockerfile; gera o contexto tar via `tar` stream para a API do Docker. 🟡
   - Origem no legado: `_reversa_sdd/architecture.md#5 Integrações externas` (Docker Engine API via dockerode)
   - Tipo: nova
5. **RN-05:** `copy_to_container`/`copy_from_container` operam conteúdo **como texto UTF-8 ou base64** (flag `binary`), via API de archive do Docker (`putArchive`/`getArchive`). 🟡
   - Origem no legado: `_reversa_sdd/architecture.md#5` (dockerode API surface)
   - Tipo: nova
6. **RN-06:** `prune_containers`/`prune_volumes`/`prune_networks` seguem o mesmo padrão de relatório de `prune_images` (`Promise.allSettled` onde aplicável; contagem e espaço liberado). `prune_containers` aceita filtro `dangling` implícito (containers parados). 🟡
   - Origem no legado: `_reversa_sdd/code-analysis.md#2.8 tools-images` (padrão prune_images)
   - Tipo: nova
7. **RN-07:** `push_image` e `tag_image` operam sobre imagem por ID ou nome/tag; `push_image` retorna progresso resumido do registry e aceita `registry` e credenciais opcionais (authconfig). 🟡
   - Origem no legado: `_reversa_sdd/architecture.md#5` (modem.followProgress usado no pull)
   - Tipo: nova

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | `container_stats` retorna uso de CPU%, memória e I/O de rede de um container (por ID/prefixo) | Must | Chamada com prefixo de ID de container running → CPU%, memória (excl. cache) e bytes RX/TX | 🟢 |
| RF-02 | `container_processes` lista os processos dentro de um container (por ID/prefixo) | Should | Chamada com ID de container running → lista de processos (PID, nome, command) | 🟡 |
| RF-03 | `inspect_container` retorna o JSON completo de configuração/estado do container | Must | Chamada com ID/prefixo → inspeção completa (Config, State, Mounts, Networks) | 🟢 |
| RF-04 | `inspect_image` retorna o JSON completo de configuração da imagem | Must | Chamada com ID/prefixo ou nome/tag → inspeção completa (Config, Layers, Size) | 🟢 |
| RF-05 | `list_networks` lista redes Docker com filtros por nome (substring) e driver | Must | Chamada sem filtro → todas as redes com id/nome/driver/scope/containers | 🟢 |
| RF-06 | `inspect_network` retorna detalhes de uma rede por nome ou ID | Must | Chamada com nome de rede existente → IPAM (configuração de endereçamento IP), containers conectados, driver | 🟡 |
| RF-07 | `create_network` cria rede com nome, driver e opções (subnet/gateway via ipam) | Must | Chamada com nome+dados → rede criada com id/name | 🟡 |
| RF-08 | `delete_network` remove rede por nome/ID com gate `confirmed` | Must | `confirmed:true` + rede órfã → rede removida; `confirmed:false` → preview | 🟡 |
| RF-09 | `connect_network` conecta um container a uma rede | Must | Chamada com container ID + rede → container conectado à rede | 🟡 |
| RF-10 | `disconnect_network` desconecta um container de uma rede (com `force` opcional) | Must | Chamada com container + rede → container desconectado; `force:true` força se container running | 🟡 |
| RF-11 | `copy_to_container` copia arquivo/conteúdo do host para dentro do container | Must | Chamada com ID, caminho origem (host) ou conteúdo + destino → arquivo presente no container | 🟡 |
| RF-12 | `copy_from_container` copia arquivo/pasta de dentro do container para o host | Must | Chamada com ID + caminho origem → conteúdo retornado (texto ou base64) e/ou gravado no host | 🟡 |
| RF-13 | `build_image` builda imagem a partir de Dockerfile (contexto tar.gz base64 ou caminho local) | Must | Chamada com contexto + tag → imagem buildada; erro claro se Dockerfile ausente | 🟡 |
| RF-14 | `tag_image` aplica uma tag `repo:tag` a uma imagem existente | Should | Chamada com imagem + repo/tag → nova referência na imagem | 🟡 |
| RF-15 | `push_image` envia imagem a um registry com authconfig opcional | Should | Chamada com imagem+registry → push concluído com progresso resumido | 🟡 |
| RF-16 | `pause_container` pausa os processos de um container em execução | Should | Chamada com ID de container running → estado `paused` | 🟡 |
| RF-17 | `unpause_container` retoma um container pausado | Should | Chamada com ID de container paused → estado `running` | 🟡 |
| RF-18 | `rename_container` renomeia um container | Should | Chamada com ID + novo nome → container renomeado | 🟡 |
| RF-19 | `kill_container` força a parada de um container por sinal (default SIGKILL) com gate `confirmed` | Should | `confirmed:true` → processo encerrado via sinal; `confirmed:false` → preview | 🟡 |
| RF-20 | `prune_containers` remove containers parados com gate `confirmed` | Should | `confirmed:true` → containers parados removidos com relatório; `false` → preview | 🟡 |
| RF-21 | `prune_volumes` remove volumes não utilizados com gate `confirmed` | Should | `confirmed:true` → volumes órfãos removidos com espaço liberado; `false` → preview | 🟡 |
| RF-22 | `prune_networks` remove redes não utilizadas com gate `confirmed` | Should | `confirmed:true` → redes órfãs removidas; `false` → preview | 🟡 |
| RF-23 | Todas as novas tools registram no `server.registerTool` com schema Zod e handler privado `#handle` via `tryCatch` | Must | Tool presente em `listTools`; erro no formato `Error <nome>: <msg>` com `isError:true` | 🟢 |
| RF-24 | Todas as novas tools adicionadas em `src/tools.config.ts` com testes correspondentes em `tests/docker/tools/<nome>/` | Must | `npm test` verde e cobertura ≥95% mantida | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Segurança | Operações destrutivas novas exigem `confirmed: true` | `_reversa_sdd/domain.md#R01` | 🟢 |
| Segurança | Ferramentas de alvo único por ID não aceitam nomes (evita ambiguidade) | `_reversa_sdd/domain.md#R08` | 🟡 |
| Segurança | `kill_container` e `delete_network` nunca operam por prefixo ambíguo sem match único | Padrão delete-image (guarda de ambiguidade) `_reversa_sdd/ferramentas-imagens/requirements.md#RN-02` | 🟡 |
| Confiabilidade | Todas as tools chamam `checkConnection()` antes de operar | `_reversa_sdd/domain.md#R06` | 🟢 |
| Consistência | Formato de erro uniforme `Error <ctx>: <msg>` + `isError:true` | DT-ST (addenda 001) | 🟢 |
| Consistência | IDs truncados para 12 chars nas respostas | `_reversa_sdd/domain.md#R09` | 🟢 |
| Manutenibilidade | Código compartilhado (parser de frames, cálculo de stats) reutilizado, não duplicado | `_reversa_sdd/code-analysis.md#3 Algoritmos` | 🟢 |
| Desempenho | `container_stats` é one-shot (`stream:false`), sem conexão persistente | `_reversa_sdd/code-analysis.md#2.5` (resolver usage) | 🟢 |
| Testabilidade | Testes mocam o `DockerClient`/dockerode; nunca dependem de Docker real | `_reversa_sdd/inventory.md#Cobertura de testes` | 🟢 |
| Robustez | Build e push podem ser demorados: reportam progresso/erro ao agente e não dependem de timeout implícito do transporte MCP | `_reversa_sdd/code-analysis.md#2.8` (followProgress no pull) | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: container_stats de container running
  Dado um container running identificado por prefixo de ID
  Quando container_stats é chamado com esse ID
  Então retorna cpuPercent, memória (excl. cache) e bytes de rede RX/TX

Cenário: container_stats com container parado
  Dado um container parado
  Quando container_stats é chamado
  Então retorna erro claro ou stats nulos, sem crash

Cenário: inspect_container por prefixo de ID
  Dado um container existente
  Quando inspect_container é chamado com prefixo de ID
  Então retorna o JSON completo de configuração/estado

Cenário: list_networks sem filtro
  Dado um daemon com redes existentes
  Quando list_networks é chamado
  Então retorna as redes com id, nome, driver, scope e containers conectados

Cenário: delete_network sem confirmação
  Dado uma rede órfã
  Quando delete_network é chamado com confirmed:false
  Então retorna preview e a rede não é removida

Cenário: delete_network confirmado
  Dado uma rede órfã
  Quando delete_network é chamado com confirmed:true
  Então a rede é removida

Cenário: copy_to_container grava arquivo
  Dado um container running e um conteúdo de origem
  Quando copy_to_container é chamado com destino /tmp/arquivo.txt
  Então o arquivo existe dentro do container com o conteúdo enviado

Cenário: copy_from_container lê arquivo
  Dado um container com arquivo /app/dados.txt
  Quando copy_from_container é chamado
  Então retorna o conteúdo do arquivo (texto ou base64)

Cenário: build_image com contexto válido
  Dado um contexto de build com Dockerfile válido
  Quando build_image é chamado com uma tag
  Então a imagem é buildada e retorna id/tag

Cenário: build_image sem Dockerfile
  Dado um contexto sem Dockerfile
  Quando build_image é chamado
  Então retorna erro orientando sobre o Dockerfile ausente

Cenário: container_processes de container running
  Dado um container running identificado por ID
  Quando container_processes é chamado
  Então retorna a lista de processos com PID, nome e command

Cenário: inspect_image por ID ou tag
  Dado uma imagem existente
  Quando inspect_image é chamado com ID/prefixo ou nome:tag
  Então retorna o JSON completo de configuração (Config, Layers, Size)

Cenário: inspect_network por nome
  Dado uma rede existente
  Quando inspect_network é chamado com o nome da rede
  Então retorna driver, IPAM (configuração de endereçamento IP) e containers conectados

Cenário: criar e conectar rede
  Dado um container e uma rede existentes
  Quando create_network e connect_network são chamados
  Então a rede é criada e o container aparece como conectado a ela

Cenário: desconectar container de rede
  Dado um container conectado a uma rede
  Quando disconnect_network é chamado
  Então o container é removido da rede (ou força com force:true)

Cenário: tag e push de imagem
  Dado uma imagem local e um registry acessível
  Quando tag_image e push_image são chamados
  Então a imagem ganha a nova tag e é enviada ao registry

Cenário: pause, unpause, rename e kill
  Dado containers em estados distintos
  Quando pause_container, unpause_container, rename_container e kill_container são chamados com confirmed onde aplicável
  Então cada operação produz o efeito esperado (paused, running, nome novo, sinal enviado)

Cenário: prune_volumes e prune_networks confirmados
  Dado volumes e redes órfãos
  Quando prune_volumes e prune_networks são chamados com confirmed:true
  Então os recursos órfãos são removidos com relatório de espaço/contagem

Cenário: prune_containers sem confirmação
  Dado containers parados
  Quando prune_containers é chamado com confirmed:false
  Então retorna preview com contagem e não remove

Cenário: prune_containers confirmado
  Dado containers parados
  Quando prune_containers é chamado com confirmed:true
  Então os containers parados são removidos e o relatório retorna contagem/espaço

Cenário: nova tool registrada no servidor
  Dado o servidor MCP iniciado com as novas tools em tools.config.ts
  Quando se lista as tools disponíveis
  Então as 22 novas tools estão registradas com schema Zod

Cenário: erro padronizado
  Dado um daemon inacessível
  Quando qualquer nova tool é chamada
  Então retorna "Error <nome>: <msg>" com isError:true

Cenário: suíte de testes verde
  Dado as 22 novas tools implementadas
  Quando se roda npm test
  Então toda a suíte passa mantendo cobertura ≥95%
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01, RF-03, RF-04, RF-05, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13 | Must | Fecham as lacunas de maior valor: diagnóstico, inspeção, redes e copy |
| RF-06, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22 | Should | Completam ciclo de vida e limpeza; desejáveis no mesmo ciclo |
| RF-02 | Should | `container_processes` é útil, porém de menor recorrência |
| RF-23, RF-24 | Must | Contratos e testes são condição obrigatória de conclusão (TEST-MANDATORY) |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda. Rode `/reversa-clarify` quando houver `[DÚVIDA]` pendente.

## 10. Lacunas

- 🔴 [DÚVIDA] `build_image`: formato preferido de contexto — tar.gz em base64, caminho local de diretório, ou ambos? (impacta schema e UX)
- 🔴 [DÚVIDA] `copy_to_container`/`copy_from_container`: suporte a binários via base64 (flag `binary`) é desejado nesta feature ou apenas texto UTF-8 por enquanto?
- 🔴 [DÚVIDA] `push_image`: credenciais de registry — aceitar authconfig (username/password/serveraddress) como parâmetro da tool ou depender de `docker login` do host?

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-14 | Versão inicial gerada por `/reversa-requirements` | reversa |
