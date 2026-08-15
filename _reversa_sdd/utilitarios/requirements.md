# Requirements: Módulo Utilitários (tryCatch)

> Identificador: `utilitarios`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
`tryCatch<T>` é o único ponto de normalização de erros assíncronos: envolve uma função, captura qualquer exceção e retorna um resultado discriminado `{success: true, result}` ou `{success: false, error}`. Toda tool usa este wrapper — nunca try/catch manual.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.3 utils` | union discriminada TryCatchResult | 🟢 |
| `_reversa_sdd/adrs/0005-guards-dentro-do-handler-trycatch.md` | padrão obrigatório | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Implementador de tool | capturar erros uniformemente | `const outcome = await tryCatch(...)` |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** Erros `instanceof Error` viram `err.message`; demais viram `String(err)`. 🟢
   - Origem no legado: `src/utils/try-catch.ts`
   - Tipo: confirmada
2. **RN-02:** Nunca usar try/catch manual no `#handle` das tools. 🟢
   - Origem no legado: `AGENTS.md`, `_reversa_sdd/adrs/0005`
   - Tipo: confirmada

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Retornar `{success:true, result:T}` em sucesso | Must | resultado preservado | 🟢 |
| RF-02 | Retornar `{success:false, error:string}` em falha | Must | erro normalizado | 🟢 |
| RF-03 | Aceitar funções síncronas e assíncronas | Must | `() => Promise<T> | T` | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Confiabilidade | nunca lança; sempre retorna | corpo com try/catch interno | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: sucesso
  Dado uma função que resolve
  Quando tryCatch é chamado
  Então retorna { success: true, result }

Cenário: erro
  Dado uma função que rejeita com Error
  Quando tryCatch é chamado
  Então retorna { success: false, error: "mensagem" }

Cenário: erro não-Error
  Dado uma função que lança string
  Quando tryCatch é chamado
  Então retorna { success: false, error: "<string>" }
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01..03 | Must | usado por todas as 16 tools |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda.

## 10. Lacunas

- Nenhuma.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
