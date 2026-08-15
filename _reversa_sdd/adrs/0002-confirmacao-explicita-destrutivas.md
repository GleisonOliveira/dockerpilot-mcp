# ADR-0002 — Confirmação explícita para operações destrutivas

**Data:** 2026-08-13 (retroativo; commit `c9a2456 feat(tools): add delete-container, delete-image, list-volumes and image-cleanup prompt`, 2026-05-25) | **Confiança:** 🟢 CONFIRMADO

## Contexto
O sistema delega ao agente o controle de um daemon Docker com operações irreversíveis (deletar container, imagem, volume; podar imagens). Sem barreira, um agente poderia destruir recursos sem supervisão humana.

## Decisão
- Todas as operações destrutivas exigem o parâmetro obrigatório `confirmed: boolean` com valor literal `true`.
- Com `confirmed` ausente/falso, a tool **não executa**: devolve preview com o alvo e a mensagem "Ask the user to confirm before retrying".
- `delete_volume` adiciona barreira técnica extra: **bloqueia remoção se o volume estiver em uso**.
- Tools de mudança de estado não-destrutivas ganharam `dryRun` (stop/start) para pré-visualização.

## Alternativas consideradas
- Confirmação via env/flag global — rejeitada (reduz granularidade por operação).
- Remoção com força implícita — rejeitada (contra o princípio safe-by-default).

## Consequências
- Fluxo obrigatório de 2 chamadas: preview → confirmação humana → execução.
- O mecanismo depende do agente honrar o contrato textual do preview (P6, confiança 🟡).
- `prune_images` ganhou variante em lote com `Promise.allSettled` e relatório por imagem (R21).
