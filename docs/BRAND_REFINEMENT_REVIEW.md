# Refinamento de marca — rodada de implementação

## Escopo

Aplicação inicial do manifesto em `LoggedOutHero`, `Marketplace` e `DonorProfile`, mantendo React, TypeScript, Tailwind e componentes existentes. Não é uma certificação visual de todas as páginas nem uma auditoria de produção do banco.

As skills locais do Appllama orientam hierarquia, controles reconhecíveis e movimento com função. Não foi usado o MCP pago; as recomendações de React Native foram adaptadas à plataforma web existente, sem migração ou novas dependências de runtime.

## Decisões aplicadas

| Superfície | Decisão | Critério |
| --- | --- | --- |
| Entrada pública | Convite para descobrir causas, com histórias como ação secundária | Uma intenção principal; linguagem próxima |
| Esfera da comunidade | Remover organizações demonstrativas do fallback; manter perfis carregados e identidade da plataforma | Não inventar prova social |
| Indicadores públicos | Seleção manual, sem troca automática; números tabulares e controles de 44 px | Controle, legibilidade e acessibilidade |
| Caminho da doação | Convite à explicação em vez da promessa absoluta de repasse no destaque | Confiança antes de conversão |
| Busca sem resultados | Ação para limpar busca e categoria, mantendo a pessoa na descoberta | Recuperação de erros e liberdade |
| Campo de busca | Remover mudança de largura ao focar e reduzir camadas decorativas | Estabilidade e minimalismo |
| Perfil do doador | Causas apoiadas no lugar de sequência de doações; participação sem cobrança por frequência | Pertencimento sem competição |

## Nielsen: revisão desta rodada

1. Estado: seleção dos indicadores exposta por `aria-pressed`; vazio da busca anunciado.
2. Mundo real: participação, causas e apoios em português claro.
3. Controle: indicadores manuais e recuperação da busca sem recarregar a página.
4. Consistência: componentes, tipografia e cores existentes preservados.
5. Prevenção: nenhuma nova mutação financeira ou confirmação simulada.
6. Reconhecimento: indicador identificado por rótulo e contexto.
7. Eficiência: botões semânticos com foco visível e alvos confortáveis nas ações alteradas.
8. Minimalismo: menos CTAs concorrentes, cores arbitrárias e movimento decorativo.
9. Recuperação: limpar filtros; evitar rejeição não tratada ao atualizar os perfis da esfera.
10. Ajuda: explicação do caminho da doação continua acessível.

## Validação e limites

Os 9 testes selecionados passaram (entrada pública, busca de causas e perfil do doador). Cobrem navegação dos CTAs, ausência de perfis fictícios no fallback, seleção acessível de indicadores e recuperação da busca. O build de produção também passou.

O navegador de testes não estava disponível na sessão. A revisão visual em celular/desktop, temas, texto longo e movimento permanece pendente; testes DOM e build não substituem essa etapa obrigatória. Não se afirma que todos os fluxos do manifesto foram visualmente auditados.

Próximas superfícies a validar: confirmação de doação, checkout, histórias, chat e dashboards autenticados. Preservar suas funções e animações proprietárias; alterar apenas com evidência e testes específicos.
