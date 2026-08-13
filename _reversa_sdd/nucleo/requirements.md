# Requirements: Módulo Core (bootstrap do servidor MCP)

> Identificador: `nucleo`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
O módulo core monta o servidor MCP DockerPilot: instancia o cliente Docker, os containers de DI e registra as 16 tools e 7 prompts no `McpServer`, conectando ao transporte stdio. É a porta de entrada do processo (`src/index.ts`) e a composição central (`src/server.ts`).

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#3. Modelo de execução` | bootstrap: index → dockerClient → ToolContainer/PromptContainer → DockerPilotServer → stdio | 🟢 |
| `_reversa_sdd/code-analysis.md#2.1 core` | registros em tools.config.ts (16) e prompts.config.ts (7) | 🟢 |
| `_reversa_sdd/domain.md#R25` | versão McpServer `0.1.0` vs package.json `0.0.1` | 🟡 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Desenvolvedor/DevOps | expor Docker ao agente | executar `node dist/index.js` como MCP server do agente |
| Agente de IA | chamar tools/prompts | handshake MCP sobre stdio → `list_containers`, etc. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** O servidor registra tools e prompts na ordem devolvida pelos containers. 🟢
   - Origem no legado: `src/server.ts`
   - Tipo: confirmada
2. **RN-02:** O servidor se conecta ao `StdioServerTransport` e permanece ativo enquanto o processo viver. 🟢
   - Origem no legado: `src/server.ts`
   - Tipo: confirmada
3. **RN-03:** Identidade MCP: nome `dockerpilot-mcp`, versão `0.1.0`. 🟢
   - Origem no legado: `src/server.ts`
   - Tipo: confirmada (divergência de versão = DT1)

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Criar singleton `dockerClient` no bootstrap | Must | index.ts instancia um único DockerClient | 🟢 |
| RF-02 | Instanciar `ToolContainer` com as 16 classes de `tools.config.ts` | Must | getTools() retorna 16 tools | 🟢 |
| RF-03 | Instanciar `PromptContainer` com as 7 classes de `prompts.config.ts` | Must | getPrompts() retorna 7 prompts | 🟢 |
| RF-04 | Registrar todas as tools/prompts no McpServer via `register(server)` | Must | servidor expõe os 23 contratos | 🟢 |
| RF-05 | Conectar ao transporte stdio | Must | `start()` chama `StdioServerTransport` | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Segurança | Não expor rede: apenas stdio local | `StdioServerTransport`; sem porta HTTP | 🟢 |
| Compatibilidade | Node 20+ com ESM | `package.json` | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: servidor inicia e registra contratos
  Dado o processo executando dist/index.js
  Quando o cliente MCP faz o handshake
  Então as 16 tools e 7 prompts estão disponíveis

Cenário: falha de conexão com o daemon
  Dado o daemon Docker inacessível
  Quando uma tool é chamada
  Então a tool retorna erro normalizado com isError true
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01..05 | Must | caminho crítico de bootstrap |
| RNF Segurança | Must | modelo de transporte é decisão central |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda. Rode `/reversa-clarify` quando houver `[DÚVIDA]` pendente.

## 10. Lacunas

> DT1 resolvida na revisão — decisão do usuário: alinhar `package.json` → `0.1.0` (o McpServer é a fonte de verdade da versão).

## 11. Decisões da revisão

| ID | Decisão | Resultado |
|----|---------|-----------|
| DT1 | versão divergente (0.0.1 vs 0.1.0) | `package.json` → `0.1.0`, alinhado ao McpServer |

## 12. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
| 2026-08-13 | Revisão: DT1 resolvido (versão → 0.1.0) | reversa-reviewer |
