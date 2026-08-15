# Requirements: Módulo Cliente Docker

> Identificador: `cliente-docker`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
`DockerClient` encapsula o `Dockerode` com socket por plataforma (`/var/run/docker.sock` em Unix, `//./pipe/docker_engine` em Windows) e expõe `getDocker()` e `checkConnection()` (ping). Singleton exportado e injetado em todas as tools.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.4 docker-client` | socket por plataforma; ping em checkConnection | 🟢 |
| `_reversa_sdd/code-analysis.md#4` | chamadas dockerode usadas pelas tools | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Toda tool | falar com o daemon | getDocker() + operação dockerode |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** Socket default `/var/run/docker.sock` (Unix); `//./pipe/docker_engine` se `process.platform === "win32"`. 🟢
   - Origem no legado: `src/docker/client.ts`
   - Tipo: confirmada
2. **RN-02:** Toda tool chama `checkConnection()` (ping) antes de operar. 🟢
   - Origem no legado: `src/docker/client.ts` + todas as tools
   - Tipo: confirmada

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Retornar instância Dockerode configurada | Must | getDocker() não nulo | 🟢 |
| RF-02 | Ping no daemon | Must | checkConnection() rejeita com erro orientado por plataforma se inacessível | 🟢 |
| RF-03 | Singleton exportado | Must | `dockerClient` único | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Segurança | Comunicação via socket local, sem rede | config do Dockerode | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: daemon acessível
  Dado daemon Docker com socket disponível
  Quando checkConnection é chamado
  Então resolve sem erro

Cenário: daemon inacessível
  Dado socket indisponível
  Quando checkConnection é chamado
  Então rejeita com mensagem de erro orientada por plataforma
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01..03 | Must | dependência de todas as 16 tools |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda.

## 10. Lacunas

- Nenhuma.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
