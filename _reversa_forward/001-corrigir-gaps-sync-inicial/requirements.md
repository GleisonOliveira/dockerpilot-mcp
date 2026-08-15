# Requirements: Corrigir gaps do sync inicial (aplicar decisões da revisão)

> Identificador: `001-corrigir-gaps-sync-inicial`
> Data: `2026-08-12`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Corrige os gaps G-01 a G-10 detectados na revisão da extração reversa, aplicando no código e na documentação as decisões já registradas pelo usuário (DT1-DT7, DT-IMG-01, DT-CC-01, DT-ST, DOC-01). O objetivo é alinhar o comportamento real das tools MCP e a documentação do projeto aos contratos já corrigidos em `_reversa_sdd/`. Nenhum contrato novo é introduzido: tudo o que será implementado já foi decidido na revisão.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/gaps.md#🔴 Críticos` | G-01 (delete_image), G-02 (create_container), G-03 (dryRun stop) | 🟢 |
| `_reversa_sdd/gaps.md#🟡 Médios` | G-04 (create_volume spec), G-05 (DOC-01), G-06 (DT-ST), G-07 (DT3), G-08 (ToolContainer) | 🟢 |
| `_reversa_sdd/gaps.md#🟢 Baixos` | G-09 (DT1 versão), G-10 (DT7 Dockerfile) | 🟢 |
| `_reversa_sdd/questions.md` | DT2/DT4/DT5/DT-IMG-01/DT-CC-01/DT-ST/DT3/DT6/DT1/DT7/DOC-01 — todas respondidas em 2026-08-13 | 🟢 |
| `_reversa_sdd/domain.md#2.6 Observações e divergências` | R23 (dryRun ?? true), R24 (compose_service), R25 (versões) | 🟢 |
| `_reversa_sdd/architecture.md#7 Dívidas técnicas` | DT1..DT7 com evidências no código | 🟢 |
| `_reversa_sdd/ferramentas-containers/requirements.md#4` | RN-05 (DT4), RN-06 (DT2), RN-07 (DT-CC-01) | 🟢 |
| `_reversa_sdd/ferramentas-imagens/requirements.md#4` | RN-02 (guarda de ambiguidade DT-IMG-01) | 🟢 |
| `_reversa_sdd/ferramentas-daemon/requirements.md#4` | RN-03 (erro padronizado DT-ST) | 🟢 |
| `_reversa_sdd/operacoes-container/requirements.md#4` | RN-03 (parser com aspas DT5) | 🟢 |
| `_reversa_sdd/compartilhados-docker/requirements.md#4` | RN-04 (resolutor BFS compartilhado DT6) | 🟢 |
| `_reversa_sdd/prompts/requirements.md#4` | RN-04 (compose_service via tools MCP DT3) | 🟢 |
| `_reversa_sdd/nucleo/requirements.md#4` | RN-03 / DT1 (versão única 0.1.0) | 🟢 |
| `_reversa_sdd/gaps.md#Requisito obrigatório — testes` | TEST-MANDATORY: toda correção DT exige testes atualizados e `npm test` verde | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Agente de IA | operar Docker com contratos estáveis | chamar `stop_containers` e ter execução real por padrão; receber erros no mesmo formato em todas as tools |
| Desenvolvedor/DevOps | usar e configurar o servidor MCP | ler AGENTS.md/README e encontrar os 7 prompts reais e os contratos corretos; versão consistente em package.json e no server |
| Mantenedor | evoluir o projeto com segurança | `npm test` verde a cada correção; lógica BFS única em `docker/shared/` em vez de duplicada |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** `stop_containers` executa por padrão — `dryRun` default real é `false` (executa), alinhado ao schema; preview apenas com `dryRun: true`. 🟢
   - Origem no legado: `_reversa_sdd/domain.md#R23` (comportamento divergente) e `_reversa_sdd/domain.md#R03`
   - Tipo: alterada
2. **RN-02:** `create_container` faz pull da imagem **apenas se ela não existir localmente** (antes puxava incondicionalmente). 🟢
   - Origem no legado: `_reversa_sdd/domain.md#R15`
   - Tipo: alterada
3. **RN-03:** a tool `create_container` cria **e inicia** o container; descrição registrada é "Create a Docker container and start it". 🟢
   - Origem no legado: `_reversa_sdd/domain.md#R15` + descrição contraditória da tool
   - Tipo: alterada (descrição)
4. **RN-04:** `delete_image` com prefixo ambíguo (mais de um match) retorna erro orientando a usar o ID completo; nunca deleta o primeiro match arbitrário. 🟢
   - Origem no legado: `_reversa_sdd/ferramentas-imagens/requirements.md#RN-02`
   - Tipo: nova
5. **RN-05:** `docker_status` em falha do daemon retorna texto `Error docker_status: <msg>` com `isError:true`, igual às demais tools (sem formato JSON `{status:"unavailable"}`). 🟢
   - Origem no legado: `_reversa_sdd/domain.md#R20` (formato divergente) e `_reversa_sdd/ferramentas-daemon/requirements.md#RN-03`
   - Tipo: alterada
