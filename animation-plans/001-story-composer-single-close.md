# 001 — Transformar o publicador em um único controle de fechar

- **Status**: DONE
- **Commit**: 83f8aee
- **Severity**: HIGH
- **Category**: Spatial consistency
- **Estimated scope**: 1 file, pequena alteração

## Problem

`src/components/ui/story-composer-fab.tsx` exibe simultaneamente o botão flutuante transformado em X e outro X no cabeçalho do painel. A duplicação cria duas saídas e o X flutuante permanece longe do ponto de fechamento esperado.

## Target

Ao abrir, manter um único botão: o lápis troca para X e o próprio botão se desloca para o canto superior direito do painel. Usar o spring existente `{ type: 'spring', duration: 0.5, bounce: 0.2 }`; a troca do ícone dura 200 ms com saída forte. Em movimento reduzido, trocar apenas opacidade em 10 ms.

## Repo conventions to follow

- Reutilizar `motion/react`, `AnimatePresence`, `useReducedMotion` e o spring já presentes no componente.
- Animar `transform` e `opacity`; o reposicionamento interruptível usa layout spring.

## Steps

1. Remover o botão X interno do cabeçalho do painel.
2. Desativar drag enquanto aberto e aplicar layout ao contêiner flutuante.
3. Quando aberto, posicionar o botão no canto superior direito calculado do painel, acima dele no z-index.
4. Manter Escape, clique no X transformado e publicação bem-sucedida fechando o painel.

## Boundaries

- Não alterar validação, anexos ou persistência da história.
- Não adicionar dependências.

## Verification

- **Mechanical**: `npm test -- src/components/__tests__/Stories.test.tsx`; `npx tsc --noEmit -p tsconfig.app.json`.
- **Feel check**: abrir/fechar repetidamente; deve existir um único botão “Fechar nova história”, no canto do painel, sem salto. Com movimento reduzido, não deve haver deslocamento animado.
- **Done when**: nunca existem dois botões X e o foco/aria-label acompanham o estado.
