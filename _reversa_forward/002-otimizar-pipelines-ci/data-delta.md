<!--
Data-delta gerado por /reversa-plan em 2026-09-05. Feature: 002-otimizar-pipelines-ci.
-->

# Data-delta: Otimizar pipelines CI

> Identificador: `002-otimizar-pipelines-ci`
> Data: `2026-09-05`

## Resumo

Esta feature não altera o modelo de dados da aplicação. O servidor MCP (`dockerpilot-mcp`) não possui banco de dados próprio (confirmado em `_reversa_sdd/architecture.md#Integrações externas`: "Sem banco de dados, sem serviços HTTP próprios"). Não há tabelas, schemas, campos, índices ou migrações afetados.

## Arquivos de configuração com novos artefatos

| Artefato | Tipo | Impacto |
|----------|------|---------|
| `.node-version` (raiz, novo) | arquivo de ambiente contendo `22.14.0` | fonte única da versão de Node para todos os workflows (`node-version-file`); não é dado de aplicação, não persiste entre runs além do repo |

## O que NÃO muda

- Nenhuma tabela no `_reversa_sdd/erd-complete.md` é alterada.
- Nenhuma migração de dados é necessária.
- Nenhum schema Zod do `_reversa_sdd/` muda (tools/prompts intactas).
- Nenhum contrato de dados entre tools MCP e o daemon muda.

## Confidência

🟢 Confirmado: ausência de banco de dados e de schema de aplicação no projeto (`_reversa_sdd/architecture.md#5. Integrações externas`).