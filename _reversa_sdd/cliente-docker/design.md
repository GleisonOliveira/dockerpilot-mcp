# Módulo Cliente Docker, Design Técnico

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `DockerClient.getDocker` | `()` | `Dockerode` | cliente configurado |
| `DockerClient.checkConnection` | `()` | `Promise<void>` | `docker.ping()`; rejeita com mensagem por plataforma |

## Fluxo Principal
1. Constrói `new Dockerode({socketPath})` com socket por `process.platform`.
2. Tools chamam `checkConnection()` → `ping()`.
3. Tools usam `getDocker()` → métodos dockerode.

## Fluxos Alternativos
- **Plataforma win32:** socketPath = `//./pipe/docker_engine`.
- **Ping falha:** rejeição com mensagem explicando o socket esperado.

## Dependências
- `dockerode`.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| singleton global `dockerClient` | `src/docker/client.ts` (export) | 🟢 |
| socket derivado do platform | `src/docker/client.ts` | 🟢 |

## Estado Interno
Instância Dockerode imutável após criação.

## Observabilidade
Sem logs; falha de conexão vira erro normalizado nas tools.

## Riscos e Lacunas
- 🟡 Sem suporte a socket customizado por variável de ambiente (`DOCKER_HOST` não lido).