6. **RN-06:** `exec_command` divide o comando com parser que **respeita aspas simples/duplas** (antes `split(/\s+/)` quebrava `sh -c 'echo "a b"'`). 🟢
   - Origem no legado: `_reversa_sdd/operacoes-container/requirements.md#RN-03`
   - Tipo: alterada
7. **RN-07:** a resolução de dependências Compose (BFS — *Breadth-First Search* — por labels `mcp.project`/`mcp.service`) passa a ser **única e compartilhada** em `docker/shared/`, consumida por `stop_containers` e `start_containers`. 🟢
   - Origem no legado: `_reversa_sdd/compartilhados-docker/requirements.md#RN-04`
   - Tipo: nova (extração de lógica duplicada)
8. **RN-08:** o prompt `compose_service` continua orientando a operação de serviço individual **via tools MCP** (list_containers, start/stop/restart_container, container_logs) — não gera comandos CLI `docker compose`. 🟢
   - Origem no legado: `_reversa_sdd/domain.md#R24` e `_reversa_sdd/prompts/requirements.md#RN-04`
   - Tipo: confirmada (sem mudança de comportamento; verificar coerência)
9. **RN-09:** versão única do projeto é `0.1.0` em `package.json` e no servidor MCP (server é a fonte de verdade). 🟢
   - Origem no legado: `_reversa_sdd/domain.md#R25`
   - Tipo: alterada
10. **RN-10:** limitação de não haver Dockerfile próprio do servidor MCP fica documentada (deploy via npm/npx). 🟢
    - Origem no legado: `_reversa_sdd/architecture.md#4 Containers`
    - Tipo: nova (documentação)
11. **RN-11:** AGENTS.md e README passam a listar os **7 prompts** reais (container_troubleshoot, image_cleanup, volume_removal, compose_start, compose_stop, compose_restart, compose_service) e os contratos corretos das tools. 🟢
    - Origem no legado: `_reversa_sdd/gaps.md#G-05`
    - Tipo: alterada (documentação)
12. **RN-12:** instanciação do `ToolContainer` sem try/catch é um comportamento aceito e documentado (falha de construção derruba o server de forma explícita). 🟢
    - Origem no legado: `_reversa_sdd/gaps.md#G-08`
    - Tipo: confirmada (documentação)

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | `stop_containers` usa `dryRun ?? false` no handler — default real executa (DT2) | Must | Chamada sem `dryRun` para containers; schema `default false` e handler consistentes | 🟢 |
| RF-02 | `create_container` verifica existência local da imagem antes de puxar; pula pull se existir (DT4) | Must | Imagem local presente → nenhuma chamada de pull; ausente → pull antes do create | 🟢 |
| RF-03 | Descrição da tool `create_container` é "Create a Docker container and start it" (DT-CC-01) | Must | Descrição exposta via MCP coerente com o handler (cria e inicia) | 🟢 |
| RF-04 | `delete_image` retorna erro quando o prefixo casa múltiplas imagens (DT-IMG-01) | Must | Prefixo ambíguo → erro orientando ID completo; único match → deleta; 0 matches → erro "No image found matching" | 🟢 |
| RF-05 | `docker_status` retorna erro no formato `Error docker_status: <msg>` com `isError:true` em falha do daemon (DT-ST) | Must | Falha de info/version/df → texto padronizado, sem JSON `unavailable` | 🟢 |
| RF-06 | `exec_command` preserva comandos com aspas simples/duplas (DT5) | Must | `sh -c 'echo "a b"'` executa sem quebrar argumentos | 🟢 |
| RF-07 | `stop_containers` e `start_containers` consomem o resolutor BFS compartilhado em `docker/shared/` (DT6) | Must | Mesma ordem de parada/início de antes; lógica única; sem duplicação nas tools | 🟢 |
| RF-08 | `package.json` com versão `0.1.0` alinhada ao servidor MCP (DT1) | Must | `npm version`/campo version e identidade do McpServer ambos `0.1.0` | 🟢 |
| RF-09 | AGENTS.md/README documentam os 7 prompts e os contratos reais das tools (DOC-01) | Must | Seção de prompts com 7 entradas; descrições de tools coerentes com o código | 🟢 |
| RF-10 | `compose_service` orienta via tools MCP sem gerar comandos CLI (DT3) | Must | Conteúdo do prompt e documentação coerentes; sem referência a `args` inexistente no schema de `exec_command` | 🟢 |
| RF-11 | Comportamento do `ToolContainer` (sem try/catch) documentado (G-08) | Must | Nota registrada em AGENTS.md ou na doc do módulo DI | 🟢 |
| RF-12 | Limitação de ausência de Dockerfile documentada (DT7) | Must | README registra deploy via npm/npx e ausência de imagem própria | 🟢 |
| RF-13 | Todos os testes afetados pelas correções DT são atualizados/criados e `npm test` passa (TEST-MANDATORY) | Must | `npm test` verde com 100% da suíte; testes novos cobrem cada DT | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Confiabilidade | Suíte de testes completa verde a cada correção (`npm test`) | `_reversa_sdd/gaps.md#Requisito obrigatório — testes` | 🟢 |
| Consistência | Formato de erro uniforme (`Error <ctx>: <msg>` + `isError:true`) em todas as tools | `_reversa_sdd/ferramentas-daemon/requirements.md#RN-03` | 🟢 |
| Manutenibilidade | Lógica BFS de dependências Compose única em `docker/shared/` | `_reversa_sdd/compartilhados-docker/requirements.md#RF-05` | 🟢 |
| Compatibilidade | Versão única `0.1.0` em package.json e no server | `_reversa_sdd/nucleo/requirements.md#RN-03` | 🟢 |
| Segurança | Correção de ambiguidade evita remoção acidental de imagem por prefixo curto | `_reversa_sdd/ferramentas-imagens/requirements.md#RN-02` | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: stop executa por padrão (DT2)
  Dado um container running e stop_containers sem o campo dryRun
  Quando a tool é chamada
  Então o container é parado (sem preview) e o resultado reflete execução real

