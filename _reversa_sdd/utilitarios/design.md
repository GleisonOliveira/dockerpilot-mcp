# Módulo Utilitários, Design Técnico

## Interface

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `tryCatch` | `(fn: () => Promise<T> | T)` | `Promise<TryCatchResult<T>>` | normaliza exceções |
| `TryCatchResult<T>` | union | `{success:true, result:T} \| {success:false, error:string}` | discriminada por `success` |

## Fluxo Principal
1. `try { const result = await fn(); return {success:true, result} }`.
2. `catch (err) { return {success:false, error: err instanceof Error ? err.message : String(err)} }`.

## Fluxos Alternativos
- **Rejeição de Promise:** tratada pelo mesmo catch.
- **Throw de primitivo (string/objeto):** `String(err)`.

## Dependências
- Nenhuma (std lib).

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Resultado discriminado por `success` | `src/utils/try-catch.ts` | 🟢 |

## Estado Interno
Sem estado.

## Observabilidade
Sem logs.

## Riscos e Lacunas
- Nenhum.
