# Chat, conta interna e ações da comunidade

## Alterações

- A página inicial volta a usar o globo de perfis anterior, sem a escultura 3D adicionada posteriormente.
- Ações principais usam o azul com relevo; secundárias usam o acabamento branco/azul-claro. Controles especializados mantêm suas funções e estados.
- Vaquinhas têm uma única entrada de criação: o botão do cabeçalho. O card de convite à criação foi removido.
- Visitantes acessam uma tela de convite no chat. A ação de entrar preserva o destino da conversa.
- O histórico carrega as 300 mensagens mais recentes em ordem cronológica, preserva mensagens recebidas durante a consulta e oferece recuperação de erros. A atualização periódica complementa o Realtime.
- A conta interna TranquiliCare sai da descoberta pública, preservando o acesso do proprietário ao perfil.
- O painel Admin inclui usuários recentes, busca, filtro de tipo, paginação, valores e detalhes de doações e contagens de histórias, conversas e mensagens. Não consulta o conteúdo de conversas.

## Banco e acesso

As migrações `20260910140000`, `20260910141000` e `20260910142000` foram aplicadas ao projeto Supabase vinculado. A leitura do chat falhava porque o papel autenticado não tinha permissão de executar o auxiliar usado pelas políticas RLS. A permissão foi corrigida mantendo essas políticas.

Validação no banco: um participante consegue ler a mensagem existente; uma conta fora da conversa vê zero mensagens; a organização interna não é pública. As funções passaram no lint do Supabase.

Nenhuma conta recebeu acesso Admin. A lista privada de administradores não pode ser editada pelo navegador; os relatórios negam acesso no servidor até o provisionamento autorizado. A revisão automática exige confirmação explícita da conta e do escopo antes dessa atribuição.

## Verificação

- 292 testes passaram em 79 arquivos, incluindo histórico recebido, recuperação de erro, convite ao visitante, criação única de vaquinha, relatórios e autorização da aba Admin.
- TypeScript e build de produção passaram. Permanecem avisos de tamanho de chunk e Fast Refresh no componente Button.
- Revisão no Edge em 390 e 1280 pixels: sem erros de JavaScript nem transbordamento da página. Relatórios foram verificados com dados de teste locais, sem habilitar acesso de produção.
- As heurísticas foram aplicadas com estados de carregamento/erro/vazio, linguagem clara, retorno e nova tentativa, padrões visuais reutilizados, autorização no servidor, rótulos visíveis, teclado/toque, conteúdo pertinente e explicação do escopo das métricas.

O commit é local. O envio para a main do GitHub aguarda a confirmação do destino exigida pela revisão automática.