Cenário: stop em preview (DT2)
  Dado um container running
  Quando stop_containers({dryRun: true})
  Então retorna os alvos sem parar nenhum container

Cenário: create sem pull quando a imagem existe (DT4)
  Dado uma imagem já presente localmente
  Quando create_container é chamado com essa imagem
  Então o container é criado sem chamada de pull

Cenário: create puxa imagem ausente (DT4)
  Dado uma imagem inexistente localmente
  Quando create_container é chamado com essa imagem
  Então a imagem é puxada antes da criação

Cenário: delete com prefixo ambíguo (DT-IMG-01)
  Dado um prefixo que casa múltiplas imagens
  Quando delete_image é chamado com esse prefixo
  Então retorna erro orientando a usar o ID completo e nenhuma imagem é removida

Cenário: daemon fora do ar (DT-ST)
  Dado um daemon Docker inacessível
  Quando docker_status é chamado
  Então retorna "Error docker_status: <msg>" com isError:true, sem JSON unavailable

Cenário: comando com aspas (DT5)
  Dado um container running
  Quando exec_command({id, command: "sh -c 'echo \"a b\"'"})
  Então o argumento "a b" é preservado e a saída é exatamente "a b"

Cenário: versão única (DT1)
  Dado o projeto buildado
  Quando se compara a versão de package.json com a identidade do McpServer
  Então ambas são 0.1.0

Cenário: resolutor compartilhado (DT6)
  Dado um project Compose com dependências
  Quando stop_containers e start_containers resolvem dependentes/dependências
  Então ambos usam a mesma lógica BFS em docker/shared/ e produzem a mesma ordem de antes

Cenário: documentação dos prompts (DOC-01)
  Dado o AGENTS.md e o README do projeto
  Quando se procura a seção de prompts
  Então os 7 prompts reais estão listados com descrição

Cenário: descrição cria e inicia (DT-CC-01)
  Dado o servidor MCP registrado
  Quando se inspeciona a tool create_container
  Então a descrição é "Create a Docker container and start it" e o handler inicia o container após criar

Cenário: suíte de testes verde (TEST-MANDATORY)
  Dado as correções DT aplicadas ao código
  Quando se roda npm test
  Então toda a suíte passa sem falhas
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01..RF-08 | Must | Correções de contrato/segurança já decididas (DT2, DT4, DT-CC-01, DT-IMG-01, DT-ST, DT5, DT6, DT1) |
| RF-09..RF-12 | Should | Correções de documentação (DOC-01, G-08, DT7) |
| RF-13 | Must | Testes atualizados e verdes são condição obrigatória de conclusão (TEST-MANDATORY) |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda. Rode `/reversa-clarify` quando houver `[DÚVIDA]` pendente.

## 10. Lacunas

- Nenhuma. Todas as decisões de revisão foram respondidas pelo usuário em 2026-08-13 e integradas em `_reversa_sdd/questions.md` e `_reversa_sdd/gaps.md` (confiança 🟢). Esta feature apenas aplica essas decisões no código e na documentação.

## Emendas

### E001, 2026-08-14

O que muda: o prompt `compose_service` volta a orientar a IA a ler o arquivo `docker-compose.yml` (com fallbacks) para identificar o serviço e seus overrides, e a partir dessas informações operar o serviço via as tools MCP do projeto.
Motivo: o ajuste DT3 substituiu a leitura do arquivo compose pela identificação via `list_containers` + `includeComposeMetadata`; o usuário pediu reversão porque a intenção original do prompt é a IA ler o arquivo docker-compose e, com base nele, usar as ferramentas disponíveis do projeto (sem reintroduzir a referência inválida a `exec_command` que originou o DT3).
Arquivos previstos: `src/docker/prompts/compose-service/messages/assistant.message.ts`, `tests/docker/prompts/compose-service/messages/assistant.message.test.ts`, `tests/docker/prompts/compose-service/compose-service.prompt.test.ts`

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-12 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-08-14 | Emenda E001 registrada (reversão DT3 no prompt `compose_service`) | reversa |
