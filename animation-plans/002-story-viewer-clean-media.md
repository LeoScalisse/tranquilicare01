# 002 — Limpar o visualizador de histórias

- **Status**: DONE
- **Commit**: 83f8aee
- **Severity**: MEDIUM
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file, pequena alteração

## Problem

`src/components/Stories.tsx` força toda mídia dentro de um cartão preto de altura fixa e mostra barras de progresso no topo, mesmo sem reprodução automática de slides. Isso distorce formatos e comunica um contador inexistente.

## Target

Remover as barras. A mídia conserva sua proporção natural dentro dos limites de `90vw × 86dvh`, com cantos de 16 px. O fundo externo usa azul-marinho translúcido; a troca de histórias usa entrada/saída de 200 ms `cubic-bezier(0.23, 1, 0.32, 1)` e apenas opacidade com movimento reduzido.

## Repo conventions to follow

- Reutilizar `AnimatePresence`, `motion` e os botões existentes.
- Manter navegação anterior/próxima e Escape.

## Steps

1. Remover o marcador superior baseado em `activeIndex`.
2. Remover o contêiner preto de altura fixa.
3. Aplicar limites responsivos diretamente a imagem, vídeo e embed, com `object-contain` e cantos suaves.

## Boundaries

- Não alterar a ordem das histórias, legenda ou autoria.
- Não adicionar dependências.

## Verification

- **Mechanical**: testes do feed e build.
- **Feel check**: abrir imagem vertical, horizontal e vídeo; nenhuma faixa preta deve ser criada pelo app e a mídia não pode ultrapassar a viewport.
- **Done when**: não há contador superior e cada formato mantém sua proporção.
