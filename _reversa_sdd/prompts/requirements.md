# Requirements: Módulo Prompts

> Identificador: `prompts`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
Sete prompts MCP que orientam o agente, sem executar ações: `container_troubleshoot`, `image_cleanup`, `volume_removal`, `compose_start`, `compose_stop`, `compose_restart` e `compose_service`. Cada prompt tem um `.prompt.ts` (registro + schema Zod), um `.template.ts` (constrói as mensagens) e mensagens `user`/`assistant` em `messages/`.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `src/prompts.config.ts` | 7 promptClasses registrados | 🟢 |
| `src/docker/prompts/*/<nome>.prompt.ts` | schemas e descrições | 🟢 |
| `src/docker/prompts/*/*.template.ts` | construção de mensagens | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Agente | diagnóstico guiado | prompt container_troubleshoot + container_logs/exec_command |
| Desenvolvedor | operação Compose | compose_start / compose_service com project_dir |
| Desenvolvedor | operação segura | volume_removal com avaliação de risco + dupla confirmação |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** prompts apenas em inglês. 🟢 (`volume-removal.template.ts`)
2. **RN-02:** prompts nunca executam tools; são orientadores (mensagens user+assistant). 🟢
3. **RN-03:** `volume_removal` orienta avaliação de risco (databases, app state, secrets) e dupla confirmação para volumes de alto risco. 🟢 (`volume-removal.prompt.ts:20-24`)
4. **RN-04:** prompts de Compose (`compose_start/stop/restart`) orientam operação sobre o projeto inteiro; `compose_service` gerencia um serviço individual (start/stop/restart) usando as tools MCP — decisão DT3 confirmada (não gera comandos CLI `docker compose`). 🟢 (`compose-service.prompt.ts:17-20`)

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | 7 prompts registrados com schema próprio | Must | listados via listPrompts | 🟢 |
| RF-02 | conteúdo orientador em inglês, via template | Must | todos os prompts | 🟢 |
| RF-03 | `container_troubleshoot` guia de diagnóstico | Must | args `container_name?`, `symptom?` | 🟢 |
| RF-04 | `image_cleanup` guia de liberação de espaço | Must | sem args | 🟢 |
| RF-05 | `volume_removal` workflow com avaliação de risco | Must | sem args; risco + dupla confirmação no conteúdo | 🟢 |
| RF-06 | `compose_start/stop/restart` orientam o projeto inteiro | Must | arg `project_dir?` | 🟢 |
| RF-07 | `compose_service` orienta serviço individual | Must | args `service_name?`, `action?(start\|stop\|restart)` | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Segurança | dupla confirmação em volume de alto risco | `volume-removal.prompt.ts:20-24` | 🟢 |
| Manutenibilidade | mensagens separadas por arquivo (`messages/user`, `messages/assistant`) | estrutura de pastas | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: prompt carregado
  Dado o MCP server conectado
  Quando o cliente lista prompts
  Então os 7 prompts estão disponíveis com descrição

Cenário: volume de alto risco
  Dado um volume usado por banco de dados
  Quando o agente segue volume_removal
  Então o fluxo orienta duas confirmações antes de deletar

Cenário: gestão de serviço individual
  Dado um projeto Compose com vários serviços
  Quando o agente segue compose_service com action
  Então orienta start/stop/restart de um único serviço usando as tools
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01..07 | Must | diferenciais de uso seguro e orquestração Compose |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda.

## 10. Lacunas

> DT3 resolvida na revisão — decisão do usuário: `compose_service` continua orientando operações via tools MCP (RN-04). L2 do Detective fechado.

## 11. Decisões da revisão

| ID | Decisão | Resultado |
|----|---------|-----------|
| DT3 / L2 | contrato do prompt `compose_service` | Orientar via tools MCP (list_containers, start/stop/restart_container, container_logs); sem geração de comandos CLI |

## 12. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
| 2026-08-13 | Correção crítica da revisão: conjunto real de prompts | reversa-reviewer |
| 2026-08-13 | Revisão: DT3/L2 resolvido (RN-04) | reversa-reviewer |
