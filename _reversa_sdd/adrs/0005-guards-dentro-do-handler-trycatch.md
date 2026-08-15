# ADR-0005 — Guards de validação dentro do handler com tryCatch

**Data:** 2026-08-13 (retroativo; commit `dc22486 test(delete): fix empty-id assertions to match guard inside tryCatch`, 2026-05-25) | **Confiança:** 🟢 CONFIRMADO

## Contexto
O tratamento de erro das tools tinha dois caminhos: erro lançado (capturado por `tryCatch`) e erro de validação de campo obrigatório (retorno top-level `isError: true`). O commit de 2026-05-25 unifica o comportamento e ajusta os testes.

## Decisão
- Guards de campo obrigatório (ex.: `id` vazio) retornam o objeto de erro **como resultado do `tryCatch`** (`outcome.result`), não como retorno prematuro — preservando a forma normalizada `{ content, isError }`.
- Erros do daemon seguem lançando para serem capturados pelo mesmo wrapper.
- **Nunca** usar try/catch manual no `#handle` — sempre `tryCatch` (regra documentada no AGENTS.md e reforçada em todos os handlers).

## Alternativas consideradas
- Retorno precoce fora do tryCatch para cada validação — rejeitado (duplicava o formato de resposta).
- Wrapper por operação dentro da tool — rejeitado (padrão único é mais legível).

## Consequências
- Formato de erro uniforme: `Error <contexto>: <mensagem>` dentro de `content[0].text` com `isError: true`.
- Testes passaram a parsear `content[0].text` como JSON quando a tool retorna estrutura (ex.: guard como resultado).
- `utils/try-catch.ts` é o único ponto de normalização de exceções (`err.message` quando `instanceof Error`, senão `String(err)`).
