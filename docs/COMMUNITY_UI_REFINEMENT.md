# Refinamento de checkout, histórias e perfis

## Referências e decisões

- Aurora: https://github.com/tornikegomareli/Aurora. A biblioteca original usa SwiftUI/Metal. A implementação web adapta campo de cores, núcleo luminoso, halo e entrada que repousa, preservando o componente AppleEdgeGlow e as etapas reais do checkout. Paletas `brand` (padrão azul/ciano com amarelo) e `ocean` disponíveis por propriedade. Sem nova dependência e sem animação decorativa contínua.
- `src/assets/videos/Carrosseis-novos.mp4`: área clara de apresentação, foto vertical e prévias laterais menores. O carrossel usa GSAP já instalado, botões, teclado, toque e movimento reduzido; uma única ONG dispensa navegação.
- `src/assets/videos/airbnb-profile.mp4`: perguntas opcionais com ícones e apresentação pública das respostas. A adaptação mantém os componentes web existentes. As imagens anexas mencionadas no pedido não estavam disponíveis na conversa; as ferramentas Appllama também não estavam conectadas.

## Comportamento

Histórias sem mídia deixam de receber avatar/capa como foto de publicação. O feed acompanha o conteúdo, limita a prévia a cinco linhas renderizadas e permite expandir/recolher o texto integral. A categoria é opcional, usa os seis selos existentes e define o gradiente discreto do cartão. Galeria e visualizador da ONG também aceitam histórias sem foto.

O perfil oferece oito perguntas, todas opcionais, com até 240 caracteres por resposta. Apenas respostas preenchidas aparecem no perfil público, ao lado do cartão de identidade e acesso ao chat existente. O editor informa que as respostas salvas serão públicas. Campos textuais usam SmoothTextarea. A gravação aguarda confirmação do backend; falhas preservam o preenchimento. O perfil público oferece nova tentativa quando a consulta falha.

## Banco e publicação

Aplicar `supabase/migrations/20260909120000_story_categories_and_profile_curiosities.sql` antes de publicar este frontend. A migração acrescenta a categoria das histórias, respostas validadas em JSON, o parâmetro opcional na gravação atômica do perfil e uma consulta pública limitada a nome, avatar, bio e respostas. Não expõe telefone, e-mail ou valores doados. Chamadas antigas da gravação preservam as respostas existentes.

A migração foi preparada e revisada, mas **não foi executada no banco remoto nem validada contra um PostgreSQL local** nesta sessão. Os testes de persistência usam mocks; ainda é necessário verificar publicação e recarregamento com o banco migrado.

## Verificação

- 275 testes passaram em 74 arquivos, incluindo categorias na publicação, persistência das respostas, texto compacto/expansível, carrossel e recuperação de erro do perfil público.
- TypeScript sem erros; ESLint dos arquivos alterados sem apontamentos.
- Build de produção concluído. Permanece o aviso de chunks maiores que 500 kB.
- Chromium em 1440 × 1000 e 390 × 844: sem erros de JavaScript na prévia, sem transbordamento horizontal no celular, expansão/recolhimento funcionando e revisão visual do perfil público. Validação com fixtures locais, sem publicar histórias ou enviar mensagens reais.
- Critérios de UX considerados: estado de envio/erro, linguagem humana, controles de retorno/leitura, componentes consistentes, limites e categorias validados, perguntas rotuladas, teclado/toque, cartões proporcionais, nova tentativa e ajuda contextual sobre publicação dos dados. As exclusões existentes continuam com seu mecanismo de recuperação.
