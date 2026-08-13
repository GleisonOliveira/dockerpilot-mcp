# Requirements: Módulo Ferramentas Imagens

> Identificador: `ferramentas-imagens`
> Data: `2026-08-13`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo
Quatro tools: `list_images`, `delete_image`, `pull_image` e `prune_images`. Cobre listagem com campos opcionais, remoção com gate de confirmação, pull com progresso e limpeza de dangling com gate.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.8 tools-images` | fluxos das 4 tools | 🟢 |
| `_reversa_sdd/data-dictionary.md#1.2/1.7/1.8/1.14` | schemas de entrada | 🟢 |
| `_reversa_sdd/data-dictionary.md#2.2/2.7/2.8/2.14` | formas de saída | 🟢 |
| `_reversa_sdd/domain.md#R09,R16,R17` | gates e parse de imagem | 🟢 |
| `_reversa_sdd/adrs/0002` | política de confirmação | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Agente | otimizar espaço | listar dangling, remover com confirmação, limpar |
| Desenvolvedor | preparar runtime | pull de imagem para deploy |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** `delete_image` exige `confirmed: true`; senão preview. 🟢 (`delete-image.tool.ts:72`)
2. **RN-02:** `delete_image` resolve por `find()` — short ID, full ID, `sha256:` ou tag. **Guarda de ambiguidade:** se o prefixo casar múltiplas imagens, retorna erro orientando a usar o ID completo (decisão DT-IMG-01; no legado o primeiro match era deletado). 🟢 (`delete-image.tool.ts:27-42`)
3. **RN-03:** `prune_images` exige `confirmed: true`; senão preview com contagem e tamanho total (MB) calculados sobre `listImages(dangling)`. 🟢 (`prune-images.tool.ts:47-53`)
4. **RN-04:** `pull_image` **não faz parse de `name:tag`** — a string é passada direto para `docker.pull()`; o daemon resolve tag `latest`. 🟢 (`pull-image.tool.ts:34`)
5. **RN-05:** `prune_images` usa `Promise.allSettled`; falhas parciais viram `failed_count` + `errors`, sem derrubar a tool. 🟢 (`prune-images.tool.ts:55-61`)

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | `list_images` com filtros (name, dangling, all) e opcionais (digests, containers) | Must | saída conforme data-dictionary §2.2 | 🟢 |
| RF-02 | `delete_image` com gate confirmed + force + guarda de ambiguidade | Must | preview sem confirmed; erro se prefixo ambíguo | 🟢 |
| RF-03 | `pull_image({image})` com progresso | Must | retorna id, tags, size_bytes após pull | 🟢 |
| RF-04 | `prune_images` com gate confirmed + force | Must | preview count+MB; resultado com freed/failed | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Segurança | remoção destrutiva sempre com confirmação | `delete-image.tool.ts:72`, `prune-images.tool.ts:53` | 🟢 |
| Resiliência | falhas parciais no prune não derrubam a operação | `prune-images.tool.ts:55` | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: pull com progresso
  Dado pull_image({image:"nginx:latest"})
  Quando o pull é concluído
  Então retorna { pulled, image, id, tags, size_bytes }

Cenário: delete sem confirmação
  Dado uma imagem existente
  Quando delete_image({id, confirmed:false})
  Então retorna preview com tags/size_mb/created e não remove

Cenário: prefixo ambíguo
  Dado um prefixo que casa múltiplas imagens
  Quando delete_image é chamado
  Então retorna erro orientando a usar o ID completo (DT-IMG-01)

Cenário: id inexistente
  Dado um id sem imagem correspondente
  Quando delete_image é chamado
  Então retorna erro "No image found matching"

Cenário: prune sem confirmação
  Dado imagens dangling existentes
  Quando prune_images({confirmed:false})
  Então retorna preview com count e total_size_mb sem remover

Cenário: prune sem dangling
  Dado nenhuma imagem dangling
  Quando prune_images é chamado
  Então retorna { deleted: false, message: "No dangling images found." }
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01..04 | Must | gestão de imagens |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas registrada ainda.

## 10. Lacunas

- 🟡 **DT-PULL** (limitação, não bloqueante): `pull_image` não emite feedback progressivo durante o pull em redes lentas — usa `followProgress` e só retorna ao final. Documentado; sem decisão pendente.

## 11. Decisões da revisão

| ID | Decisão | Resultado |
|----|---------|-----------|
| DT-IMG-01 | ambiguidade no `delete_image` | Adicionar guarda: erro quando o prefixo casa múltiplas imagens |

## 12. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-08-13 | Versão inicial gerada pelo Writer (reversa-autonomous) | reversa |
| 2026-08-13 | Correções da revisão: RN-02 (find, sem guarda de ambiguidade), RN-04 (sem parse de tag), RN-05 (allSettled), RF-01 (campos reais) | reversa-reviewer |
| 2026-08-13 | Revisão: DT-IMG-01 resolvido (guarda de ambiguidade, RN-02/RF-02) | reversa-reviewer |
