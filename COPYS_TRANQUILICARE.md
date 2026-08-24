# Inventário de copys do TranquiliCare

Atualizado em: 24 de agosto de 2026

## Como usar este arquivo

Este documento registra os textos que formam a experiência atual do TranquiliCare. Ele foi organizado por tela e por momento da jornada para permitir revisão de tom de voz, consistência, clareza e alinhamento de marca sem exigir leitura do código.

Em cada tabela:

- **Copy atual** reproduz o texto exibido hoje.
- **Onde aparece** descreve a posição exata na interface.
- **Quando aparece** explica estados condicionais.
- **Função** identifica o papel editorial do texto.
- **Fonte** aponta para o arquivo que controla a copy.

O inventário inclui textos visíveis, placeholders, mensagens de sucesso e erro, textos de acessibilidade, metadados de compartilhamento e conteúdo de demonstração. Textos exclusivamente técnicos, nomes de classes CSS, IDs internos e mensagens restritas ao console não são tratados como copy.

## Sumário

1. Entrar e criar conta
2. Participar pelo feed de histórias
3. Fundamentos da marca e compartilhamento
4. Navegação global
5. Conhecer a plataforma: página inicial para visitantes
6. Acompanhar impacto: página inicial autenticada
7. Descobrir causas e organizações
8. Configurar e administrar uma organização
9. Perfil público e privado da organização
10. Perfil do doador
11. Doação, pagamento e agradecimento
12. Narrativa: integridade da doação
13. Narrativa: verificação das ONGs
14. Mensagens de validação, sucesso e erro
15. Conteúdo de demonstração das organizações
16. Textos acessíveis e auxiliares
17. Pontos de atenção editorial
18. Mapa de manutenção

---

## 1. Entrar e criar conta

### Escolha de perfil e enquadramento

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Doador | Seletor de caminho e etiqueta do formulário | Caminho de doador | Identificar o público | `src/components/AuthSwitch.tsx:80` |
| Organização | Seletor de caminho e etiqueta do formulário | Caminho de ONG | Identificar o público | `src/components/AuthSwitch.tsx:96` |
| Toda boa ação começa com uma escolha. | Frase lateral do caminho doador | Doador selecionado | Enquadramento emocional | `src/components/AuthSwitch.tsx:1167` |
| Sua causa também tem um lugar aqui. | Frase lateral do caminho ONG | Organização selecionada | Enquadramento emocional | `src/components/AuthSwitch.tsx:1167` |
| Entre, confirme sua conta e encontre uma causa para começar a construir impacto. | Apoio da trilha doador | Doador selecionado | Explicar o percurso | `src/components/AuthSwitch.tsx:1171` |
| Prepare sua presença, organize os dados essenciais e conecte pessoas ao seu propósito. | Apoio da trilha ONG | Organização selecionada | Explicar o percurso | `src/components/AuthSwitch.tsx:1172` |

### Etapas da trilha doador

| Etapa | Título | Descrição | Onde aparece | Fonte |
|---|---|---|---|---|
| 1 | Acesso e cadastro | Entre na sua conta ou crie uma nova em poucos passos. | Primeiro item da trilha | `src/components/AuthSwitch.tsx:117` |
| 2 | Verifique seu e-mail | Confirme o código para manter sua conta protegida. | Segundo item da trilha | `src/components/AuthSwitch.tsx:122` |
| 3 | O começo do bem | Chegue às causas preparado para escolher como participar. | Terceiro item da trilha | `src/components/AuthSwitch.tsx:127` |

### Etapas da trilha organização

| Etapa | Título | Descrição | Onde aparece | Fonte |
|---|---|---|---|---|
| 1 | Acesso e cadastro | Entre ou apresente sua organização ao TranquiliCare. | Primeiro item da trilha | `src/components/AuthSwitch.tsx:134` |
| 2 | Verificação e dados | Confirme o e-mail e prepare dados e recebimentos. | Segundo item da trilha | `src/components/AuthSwitch.tsx:139` |
| 3 | Uma jornada que inspira | Comece a aproximar pessoas do propósito da sua organização. | Terceiro item da trilha | `src/components/AuthSwitch.tsx:144` |

### Formulário doador

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Bem-vindo de volta | Título do formulário | Login | Acolhimento | `src/components/AuthSwitch.tsx:88` |
| Continue acompanhando as causas que você escolheu apoiar. | Subtítulo | Login | Continuidade | `src/components/AuthSwitch.tsx:90` |
| Comece a fazer o bem | Título do formulário | Cadastro | Convite | `src/components/AuthSwitch.tsx:88` |
| Sua próxima boa ação pode começar daqui. | Subtítulo | Cadastro | Motivação | `src/components/AuthSwitch.tsx:91` |
| Nome do Doador | Label | Cadastro | Identificação | `src/components/AuthSwitch.tsx:789` |
| Seu nome | Placeholder | Cadastro | Exemplo | `src/components/AuthSwitch.tsx:93` |
| E-mail | Label | Sempre | Credencial | `src/components/AuthSwitch.tsx:810` |
| seu@email.com | Placeholder | Sempre | Exemplo | `src/components/AuthSwitch.tsx:94` |
| Senha | Label | Sempre | Credencial | `src/components/AuthSwitch.tsx:830` |
| Mínimo 6 caracteres | Placeholder | Cadastro | Regra | `src/components/AuthSwitch.tsx:841` |
| Confirme sua senha | Label | Cadastro | Confirmação | `src/components/AuthSwitch.tsx:866` |
| Repita sua senha | Placeholder | Cadastro | Orientação | `src/components/AuthSwitch.tsx:877` |

### Formulário organização

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Bem-vinda de volta. | Título | Login | Acolhimento | `src/components/AuthSwitch.tsx:104` |
| Sua comunidade continua esperando por você. | Subtítulo | Login | Continuidade | `src/components/AuthSwitch.tsx:106` |
| Cadastre sua organização | Título | Cadastro | Convite | `src/components/AuthSwitch.tsx:104` |
| Inspire as pessoas através da sua causa. | Subtítulo | Cadastro | Proposta | `src/components/AuthSwitch.tsx:107` |
| Nome da organização | Label e placeholder | Cadastro | Identificação | `src/components/AuthSwitch.tsx:109`, `src/components/AuthSwitch.tsx:789` |
| contato@suaong.org | Placeholder de e-mail | Sempre | Exemplo | `src/components/AuthSwitch.tsx:110` |
| Cadastrar organização | Botão principal | Cadastro | Criar conta | `src/components/AuthSwitch.tsx:898` |

### Ações compartilhadas do formulário

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Continuar com Google | Botão superior | Sempre | OAuth | `src/components/AuthSwitch.tsx:745` |
| Disponível assim que o Supabase for configurado. | Nota abaixo do Google | Google indisponível | Estado técnico | `src/components/AuthSwitch.tsx:749` |
| ou | Divisor | Sempre | Separar métodos | `src/components/AuthSwitch.tsx:755` |
| Entrar | Aba e botão principal | Login | Entrar na conta | `src/components/AuthSwitch.tsx:765`, `src/components/AuthSwitch.tsx:898` |
| Criar conta | Aba e botão principal | Cadastro doador | Criar conta | `src/components/AuthSwitch.tsx:772`, `src/components/AuthSwitch.tsx:898` |
| Mostrar senha / Ocultar senha | Nome acessível do ícone de olho | Conforme estado | Acessibilidade | `src/components/AuthSwitch.tsx:847` |
| Mostrar confirmação de senha / Ocultar confirmação de senha | Nome acessível do segundo olho | Cadastro | Acessibilidade | `src/components/AuthSwitch.tsx:883` |

### Verificação por e-mail

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Verifique seu e-mail | Título | Código enviado | Orientação principal | `src/components/AuthSwitch.tsx:564` |
| Enviamos um código para sua caixa de entrada. | Subtítulo | Código enviado | Confirmar envio | `src/components/AuthSwitch.tsx:565` |
| Código enviado para {e-mail} | Faixa informativa | Código enviado | Confirmar destino | `src/components/AuthSwitch.tsx:571` |
| Código de verificação | Label dos campos | Código enviado | Nome do dado | `src/components/AuthSwitch.tsx:577` |
| Confirmar código | Botão principal | Código completo | Validar e-mail | `src/components/AuthSwitch.tsx:592` |
| Voltar | Ação inferior esquerda | Código enviado | Retornar ao cadastro | `src/components/AuthSwitch.tsx:605` |
| Reenviando... | Ação inferior direita | Reenvio em andamento | Feedback | `src/components/AuthSwitch.tsx:613` |
| Reenviar em {n}s | Ação inferior direita | Durante cooldown | Contagem | `src/components/AuthSwitch.tsx:614` |
| Reenviar código | Ação inferior direita | Cooldown concluído | Novo envio | `src/components/AuthSwitch.tsx:615` |

### Pós-verificação da organização

| Copy atual | Onde aparece | Função | Fonte |
|---|---|---|---|
| Próxima preparação | Etiqueta superior | Introduzir o próximo estágio | `src/components/AuthSwitch.tsx:631` |
| Dados e recebimentos | Título | Nomear o estágio | `src/components/AuthSwitch.tsx:632` |
| Antes de receber apoio, sua organização completa as informações que dão segurança para toda a comunidade. | Parágrafo | Explicar por que os dados são necessários | `src/components/AuthSwitch.tsx:633` |
| Identidade da organização | Item 1 | Grupo de dados oficiais | `src/components/AuthSwitch.tsx:639` |
| Dados oficiais e canais de contato. | Descrição do item 1 | Explicação | `src/components/AuthSwitch.tsx:639` |
| Responsáveis | Item 2 | Grupo de responsáveis | `src/components/AuthSwitch.tsx:640` |
| Quem representa e acompanha a organização. | Descrição do item 2 | Explicação | `src/components/AuthSwitch.tsx:640` |
| Recebimentos | Item 3 | Grupo financeiro | `src/components/AuthSwitch.tsx:641` |
| Configuração segura para repasses e doações. | Descrição do item 3 | Explicação | `src/components/AuthSwitch.tsx:641` |
| Seguir para o início da jornada | Botão principal | Avançar | `src/components/AuthSwitch.tsx:658` |

### Encerramento da trilha

| Público/estado | Copy atual | Onde aparece | Fonte |
|---|---|---|---|
| Doador verificado | Seu e-mail está confirmado. | Confirmação intermediária | `src/components/AuthSwitch.tsx:670` |
| Doador verificado | Sua conta está pronta para acompanhar cada causa escolhida. | Apoio da confirmação | `src/components/AuthSwitch.tsx:671` |
| Sem verificação | A verificação acontece depois do cadastro. | Estado da etapa 2 | `src/components/AuthSwitch.tsx:682` |
| Sem verificação | Crie sua conta na primeira etapa. Assim que o código for enviado, este espaço estará pronto para recebê-lo. | Apoio do estado bloqueado | `src/components/AuthSwitch.tsx:683` |
| Organização | Uma jornada que inspira começa aqui. | Título final | `src/components/AuthSwitch.tsx:691` |
| Organização | Leve sua organização para perto de pessoas que querem transformar intenção em impacto. | Descrição final | `src/components/AuthSwitch.tsx:693` |
| Organização | Configurar minha organização | CTA final | `src/components/AuthSwitch.tsx:713` |
| Doador | O começo do bem. | Título final | `src/components/AuthSwitch.tsx:691` |
| Doador | Sua conta está pronta. Agora você pode descobrir causas e acompanhar o impacto que ajuda a construir. | Descrição final | `src/components/AuthSwitch.tsx:694` |
| Doador | Ir para o início | CTA final | `src/components/AuthSwitch.tsx:713` |
| Etapa bloqueada | Conclua as etapas anteriores para chegar até aqui. | Descrição | `src/components/AuthSwitch.tsx:704` |
| Etapa bloqueada | Começar pela primeira etapa | CTA | `src/components/AuthSwitch.tsx:717` |

---

## 2. Participar pelo feed de histórias

### Introdução e expansão

| Copy atual | Onde aparece | Função | Fonte |
|---|---|---|---|
| Histórias de impacto | Etiqueta acima do título | Contextualizar a seção | `src/components/Stories.tsx:458` |
| Histórias aproximam quem transforma. | Título principal | Manifesto curto | `src/components/Stories.tsx:460` |
| Um só lugar para acompanhar mudanças reais e compartilhar como cada causa continua ganhando vida. | Parágrafo introdutório | Explicar o feed unificado | `src/components/Stories.tsx:463` |
| Sem texto: animação de rolagem | Sobre o preview após 3 segundos sem interação | Sugerir a expansão sem instrução escrita | `src/components/ui/scroll-idle-cue.tsx` |
| Histórias | Cabeçalho interno do feed | Nome da tela expandida e do preview | `src/components/Stories.tsx:486` |
| Impactos e vozes da comunidade | Subtítulo do cabeçalho interno | Enquadrar o conteúdo | `src/components/Stories.tsx:487` |

### Compositor

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Entre para compartilhar uma história. | Placeholder | Visitante | Convite ao login | `src/components/Stories.tsx:380` |
| O que essa causa despertou ou transformou em você? | Placeholder | Doador autenticado | Prompt de relato | `src/components/Stories.tsx:377` |
| O que mudou hoje na sua causa? | Placeholder | Organização autenticada | Prompt de atualização | `src/components/Stories.tsx:379` |
| Publicar | Botão do compositor | Pessoa autenticada | Publicar história | `src/components/Stories.tsx:519` |
| Entrar | Botão do compositor | Visitante | Autenticar | `src/components/Stories.tsx:519` |
| Adicionar imagem | Nome acessível do primeiro ícone | Sempre | Anexar mídia | `src/components/Stories.tsx:511` |
| Adicionar vídeo | Nome acessível do segundo ícone | Sempre | Anexar mídia | `src/components/Stories.tsx:514` |

### Navegação e estados

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Para você | Primeira aba | Sempre | Feed principal | `src/components/Stories.tsx:47` |
| Seguindo | Segunda aba | Sempre | Feed filtrado | `src/components/Stories.tsx:48` |
| Salvas | Terceira aba | Sempre | Feed de itens salvos | `src/components/Stories.tsx:49` |
| As histórias que você salvar aparecerão aqui. | Centro do feed | Aba Salvas vazia | Estado vazio | `src/components/Stories.tsx:563` |
| Novas histórias estão a caminho. | Centro do feed | Outro feed vazio | Estado vazio | `src/components/Stories.tsx:564` |
| Carregando mais histórias | Nome acessível do indicador no fim | Feed infinito | Feedback | `src/components/Stories.tsx:572` |

### Cada publicação

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Simulação | Selo ao lado do horário | Conteúdo demonstrativo | Transparência | `src/components/Stories.tsx:222` |
| Uma nova atualização de impacto chegou. | Corpo do post | Legenda ausente | Fallback | `src/components/Stories.tsx:227` |
| Organização verificada | Nome acessível do selo | ONG verificada | Acessibilidade | `src/components/Stories.tsx:216` |
| Mais opções | Botão no cabeçalho do post | Sempre | Menu contextual | `src/components/Stories.tsx:233` |
| Curtir história / Remover curtida | Botão de reação | Conforme estado | Reação | `src/components/Stories.tsx:289` |
| Comentar | Botão de interação recolhido e CTA do card | Campo fechado ou card aberto | Abrir o compositor com clique e mantê-lo disponível junto aos comentários | `src/components/ui/morphing-comment-button.tsx` |
| Escreva um comentário... | Placeholder do campo expansível | Campo aberto | Orientar a resposta | `src/components/ui/morphing-comment-button.tsx` |
| Escreva um comentário | Nome acessível do campo expansível | Campo aberto | Acessibilidade | `src/components/ui/morphing-comment-button.tsx` |
| Enviar comentário | Nome acessível do botão de envio | Campo aberto | Publicar o comentário | `src/components/ui/morphing-comment-button.tsx` |
| Comentários | Título do card animado | Pressão longa no botão de comentário | Identificar a conversa da publicação | `src/components/ui/morphing-comment-button.tsx` |
| Comentários da história | Nome acessível do card | Card aberto | Contextualizar o diálogo para tecnologia assistiva | `src/components/ui/morphing-comment-button.tsx` |
| Fechar comentários | Nome acessível do fundo e do botão de fechar | Card aberto | Encerrar a leitura | `src/components/ui/morphing-comment-button.tsx` |
| {quantidade} comentários | Rodapé do card | Card aberto | Informar o volume da conversa | `src/components/ui/morphing-comment-button.tsx` |
| Ainda não há comentários por aqui. | Estado vazio do card | Publicação sem comentários | Explicar a ausência de respostas | `src/components/ui/morphing-comment-button.tsx` |
| Compartilhar | Botão de interação | Sempre | Abrir opções de distribuição | `src/components/ui/story-share-sheet.tsx` |
| Compartilhar por | Cabeçalho do menu | Menu aberto | Identificar as opções | `src/components/ui/story-share-sheet.tsx` |
| WhatsApp / Enviar em uma conversa | Primeira opção | Menu aberto | Compartilhar pelo WhatsApp | `src/components/ui/story-share-sheet.tsx` |
| Instagram / Copiar para compartilhar | Segunda opção | Menu aberto | Preparar o link para o Instagram | `src/components/ui/story-share-sheet.tsx` |
| TranquiliCare / Enviar para outro usuário | Terceira opção | Menu aberto | Preparar o envio dentro do app | `src/components/ui/story-share-sheet.tsx` |
| Link copiado para compartilhar no Instagram. | Toast | Instagram selecionado | Confirmar preparação | `src/components/ui/story-share-sheet.tsx` |
| Link copiado para enviar no TranquiliCare. | Toast | TranquiliCare selecionado | Confirmar preparação | `src/components/ui/story-share-sheet.tsx` |
| Salvar história / Remover dos salvos | Botão final | Conforme estado | Coleção pessoal | `src/components/Stories.tsx:348` |
| Fechar história | Botão do visualizador | História aberta | Encerrar visualização | `src/components/Stories.tsx:603` |
| História anterior / Próxima história | Setas do visualizador | Mais de uma história | Navegação | `src/components/Stories.tsx:616`, `src/components/Stories.tsx:627` |

### Legendas geradas para simulação infinita

Estas copys aparecem nos posts adicionais enquanto ainda não há volume suficiente de publicações reais.

1. Mais uma etapa concluída com a participação de voluntários e pessoas da comunidade.
2. Os recursos recebidos ajudaram a manter o cuidado chegando a quem mais precisa.
3. Um novo encontro transformou apoio em escuta, presença e possibilidades.
4. A equipe compartilhou os avanços da semana e os próximos passos desta causa.
5. Pequenas contribuições se encontraram para tornar esta ação possível.
6. Hoje foi dia de acompanhar resultados, acolher pessoas e preparar a próxima atividade.
7. A comunidade esteve presente em mais uma ação construída de forma coletiva.
8. O apoio continua se transformando em experiências que fortalecem vínculos.

Fonte: `src/components/Stories.tsx:55`.

---

## 3. Fundamentos da marca e compartilhamento

### Identidade principal

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| TranquiliCare | Título da aba, cabeçalhos, telas de autenticação e assinaturas da interface | Sempre | Nome da marca | `index.html:7`, `src/components/Header.tsx:58` |
| TRANQUILICARE | Rodapé da página inicial | Sempre | Assinatura institucional | `src/pages/Index.tsx:283` |
| © 2025 TranquiliCare. Conectando corações, mudando o mundo. | Rodapé da página inicial | Sempre | Assinatura e frase institucional | `src/pages/Index.tsx:285` |

### SEO e preview de link

| Copy atual | Onde aparece | Função | Fonte |
|---|---|---|---|
| TranquiliCare aproxima pessoas de organizações e transforma apoio em histórias de impacto. | Descrição do site usada por navegadores e buscadores | Resumo institucional | `index.html:10` |
| Aproxime-se de causas, acompanhe histórias reais e veja o apoio se transformar. | Descrição Open Graph e Twitter | Preview ao compartilhar o link | `index.html:21`, `index.html:32` |
| Coração TranquiliCare acolhido por duas mãos | Texto alternativo da imagem de compartilhamento | Acessibilidade do preview social | `index.html:27`, `index.html:36` |

---

## 4. Navegação global

### Cabeçalho desktop

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Sobre | Botão do menu superior | Sempre | Abrir a apresentação institucional | `src/components/Header.tsx` |
| Histórias | Botão principal do menu superior | Sempre | Navegação para o feed | `src/components/Header.tsx:70` |
| Perfil da ONG | Botão de conta no menu superior | Organização autenticada | Navegação para o perfil privado da ONG | `src/components/Header.tsx:79` |
| Meu perfil | Botão de conta no menu superior | Doador autenticado | Navegação para o perfil do doador | `src/components/Header.tsx:79` |
| Entrar | Botão azul do menu superior | Pessoa não autenticada | Entrada no fluxo de autenticação | `src/components/Header.tsx:92` |
| Sair | Nome acessível do botão com ícone de logout | Pessoa autenticada | Encerrar sessão | `src/components/Header.tsx:83` |

### Navegação móvel flutuante

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Home | Primeiro item da barra inferior | Sempre | Voltar à tela inicial | `src/components/mobileNavItems.tsx:29` |
| Histórias | Item central da barra inferior | Sempre | Abrir o feed de histórias | `src/components/mobileNavItems.tsx:36` |
| Perfil | Terceiro item da barra inferior | Pessoa autenticada | Abrir o perfil | `src/components/mobileNavItems.tsx:43` |
| Entrar | Terceiro item da barra inferior | Pessoa não autenticada | Abrir autenticação | `src/components/mobileNavItems.tsx:43` |

## 5. Conhecer a plataforma: página inicial para visitantes

### Abertura principal

| Copy atual | Onde aparece | Função | Fonte |
|---|---|---|---|
| ONGs verificadas com cuidado | Seletor animado acima do título principal | Introduzir confiança e abrir a experiência de verificação | `src/components/discovery/SealRolodex.tsx:27` |
| Encontre uma causa | Primeira linha do título principal | Proposta central | `src/components/LoggedOutHero.tsx:141` |
| que combina com você | Segunda linha azul do título principal | Personalização e proximidade | `src/components/LoggedOutHero.tsx:143` |
| Conheça as histórias por trás de cada causa, participe com confiança e acompanhe o que acontece depois. | Parágrafo abaixo do título | Explicar a experiência | `src/components/LoggedOutHero.tsx:147` |
| Explorar causas | Botão primário | Levar à seção de causas da mesma página | `src/components/LoggedOutHero.tsx:155` |
| Conhecer histórias | Botão secundário | Levar ao feed de histórias | `src/components/LoggedOutHero.tsx:164` |
| 100% da sua doação chega na ONG. | Link narrativo abaixo dos botões | Abrir a narrativa sobre integridade da doação | `src/components/LoggedOutHero.tsx:177` |

### Indicadores de impacto

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Impacto da comunidade agora | Cabeçalho do painel de métricas | Sempre | Contextualizar os números | `src/components/LoggedOutHero.tsx:216` |
| Atualizado em tempo real | Sinal verde sob o cabeçalho | Sempre | Reforçar atualidade | `src/components/LoggedOutHero.tsx:222` |
| Doado pela comunidade | Primeira métrica rotativa | Primeiro ciclo | Nome da métrica | `src/components/LoggedOutHero.tsx:62` |
| em apoios confirmados na plataforma | Detalhe da primeira métrica | Primeiro ciclo | Explicar o valor | `src/components/LoggedOutHero.tsx:64` |
| Apoios realizados | Segunda métrica rotativa | Segundo ciclo | Nome da métrica | `src/components/LoggedOutHero.tsx:70` |
| doação confirmada / doações confirmadas | Detalhe da segunda métrica | Conforme a quantidade | Flexão dinâmica | `src/components/LoggedOutHero.tsx:72` |
| Média de cada apoio | Terceira métrica rotativa | Terceiro ciclo | Nome da métrica | `src/components/LoggedOutHero.tsx:78` |
| calculada a partir das doações confirmadas | Detalhe da terceira métrica | Terceiro ciclo | Explicar o cálculo | `src/components/LoggedOutHero.tsx:80` |

---

## 6. Acompanhar impacto: página inicial autenticada

### Saudação

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Olá, {primeiro nome} | Título do dashboard | Nome disponível | Saudação personalizada | `src/components/ImpactDashboard.tsx:148` |
| Olá, bom dia! | Título do dashboard | Antes de 12h e sem nome | Saudação contextual | `src/components/ImpactDashboard.tsx:50` |
| Olá, boa tarde! | Título do dashboard | Entre 12h e 18h e sem nome | Saudação contextual | `src/components/ImpactDashboard.tsx:51` |
| Olá, boa noite! | Título do dashboard | Após 18h e sem nome | Saudação contextual | `src/components/ImpactDashboard.tsx:52` |

### Cartões de impacto

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Doado pela comunidade | Primeiro cartão | Sempre | Total coletivo | `src/components/ImpactDashboard.tsx:169` |
| Rumo a {valor} | Rodapé do primeiro cartão | Sempre | Próximo marco coletivo | `src/components/ImpactDashboard.tsx:176` |
| {n} doação confirmada / {n} doações confirmadas | Rodapé do primeiro cartão | Conforme quantidade | Volume coletivo | `src/components/ImpactDashboard.tsx:179` |
| Suas doações | Cartão azul | Doador autenticado | Total pessoal | `src/components/ImpactDashboard.tsx:212` |
| Próximo marco: {valor} | Rodapé do cartão azul | Doador autenticado | Próxima meta pessoal | `src/components/ImpactDashboard.tsx:218` |
| Recebido pela sua ONG | Cartão amarelo | Organização autenticada | Total recebido | `src/components/ImpactDashboard.tsx:238` |
| Próxima meta: {valor} | Rodapé do cartão amarelo | ONG com recebimentos | Próximo marco | `src/components/ImpactDashboard.tsx:248` |
| Compartilhe sua página para receber apoios | Rodapé do cartão amarelo | ONG sem recebimentos | Orientação inicial | `src/components/ImpactDashboard.tsx:250` |
| ONGs verificadas | Cartão escuro | Sempre | Quantidade de organizações verificadas | `src/components/ImpactDashboard.tsx:269` |
| prontas para receber seu apoio | Rodapé do cartão escuro | Sempre | Explicar o número | `src/components/ImpactDashboard.tsx:271` |

---

## 7. Descobrir causas e organizações

### Cabeçalho e busca

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Descubra causas que combinam com você | Título da seção de causas | Sempre | Introdução à descoberta | `src/components/Marketplace.tsx:247` |
| Explore organizações, salve suas causas favoritas e acompanhe novas histórias. | Parágrafo do cabeçalho | Apenas na versão de página completa | Explicar as ações disponíveis | `src/components/Marketplace.tsx:251` |
| Busque uma causa... | Primeiro placeholder rotativo | Campo vazio | Sugestão de busca | `src/components/Marketplace.tsx:16` |
| Uma ONG... | Segundo placeholder rotativo | Campo vazio | Sugestão de busca | `src/components/Marketplace.tsx:17` |
| Algo perto de você... | Terceiro placeholder rotativo | Campo vazio | Sugestão de busca | `src/components/Marketplace.tsx:18` |
| Saúde mental... | Quarto placeholder rotativo | Campo vazio | Sugestão de busca | `src/components/Marketplace.tsx:19` |
| Educação... | Quinto placeholder rotativo | Campo vazio | Sugestão de busca | `src/components/Marketplace.tsx:20` |

### Categorias e seções

| Copy atual | Onde aparece | Função | Fonte |
|---|---|---|---|
| Todas | Primeiro filtro de categoria | Mostrar todas as causas | `src/components/Marketplace.tsx:208` |
| Educação | Filtro, formulário da ONG e selo | Categoria | `src/data/ngoCategories.ts:27` |
| Saúde | Filtro, formulário da ONG e selo | Categoria | `src/data/ngoCategories.ts:42` |
| Saúde Mental | Filtro, formulário da ONG e selo | Categoria | `src/data/ngoCategories.ts:57` |
| Social | Filtro, formulário da ONG e selo | Categoria | `src/data/ngoCategories.ts:72` |
| Pets | Filtro, formulário da ONG e selo | Categoria | `src/data/ngoCategories.ts:87` |
| Meio Ambiente | Filtro, formulário da ONG e selo | Categoria | `src/data/ngoCategories.ts:102` |
| Outros | Formulário da ONG e agrupamento residual | Categoria de fallback | `src/data/ngoCategories.ts:118` |
| Causas para conhecer | Título do carrossel de verificadas | Apresentar causas recomendadas | `src/components/Marketplace.tsx:180` |
| Novas histórias por aqui | Título do carrossel de publicações recentes | Mostrar atualizações mais novas | `src/components/Marketplace.tsx:191` |
| Onde o futuro começa | Título da seção Educação | Destacar a categoria pela sua promessa editorial | `src/data/ngoCategories.ts:30` |
| Cuidado que chega a quem precisa | Título da seção Saúde | Destacar a categoria pela sua promessa editorial | `src/data/ngoCategories.ts:45` |
| Para ninguém enfrentar tudo sozinho | Título da seção Saúde Mental | Destacar a categoria pela sua promessa editorial | `src/data/ngoCategories.ts:60` |
| Mudanças que começam perto | Título da seção Social | Destacar a categoria pela sua promessa editorial | `src/data/ngoCategories.ts:75` |
| Para quem alegra nossos dias | Título da seção Pets | Destacar a categoria pela sua promessa editorial | `src/data/ngoCategories.ts:90` |
| Cuidar do lugar que todos chamamos de casa | Título da seção Meio Ambiente | Destacar a categoria pela sua promessa editorial | `src/data/ngoCategories.ts:105` |
| Outras causas para abraçar | Título de fallback | Agrupar outras categorias | `src/data/ngoCategories.ts:162` |
| Mais causas para conhecer | Título do grid residual | Mostrar organizações fora dos carrosséis | `src/components/Marketplace.tsx:388` |
| {n} história publicada / {n} histórias publicadas | Rodapé do cartão editorial | Há histórias | Dar contexto narrativo | `src/components/marketplace/CauseShowcaseCard.tsx:73` |

### Vaquinhas

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Vaquinhas | Título da seção | Há campanhas ativas | Nome do formato | `src/components/Marketplace.tsx:351` |
| Campanhas com um objetivo e um tempo para acontecer. | Subtítulo da seção | Há campanhas | Explicar o formato | `src/components/Marketplace.tsx:353` |
| Encerrada | Contador da campanha | Prazo finalizado | Estado | `src/components/Marketplace.tsx:127` |
| Faltam {n} dia / Faltam {n} dias | Contador da campanha | Prazo acima de 24h | Urgência | `src/components/Marketplace.tsx:129` |
| Faltam {h}h {m}m / Faltam {m}m | Contador da campanha | Prazo abaixo de 24h | Urgência | `src/components/Marketplace.tsx:131` |
| Por {organização} | Abaixo do nome da campanha | Sempre | Autoria | `src/components/Marketplace.tsx:164` |
| {valor arrecadado} de {meta} | Abaixo da barra de progresso | Sempre | Progresso financeiro | `src/components/Marketplace.tsx:174` |
| Conhecer a campanha | Link no fim do cartão | Sempre | Abrir detalhes | `src/components/Marketplace.tsx:122` |
| Inverno Acolhedor | Nome da campanha simulada | Dados de demonstração | Conteúdo | `src/data/flashCampaigns.ts:31` |
| Ajude a preparar 40 kits de inverno até 30 de julho. | Descrição da campanha simulada | Dados de demonstração | Objetivo | `src/data/flashCampaigns.ts:35` |

### Estado vazio

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Não encontramos nenhuma causa por aqui. | Centro da área de resultados | Busca ou categoria sem resultados | Estado vazio | `src/components/Marketplace.tsx:230` |
| Tente outro termo ou explore uma categoria. | Abaixo do estado vazio | Sem resultados | Orientar recuperação | `src/components/Marketplace.tsx:232` |

---

## 8. Configurar e administrar uma organização

### Primeira configuração

| Copy atual | Onde aparece | Função | Fonte |
|---|---|---|---|
| Área da organização | Cabeçalho superior | Identificar área privada | `src/pages/NGOAccountProfile.tsx:437` |
| Primeira configuração | Etiqueta acima do título | Identificar onboarding | `src/pages/NGOAccountProfile.tsx:449` |
| Complete o perfil da organização | Título principal | Explicar a tarefa | `src/pages/NGOAccountProfile.tsx:450` |
| Essas informações formarão o perfil que as pessoas encontrarão ao conhecer sua causa. | Parágrafo de apoio | Explicar o uso dos dados | `src/pages/NGOAccountProfile.tsx:451` |
| Adicionar imagem | Botão do avatar | Inserir foto institucional | `src/pages/NGOAccountProfile.tsx:462` |
| Opcional. JPG ou PNG em formato quadrado. | Nota sob o botão | Explicar formato e opcionalidade | `src/pages/NGOAccountProfile.tsx:464` |
| Salvar e visualizar perfil | CTA final | Salvar e abrir o perfil | `src/pages/NGOAccountProfile.tsx:469` |
| Salvando... | CTA final | Salvamento em andamento | Feedback | `src/pages/NGOAccountProfile.tsx:469` |

### Campos institucionais

| Campo | Placeholder ou orientação | Onde aparece | Regra atual | Fonte |
|---|---|---|---|---|
| Nome da organização | Sem placeholder adicional | Primeira coluna | Obrigatório | `src/pages/NGOAccountProfile.tsx:121` |
| Categoria principal | Selecione uma categoria | Segunda coluna | Obrigatório | `src/pages/NGOAccountProfile.tsx:139`, `src/components/ui/category-disclosure.tsx:34` |
| CNPJ | 00.000.000/0000-00 | Primeira coluna | Obrigatório e validado | `src/pages/NGOAccountProfile.tsx:154` |
| Endereço | Rua, número, bairro, cidade e estado | Segunda coluna | Obrigatório, mínimo contextual | `src/pages/NGOAccountProfile.tsx:176` |
| Sobre a organização | Conte o que a organização faz e quem ela atende. | Largura total | Obrigatório | `src/pages/NGOAccountProfile.tsx:195` |
| Objetivo atual | Descreva a meta ou necessidade mais importante neste momento. | Largura total | Obrigatório | `src/pages/NGOAccountProfile.tsx:213` |
| Outros objetivos | Adicionar objetivo / Descreva outro resultado que a organização quer alcançar. | Largura total, lista editável | Opcional; cada item pode ser removido | `src/pages/NGOAccountProfile.tsx` |
| Vídeo da causa no YouTube | https://www.youtube.com/watch?v=... | Largura total | Opcional, mas exige link válido do YouTube | `src/pages/NGOAccountProfile.tsx` |
| Imagem de capa | https://... | Largura total | Opcional, mas exige URL válida | `src/pages/NGOAccountProfile.tsx` |
| Instagram | @suaorganizacao | Primeira coluna | Opcional, mas validado se preenchido | `src/pages/NGOAccountProfile.tsx:232` |
| Telefone | (00) 00000-0000 | Segunda coluna | Opcional, mas validado se preenchido | `src/pages/NGOAccountProfile.tsx:253` |

### Edição

| Copy atual | Onde aparece | Quando aparece | Fonte |
|---|---|---|---|
| Editar perfil | Título do modal e botão no perfil | Perfil já salvo | `src/pages/NGOAccountProfile.tsx:483` |
| Trocar imagem | Botão no modal | Edição aberta | `src/pages/NGOAccountProfile.tsx:485` |
| Salvar alterações | Botão final | Há edição | `src/pages/NGOAccountProfile.tsx:487` |
| Perfil da organização atualizado. | Toast | Salvamento concluído | `src/pages/NGOAccountProfile.tsx:409` |
| Não foi possível salvar o perfil. | Toast | Falha no salvamento | `src/pages/NGOAccountProfile.tsx:411` |
| Não foi possível processar essa imagem. | Toast | Arquivo inválido | `src/pages/NGOAccountProfile.tsx:359` |

---

## 9. Perfil público e privado da organização

### Cabeçalho do perfil

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Perfil da organização | Etiqueta superior | A própria ONG visualiza | Identificar modo proprietário | `src/components/NGOProfile.tsx:217` |
| {categoria} · {localização} | Metadado acima do nome | Endereço disponível | Situar a causa sem inventar localização | `src/components/NGOProfile.tsx:218` |
| Editar perfil | CTA principal | Modo proprietário | Abrir edição | `src/components/NGOProfile.tsx:236` |
| Apoiar esta causa | CTA principal | Público | Abrir doação | `src/components/NGOProfile.tsx:236` |
| Falar com a organização | CTA secundário | Sempre | Abrir canais | `src/components/NGOProfile.tsx:237` |
| Ver no mapa | CTA secundário | Endereço disponível | Abrir mapa incorporado | `src/components/ui/view-on-map.tsx:45` |
| Abrir no Maps | Link dentro do mapa | Mapa aberto | Abrir Google Maps | `src/components/ui/view-on-map.tsx:81` |

### Navegação

| Copy atual | Onde aparece | Função | Fonte |
|---|---|---|---|
| A Causa | Primeira aba e estado inicial | Explicar por que a causa existe | `src/components/NGOProfile.tsx:121` |
| Histórias | Segunda aba | Mostrar como o trabalho acontece | `src/components/NGOProfile.tsx:122` |
| Impacto | Terceira aba | Mostrar resultados reais compartilhados | `src/components/NGOProfile.tsx:123` |

### Aba A Causa

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Assistir | Ação sobre o preview pequeno | A organização possui vídeo da causa | Expandir o player | `src/components/ui/expandable-video-player.tsx` |
| Assistir ao vídeo da causa {nome} | Nome acessível do preview | A organização possui vídeo da causa | Identificar a ação e sua organização | `src/components/ngo-profile/NGOProfileTabs.tsx` |
| A causa de {nome} em movimento | Nome acessível do player expandido | Player aberto | Contextualizar o vídeo exibido | `src/components/ngo-profile/NGOProfileTabs.tsx` |
| Fechar vídeo | Nome acessível do fundo e do botão de fechar | Player aberto | Encerrar o player | `src/components/ui/expandable-video-player.tsx` |
| Objetivo atual | Rótulo da única linha de objetivo | Sempre | Identificar a prioridade atual | `src/components/ngo-profile/NGOProfileTabs.tsx` |
| Conhecer o objetivo da causa | Nome acessível da linha de objetivo | Sempre | Abrir o objetivo completo | `src/components/ngo-profile/NGOProfileTabs.tsx` |
| Próximos objetivos | Etiqueta sobre a lista de objetivos adicionais | Há objetivos cadastrados | Mostrar o que a organização pretende alcançar depois | `src/components/ngo-profile/NGOProfileTabs.tsx` |

### Aba Histórias e estado vazio

| Copy atual | Onde aparece | Quando aparece | Fonte |
|---|---|---|---|
| HISTÓRIAS | Eyebrow | Sempre | `src/components/ngo-profile/NGOProfileTabs.tsx:105` |
| Veja nossa causa em movimento | Título | Sempre | `src/components/ngo-profile/NGOProfileTabs.tsx` |
| {n} história publicada / {n} histórias publicadas | Contagem discreta | Há histórias | `src/components/ngo-profile/NGOProfileTabs.tsx:109` |
| Uma nova história foi compartilhada pela organização. | Legenda de fallback | História sem legenda | `src/components/ngo-profile/NGOProfileTabs.tsx:117` |
| Esta causa ainda não compartilhou uma história por aqui. | Estado vazio | Visita pública | `src/components/ngo-profile/NGOProfileTabs.tsx:131` |
| Sua primeira história começa aqui. | Estado vazio | A própria ONG visualiza | `src/components/ngo-profile/NGOProfileTabs.tsx:131` |
| Compartilhe o que está acontecendo na sua causa e ajude mais pessoas a conhecerem o seu trabalho. | Estado vazio | A própria ONG visualiza | `src/components/ngo-profile/NGOProfileTabs.tsx:132` |

### Aba Impacto

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| IMPACTO | Eyebrow | Sempre | Enquadrar resultados | `src/components/ngo-profile/NGOProfileTabs.tsx:149` |
| Onde essa história já chegou | Título | Sempre | Introduzir os resultados já alcançados | `src/components/ngo-profile/NGOProfileTabs.tsx` |
| Resultado informado | Tipo de métrica | Métrica direta | Diferenciar mensuração | `src/components/ngo-profile/NGOProfileTabs.tsx:40` |
| Estimativa compartilhada | Tipo de métrica | Métrica estimada | Evitar afirmar causalidade | `src/components/ngo-profile/NGOProfileTabs.tsx:41` |
| Resultado coletivo | Tipo de métrica | Métrica coletiva | Contextualizar construção conjunta | `src/components/ngo-profile/NGOProfileTabs.tsx:42` |
| Impacto construído em comunidade | Bloco coletivo | Há métrica coletiva | Contextualizar resultados compartilhados | `src/components/ngo-profile/NGOProfileTabs.tsx:161` |
| Resultados construídos pela organização com o apoio das pessoas que escolheram estar perto desta causa. | Texto coletivo | Há métrica coletiva | Explicar participação | `src/components/ngo-profile/NGOProfileTabs.tsx:162` |
| Última atualização: {mês e ano} | Rodapé de métricas | Há data válida | Dar transparência temporal | `src/components/ngo-profile/NGOProfileTabs.tsx:165` |
| Esta organização ainda não compartilhou seus resultados por aqui. | Estado vazio | Sem métricas | Tratar ausência sem inventar números | `src/components/ngo-profile/NGOProfileTabs.tsx` |
| Quando novos números forem publicados, você poderá acompanhá-los aqui. | Estado vazio | Sem métricas | Explicar o próximo estado possível | `src/components/ngo-profile/NGOProfileTabs.tsx` |

### Modais

| Copy atual | Onde aparece | Função | Fonte |
|---|---|---|---|
| O que queremos tornar possível | Título do modal de objetivo | Exibir o objetivo completo com a cor da categoria | `src/components/NGOProfile.tsx:159` |
| Falar com a organização | Título do modal de contato | Agrupar canais | `src/components/NGOProfile.tsx:169` |
| Apoiar {nome da ONG} | Título do modal de doação | Contextualizar apoio | `src/components/NGOProfile.tsx:180` |

---

## 10. Perfil do doador

### Abertura e edição

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Sua conta está pronta, {primeiro nome}. | Aviso superior | Primeiro acesso | Confirmar criação | `src/pages/DonorProfile.tsx:230` |
| Personalize sua foto, apresentação e as causas que quer acompanhar. | Aviso superior | Primeiro acesso | Apresentar as possibilidades de personalização | `src/pages/DonorProfile.tsx` |
| Perfil do doador | Etiqueta acima do nome | Sempre | Identificar tela | `src/pages/DonorProfile.tsx:250` |
| Bem-vindo(a) | Nome de fallback | Nome vazio | Acolhimento | `src/pages/DonorProfile.tsx:251` |
| {n} apoios realizados | Resumo abaixo do e-mail | Sempre | Volume de apoio | `src/pages/DonorProfile.tsx:254` |
| {n} causas apoiadas | Resumo abaixo do e-mail | Sempre | Diversidade de apoio | `src/pages/DonorProfile.tsx:255` |
| Editar perfil / Editar | Botão superior | Desktop / celular | Abrir edição | `src/pages/DonorProfile.tsx:216` |
| Nome / E-mail | Campos de edição | Edição aberta | Dados pessoais | `src/pages/DonorProfile.tsx` |
| Sobre você | Conte um pouco sobre você e sua relação com as causas que acompanha. | Edição aberta | Personalizar a apresentação | `src/pages/DonorProfile.tsx` |
| Localização | Cidade e estado | Edição aberta | Situar o perfil | `src/pages/DonorProfile.tsx` |
| Instagram | @seuperfil | Edição aberta | Adicionar contato opcional | `src/pages/DonorProfile.tsx` |
| Telefone | (00) 00000-0000 | Edição aberta | Adicionar contato opcional | `src/pages/DonorProfile.tsx` |
| Imagem de capa | https://... | Edição aberta | Personalizar a abertura do perfil | `src/pages/DonorProfile.tsx` |
| Causas de interesse | Botões com as categorias de causas | Edição aberta | Selecionar e remover interesses | `src/pages/DonorProfile.tsx` |
| Salvar / Salvo | Botão do formulário | Conforme alteração | Persistência | `src/pages/DonorProfile.tsx:269` |
| Perfil atualizado! | Toast | Salvamento concluído | Confirmação | `src/pages/DonorProfile.tsx:178` |

### Impacto e conquistas

| Copy atual | Onde aparece | Função | Fonte |
|---|---|---|---|
| Seu impacto | Etiqueta | Introduzir números | `src/pages/DonorProfile.tsx:279` |
| Estatísticas | Título | Agrupar métricas | `src/pages/DonorProfile.tsx:279` |
| Fazer uma doação | Link | Voltar às causas | `src/pages/DonorProfile.tsx:279` |
| Total doado | Cartão 1 | Soma pessoal | `src/pages/DonorProfile.tsx:281` |
| A soma das contribuições que você destinou às causas acompanhadas. | Detalhe do cartão 1 | Explicação | `src/pages/DonorProfile.tsx:281` |
| Doações | Cartão 2 | Contagem | `src/pages/DonorProfile.tsx:282` |
| Cada apoio registrado no seu histórico de impacto. | Detalhe do cartão 2 | Explicação | `src/pages/DonorProfile.tsx:282` |
| Sequência | Cartão 3 | Frequência | `src/pages/DonorProfile.tsx:283` |
| Dias consecutivos em que sua intenção se transformou em apoio. | Detalhe do cartão 3 | Explicação | `src/pages/DonorProfile.tsx:283` |
| Créditos | Cartão 4 | Carteira | `src/pages/DonorProfile.tsx:284` |
| Créditos disponíveis na sua carteira TranquiliCare. | Detalhe do cartão 4 | Explicação | `src/pages/DonorProfile.tsx:284` |
| Conquistas | Título da seção | Gamificação | `src/pages/DonorProfile.tsx:289` |
| Primeiro impacto / Faça sua primeira doação | Conquista 1 | Primeiro apoio | `src/pages/DonorProfile.tsx:198` |
| Chama solidária / Doe em 3 dias consecutivos | Conquista 2 | Frequência | `src/pages/DonorProfile.tsx:199` |
| Apoiador constante / Complete 10 doações | Conquista 3 | Recorrência | `src/pages/DonorProfile.tsx:200` |

### Atividade e semana

| Copy atual | Onde aparece | Quando aparece | Fonte |
|---|---|---|---|
| Atividade recente | Título | Sempre | `src/pages/DonorProfile.tsx:307` |
| Causa apoiada | Nome de fallback | ONG não localizada | `src/pages/DonorProfile.tsx:311` |
| Seu primeiro apoio começa aqui | Estado vazio | Sem doações | `src/pages/DonorProfile.tsx:312` |
| Explorar causas | Ação do estado vazio | Sem doações | `src/pages/DonorProfile.tsx:312` |
| Sua semana | Título lateral | Sempre | `src/pages/DonorProfile.tsx:319` |
| {valor} apoiados nos últimos 7 dias. | Resumo semanal | Houve doação na semana | `src/pages/DonorProfile.tsx:324` |
| Uma nova doação inicia sua sequência. | Resumo semanal | Semana vazia | `src/pages/DonorProfile.tsx:324` |
| Causas apoiadas | Título lateral | Sempre | `src/pages/DonorProfile.tsx:329` |
| As organizações que você apoiar aparecerão aqui. | Estado vazio lateral | Nenhuma causa | `src/pages/DonorProfile.tsx:331` |

---

## 11. Doação, pagamento e agradecimento

### Escolha de valor

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Quanto você quer fazer chegar à {nome da ONG}? | Acima e dentro do seletor | Modal de doação | Conectar o valor à causa escolhida | `src/components/NGOProfile.tsx` |
| Sua doação para {nome da ONG} | Primeira linha do resumo | Sempre | Nomear o valor da doação | `src/components/NGOProfile.tsx` |
| A definir | Valor da primeira linha | Antes da escolha | Estado vazio | `src/components/NGOProfile.tsx` |
| Serviço TranquiliCare (5%) | Segunda linha | Sempre | Informar o valor do serviço da plataforma | `src/components/NGOProfile.tsx` |
| Total | Terceira linha | Sempre | Valor final | `src/components/NGOProfile.tsx` |
| A sua intenção chega inteira. | Nota abaixo do resumo | Sempre | Reforçar a integridade da doação | `src/components/NGOProfile.tsx` |
| Escolha um valor | CTA | Nenhum valor | Orientação | `src/components/NGOProfile.tsx` |
| Continuar | CTA | Valor válido | Iniciar o pagamento | `src/components/NGOProfile.tsx` |
| Preparando seu PIX... | CTA | PIX em criação | Informar processamento sem sugerir que o pagamento já foi concluído | `src/components/NGOProfile.tsx` |

### PIX e abertura do QR Code

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Seu PIX está pronto. | Título da etapa | PIX gerado e QR Code recolhido | Comunicar que os dados de pagamento estão disponíveis | `src/components/NGOProfile.tsx` |
| Abra o QR Code ou copie o código para concluir o pagamento pelo seu banco. | Texto de orientação | Antes da abertura do QR Code | Explicar a próxima ação sem expor o payload | `src/components/NGOProfile.tsx` |
| Só Abrir QR | CTA principal | QR Code recolhido | Revelar o QR Code e as ações de pagamento | `src/components/NGOProfile.tsx`, `src/components/ui/pix-qr-disclosure.tsx` |
| Pague pelo app do seu banco | Título da etapa | QR Code aberto | Orientar a conclusão no banco escolhido | `src/components/NGOProfile.tsx` |
| Escaneie o QR Code ou copie o código PIX. | Texto de orientação | QR Code aberto | Apresentar as duas formas de pagamento | `src/components/NGOProfile.tsx` |
| Copiar código PIX | Botão abaixo do QR Code | QR Code aberto | Copiar o PIX Copia e Cola sem mostrá-lo na interface | `src/components/ui/pix-qr-disclosure.tsx` |
| A doação será confirmada assim que o pagamento for identificado. | Nota abaixo do componente PIX | PIX gerado | Explicar que gerar o PIX não equivale a confirmar o pagamento | `src/components/NGOProfile.tsx` |
| Pagamento concluído | CTA após o QR Code | QR Code aberto | Iniciar a espera pela confirmação do backend | `src/components/NGOProfile.tsx` |
| Alterar valor | Ação abaixo do componente PIX | PIX gerado | Voltar à escolha de valor | `src/components/NGOProfile.tsx` |
| Copiado | Mesmo botão | Cópia concluída | Dar retorno imediato da ação | `src/components/ui/pix-qr-disclosure.tsx` |
| Código PIX copiado. | Toast | Cópia concluída | Confirmar a cópia fora do componente | `src/components/NGOProfile.tsx` |
| Não foi possível copiar o código PIX. | Toast | Falha ao acessar a área de transferência | Orientar implicitamente uma nova tentativa | `src/components/NGOProfile.tsx` |

### Identificação do pagamento

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| Confirmando seu pagamento... | Título do estado de espera | Após “Pagamento concluído” | Informar que o pagamento ainda não foi confirmado | `src/components/NGOProfile.tsx` |
| Assim que o PIX for identificado, sua doação será confirmada automaticamente. | Texto do estado de espera | Confirmação pendente | Explicar a atualização automática pelo backend | `src/components/NGOProfile.tsx` |
| Pagamento identificado | Título do estado de sucesso | Pagamento confirmado pelo provedor | Comunicar o reconhecimento antes da celebração final | `src/components/NGOProfile.tsx` |
| Seu apoio foi confirmado com segurança. | Texto do estado de sucesso | Durante o check animado | Reforçar a confirmação segura | `src/components/NGOProfile.tsx` |
| Ainda não identificamos o pagamento. Aguarde alguns instantes e tente novamente. | Toast | Tempo de espera esgotado ou falha de consulta | Permitir nova tentativa sem criar um falso sucesso | `src/components/NGOProfile.tsx` |
### Confirmação

| Copy atual | Onde aparece | Quando aparece | Função | Fonte |
|---|---|---|---|---|
| TranquiliCare | Cabeçalho do modal | Sempre | Marca | `src/components/DonationThankYouDialog.tsx:147` |
| Apoio confirmado | Cabeçalho e trilha de status | Pagamento confirmado | Estado | `src/components/DonationThankYouDialog.tsx:150`, `src/components/DonationThankYouDialog.tsx:229` |
| Você destinou | Acima do valor | Sempre | Introduzir quantia | `src/components/DonationThankYouDialog.tsx:198` |
| para {nome da ONG} | Abaixo do valor | Sempre | Destino | `src/components/DonationThankYouDialog.tsx:202` |
| Parabéns por transformar intenção em apoio. | Título principal | Sempre | Celebração | `src/components/DonationThankYouDialog.tsx:214` |
| Obrigado por escolher estar ao lado desta causa. Sua doação já foi confirmada e seguirá para a organização. | Descrição | Sempre | Confirmação e gratidão | `src/components/DonationThankYouDialog.tsx:217` |
| Impacto compartilhado | Segundo passo visual | Sempre | Continuidade | `src/components/DonationThankYouDialog.tsx:234` |
| Continue acompanhando esta jornada | Bloco azul | Pessoa sem conta | Convite ao cadastro | `src/components/DonationThankYouDialog.tsx:250` |
| Sua doação foi concluída. Sem uma conta, você não poderá medir seu impacto com precisão nem receber atualizações sobre a jornada deste apoio. | Bloco azul | Pessoa sem conta | Explicar benefício da conta | `src/components/DonationThankYouDialog.tsx:252` |
| Criar minha conta | CTA do bloco azul | Pessoa sem conta | Cadastro | `src/components/DonationThankYouDialog.tsx:262` |
| Em breve, a própria organização poderá mostrar como esse apoio se transformou em impacto real no mundo. | Rodapé do modal | Sempre | Preparar expectativa | `src/components/DonationThankYouDialog.tsx:274` |

### Compartilhamento da confirmação

| Copy atual | Onde aparece | Quando aparece | Fonte |
|---|---|---|---|
| Compartilhar como imagem | Botão com câmera | Modal de agradecimento | `src/components/ShareCameraButton.tsx:83` |
| Preparando... | Texto do botão | Captura em andamento | `src/components/ShareCameraButton.tsx:146` |
| Apoiei {nome da ONG} pela TranquiliCare | Título nativo de compartilhamento | Compartilhamento suportado | `src/components/DonationThankYouDialog.tsx:279` |
| Meu apoio de {valor} para {nome da ONG} foi confirmado. | Texto nativo de compartilhamento | Compartilhamento suportado | `src/components/DonationThankYouDialog.tsx:280` |
| Imagem criada. Agora você pode compartilhá-la onde quiser. | Toast | Download alternativo concluído | `src/components/ShareCameraButton.tsx:69` |
| Não foi possível criar a imagem para compartilhar. | Toast | Falha na captura | `src/components/ShareCameraButton.tsx:73` |

### Carteira

| Copy atual | Onde aparece | Função | Fonte |
|---|---|---|---|
| Saldo disponível | Cabeçalho | Identificar créditos | `src/components/WalletCard.tsx:21` |
| {n} créditos | Cabeçalho | Mostrar saldo | `src/components/WalletCard.tsx:21` |
| Abrir carteira / Fechar carteira | Ação acessível | Expandir ou recolher | `src/components/WalletCard.tsx:23` |
| Forma de pagamento | Painel expandido | Identificar a seção | `src/components/WalletCard.tsx:33` |
| Pagamento protegido | Selo da forma de pagamento | Reforçar segurança sem expor o gateway | `src/components/WalletCard.tsx:33` |
| Checkout seguro | Linha de segurança | Reforçar proteção | `src/components/WalletCard.tsx:36` |
| Nenhum dado de cartão fica salvo no app. | Linha de segurança | Explicar privacidade | `src/components/WalletCard.tsx:36` |
| Adicionar créditos | Seletor e botão | Recarregar | `src/components/WalletCard.tsx:42` |
| A recarga de {n} créditos será liberada após a implantação do ledger seguro. | Toast | Tentativa de recarga | Estado futuro | `src/pages/DonorProfile.tsx:335` |

---

## 12. Narrativa: integridade da doação

Esta é a experiência aberta pelo texto “100% da sua doação chega na ONG.” na página inicial. A ordem abaixo acompanha a rolagem.

| Ordem | Copy atual | Onde aparece | Fonte |
|---|---|---|---|
| 1 | Antes de uma doação | Etiqueta da abertura | `src/pages/DonationIntegrityDiscovery.tsx:230` |
| 2 | Você escolhe quanto vai ser a sua ajuda | Título da abertura | `src/pages/DonationIntegrityDiscovery.tsx:232` |
| 3 | Você encontra uma causa. | Primeira linha da introdução | `src/pages/DonationIntegrityDiscovery.tsx:191` |
| 4 | Ela faz sentido para você. | Segunda linha | `src/pages/DonationIntegrityDiscovery.tsx:192` |
| 5 | Você decide ajudar. | Terceira linha | `src/pages/DonationIntegrityDiscovery.tsx:193` |
| 6 | Não importa o valor, importa sua intenção em fazer parte. | Fechamento da introdução | `src/pages/DonationIntegrityDiscovery.tsx:195` |
| 7 | A escolha | Título acessível do seletor | `src/pages/DonationIntegrityDiscovery.tsx:255` |
| 8 | E você escolhe ajudar com | Texto acima do seletor de valor | `src/pages/DonationIntegrityDiscovery.tsx:261` |
| 9 | Escolha ou digite um valor para continuar a história. | Texto abaixo do seletor | `src/pages/DonationIntegrityDiscovery.tsx:270` |
| 10 | Interesseiros | Primeiro cartão de atrito | `src/components/discovery/DonationFrictionCards.tsx:4` |
| 11 | Taxas | Segundo cartão de atrito | `src/components/discovery/DonationFrictionCards.tsx:4` |
| 12 | Custos | Terceiro cartão de atrito | `src/components/discovery/DonationFrictionCards.tsx:4` |
| 13 | No fim, a história que você decidiu apoiar pode receber menos do que você imaginava. | Painel escuro | `src/pages/DonationIntegrityDiscovery.tsx:41` |
| 14 | Você escolheu quanto queria fazer parte. | Painel amarelo | `src/pages/DonationIntegrityDiscovery.tsx:46` |
| 15 | Mas talvez... | Painel de transição | `src/pages/DonationIntegrityDiscovery.tsx:51` |
| 16 | Você também devesse poder escolher quanto realmente chega. | Ênfase do painel | `src/pages/DonationIntegrityDiscovery.tsx:55` |
| 17 | O caminho | Título da seção seguinte | `src/pages/DonationIntegrityDiscovery.tsx:318` |
| 18 | E nem sempre esse caminho é visível. | Cena do caminho longo | `src/components/discovery/DonationLongRoadScene.tsx:85` |
| 19 | O longo caminho entre a intenção e a organização. | Texto acessível da cena | `src/components/discovery/DonationLongRoadScene.tsx:97` |
| 20 | E nós repetimos | Chamada antes da frase animada | `src/pages/DonationIntegrityDiscovery.tsx:328` |
| 21 | A sua intenção não deveria perder força pelo caminho | Frase animada | `src/pages/DonationIntegrityDiscovery.tsx:331`, `src/pages/DonationIntegrityDiscovery.tsx:342` |
| 22 | Foi por isso que pensamos a experiência de doação de outra forma | Transição para a resolução | `src/pages/DonationIntegrityDiscovery.tsx:358` |
| 23 | Quando você escolhe um valor para uma causa no TranquiliCare, acreditamos que esse mesmo valor deve chegar à organização. | Bloco de resolução 1 | `src/pages/DonationIntegrityDiscovery.tsx:65` |
| 24 | Não porque 100% é um número bonito e gostoso de falar. | Bloco de resolução 2 | `src/pages/DonationIntegrityDiscovery.tsx:69` |
| 25 | Mas porque a sua intenção merece chegar inteira. | Bloco de resolução 3 | `src/pages/DonationIntegrityDiscovery.tsx:73` |
| 26 | Porque acreditamos que doar não é apenas transferir dinheiro. | Bloco de resolução 4 | `src/pages/DonationIntegrityDiscovery.tsx:77` |
| 27 | É transformar intenção em impacto. | Bloco final enfatizado | `src/pages/DonationIntegrityDiscovery.tsx:82` |
| 28 | Da sua intenção até a causa, nada deveria se perder pelo caminho | Fechamento | `src/pages/DonationIntegrityDiscovery.tsx:401` |
| 29 | 100% da sua doação chega na ONG | Título acessível do fechamento | `src/pages/DonationIntegrityDiscovery.tsx:407` |

---

## 13. Narrativa: verificação das ONGs

Esta é a experiência aberta pelo seletor “ONGs verificadas com cuidado” e pelos selos de categoria.

| Ordem | Copy atual | Onde aparece | Fonte |
|---|---|---|---|
| 1 | Antes de uma doação | Etiqueta da abertura | `src/pages/VerificationDiscovery.tsx:208` |
| 2 | Posso confiar? | Pergunta principal | `src/pages/VerificationDiscovery.tsx:218` |
| 3 | Você finalmente encontra uma causa. | Introdução, linha 1 | `src/pages/VerificationDiscovery.tsx:85` |
| 4 | Ela faz muito sentido para você. | Introdução, linha 2 | `src/pages/VerificationDiscovery.tsx:86` |
| 5 | E você decide conhecer melhor o trabalho daquela organização. | Introdução, linha 3 | `src/pages/VerificationDiscovery.tsx:87` |
| 6 | Abre o site, vê as redes sociais e procura outras informações. | Introdução, linha 4 | `src/pages/VerificationDiscovery.tsx:88` |
| 7 | Mas, quanto mais procura... | Introdução, linha 5 | `src/pages/VerificationDiscovery.tsx:89` |
| 8 | Mais dúvidas aparecem. | Introdução, linha 6 | `src/pages/VerificationDiscovery.tsx:90` |
| 9 | Você continua procurando respostas. | Painel 1 | `src/pages/VerificationDiscovery.tsx:41` |
| 10 | Tentando entender quem está por trás da organização. | Painel 1 | `src/pages/VerificationDiscovery.tsx:43` |
| 11 | Mas saber que uma organização existe não é sinônimo dela ser confiável. | Painel 2 | `src/pages/VerificationDiscovery.tsx:50` |
| 12 | E aqui que se encontra um grande cemitério de oportunidades de fazer o bem. | Painel 3 | `src/pages/VerificationDiscovery.tsx:55` |
| 13 | Não porque deixaram de acreditar na causa. | Painel 4 | `src/pages/VerificationDiscovery.tsx:60` |
| 14 | Mas porque ninguém gosta de agir com dúvida. | Painel 5 | `src/pages/VerificationDiscovery.tsx:65` |
| 15 | Você não deveria precisar ter essa pergunta na cabeça. | Painel 6 | `src/pages/VerificationDiscovery.tsx:70` |
| 16 | Porque talvez... | Painel 7 | `src/pages/VerificationDiscovery.tsx:75` |
| 17 | Você esteja fazendo um trabalho que nunca deveria ser seu. | Painel 8 | `src/pages/VerificationDiscovery.tsx:80` |
| 18 | Quando confiar vira uma investigação | Título do ato horizontal | `src/components/discovery/NarrativeHorizontalAct.tsx:63` |
| 19 | não deveria começar assim | Transição | `src/pages/VerificationDiscovery.tsx:265` |
| 20 | Alguém precisava fazer esse trabalho antes | Transição | `src/pages/VerificationDiscovery.tsx:287` |
| 21 | Um processo antes de um símbolo | Título do processo visual | `src/components/discovery/VerificationVisuals.tsx:52` |
| 22 | Identificação da organização / Pessoas responsáveis / Canais oficiais / Informações e documentos | Checklist institucional | `src/components/discovery/VerificationVisuals.tsx:59` |
| 23 | Perfil institucional | Título do cartão | `src/components/discovery/VerificationVisuals.tsx:73` |
| 24 | Quem responde por esta organização? | Pergunta do cartão | `src/components/discovery/VerificationVisuals.tsx:74` |
| 25 | Projeto apresentado / Objetivo e público atendido | Evidência 1 | `src/components/discovery/VerificationVisuals.tsx:113` |
| 26 | Localização informada / Contexto de atuação | Evidência 2 | `src/components/discovery/VerificationVisuals.tsx:114` |
| 27 | Registros de atuação / Evidências compartilhadas | Evidência 3 | `src/components/discovery/VerificationVisuals.tsx:115` |
| 28 | Informações ilustrativas | Nota do visual | `src/components/discovery/VerificationVisuals.tsx:128` |
| 29 | A atuação deixa sinais que podem ser compreendidos. | Apoio do visual | `src/components/discovery/VerificationVisuals.tsx:130` |
| 30 | O contexto é considerado sem transformar presença física em requisito obrigatório. | Nota contextual | `src/components/discovery/VerificationVisuals.tsx:153` |
| 31 | Informações claras / O que a organização apresenta | Critério 1 | `src/components/discovery/VerificationVisuals.tsx:162` |
| 32 | Responsáveis visíveis / Quem responde pela atuação | Critério 2 | `src/components/discovery/VerificationVisuals.tsx:163` |
| 33 | Evidências organizadas | Critério 3 | `src/components/discovery/VerificationVisuals.tsx:164` |
| 34 | Foi assim que, diante da falta de apoio para embarcar nessa jornada, nasceu a busca por verdade e transparência que move o TranquiliCare. | Resolução 1 | `src/pages/VerificationDiscovery.tsx:96` |
| 35 | Antes que uma organização faça parte da plataforma, ela passa por um processo pensando em tornar visível o cuidado, a transparência e a responsabilidade que já existem em seu trabalho. | Resolução 2 | `src/pages/VerificationDiscovery.tsx:100` |
| 36 | Não para decidir por você. | Resolução 3 | `src/pages/VerificationDiscovery.tsx:104` |
| 37 | Mas para que você faça parte de cada etapa dessa história de impacto. Todas elas mesmo. | Resolução 4 | `src/pages/VerificationDiscovery.tsx:108` |
| 38 | Sem precisar começar do 0 toda vez que encontrar uma nova causa. | Resolução 5 | `src/pages/VerificationDiscovery.tsx:117` |
| 39 | Porque confiança não nasce de um selo de verificação. | Resolução 6 | `src/pages/VerificationDiscovery.tsx:121` |
| 40 | Ela nasce de tudo o que acontece antes dele existir e do cuidado que continua depois. | Resolução 7 | `src/pages/VerificationDiscovery.tsx:125` |
| 41 | O selo só torna esse cuidado visível. | Resolução final | `src/pages/VerificationDiscovery.tsx:130` |
| 42 | Porque acreditamos que você pode dedicar menos tempo tentando descobrir em quem confiar | Fechamento 1 | `src/pages/VerificationDiscovery.tsx:315` |
| 43 | E mais tempo fazendo a diferença | Fechamento 2 | `src/pages/VerificationDiscovery.tsx:318` |
| 44 | O cuidado se torna visível | Fechamento 3 | `src/pages/VerificationDiscovery.tsx:338` |
| 45 | Aqui cada ONG é verificada de perto | Fechamento 4 | `src/pages/VerificationDiscovery.tsx:339` |

### Selos e resultados ilustrativos

| Área | Resultado | Explicação | Fonte |
|---|---|---|---|
| Meio ambiente | 42 kg reaproveitados | Recursos distribuídos com melhor aproveitamento por iniciativas acompanhadas. | `src/data/verificationSeals.ts:20` |
| Educação | 12 estudantes alcançados | Ações de aprendizagem receberam apoio para continuar chegando a crianças e jovens. | `src/data/verificationSeals.ts:27` |
| Proteção animal | 8 animais cuidados | Apoios ajudaram a viabilizar alimentação, acolhimento e cuidado veterinário. | `src/data/verificationSeals.ts:34` |
| Saúde mental | 6 acolhimentos apoiados | Pessoas tiveram acesso a escuta e acompanhamento por organizações da área. | `src/data/verificationSeals.ts:41` |
| Saúde | 9 atendimentos viabilizados | Contribuições se transformaram em cuidado e acesso a serviços essenciais. | `src/data/verificationSeals.ts:48` |
| Desenvolvimento social | 27 refeições viabilizadas | Famílias receberam apoio por meio de iniciativas sociais acompanhadas. | `src/data/verificationSeals.ts:55` |

---

## 14. Mensagens de validação, sucesso e erro

### Autenticação

| Copy atual | Gatilho | Onde aparece | Fonte |
|---|---|---|---|
| Digite um e-mail válido. | Estrutura de e-mail inválida | Toast | `src/components/AuthSwitch.tsx:308` |
| Digite sua senha. | Login sem senha | Toast | `src/components/AuthSwitch.tsx:313` |
| Informe o nome da organização. | Cadastro ONG sem nome | Toast | `src/components/AuthSwitch.tsx:319` |
| Informe seu nome para criar a conta. | Cadastro doador sem nome | Toast | `src/components/AuthSwitch.tsx:319` |
| A senha deve ter pelo menos 6 caracteres. | Senha curta | Toast | `src/components/AuthSwitch.tsx:323` |
| As senhas não são iguais. | Confirmação divergente | Toast | `src/components/AuthSwitch.tsx:327` |
| E-mail ou senha incorretos. | Credenciais inválidas | Toast | `src/components/AuthSwitch.tsx:336` |
| Confirme seu e-mail antes de entrar. | Conta não confirmada | Toast e abertura da etapa de código | `src/components/AuthSwitch.tsx:337` |
| Digite todos os dígitos do código enviado por e-mail. | Código incompleto | Toast | `src/components/AuthSwitch.tsx:339` |
| Código inválido ou expirado. Confira o e-mail ou solicite um novo código. | OTP inválido ou expirado | Toast | `src/components/AuthSwitch.tsx:341` |
| Esse e-mail já tem conta. Tente entrar. | E-mail duplicado | Toast | `src/components/AuthSwitch.tsx:342` |
| O e-mail de teste do Supabase não está autorizado. Configure um SMTP próprio ou autorize este endereço. | Endereço não autorizado | Toast | `src/components/AuthSwitch.tsx:344` |
| Limite de envio atingido. Aguarde até uma hora e tente reenviar o código. | Rate limit | Toast | `src/components/AuthSwitch.tsx:346` |
| O cadastro por e-mail está desativado no Supabase. | Provedor desativado | Toast | `src/components/AuthSwitch.tsx:347` |
| Este endereço de e-mail não é aceito pelo provedor. | Endereço rejeitado | Toast | `src/components/AuthSwitch.tsx:348` |
| O Supabase não conseguiu enviar o e-mail. Confira o SMTP e os logs de autenticação. | Falha SMTP | Toast | `src/components/AuthSwitch.tsx:350` |
| Login com Google ainda não está ativo — falta configurar o Supabase. | Google indisponível | Toast | `src/components/AuthSwitch.tsx:352` |
| Erro ao processar. Tente novamente. | Erro não mapeado | Toast | `src/components/AuthSwitch.tsx:353` |
| Login realizado com sucesso! | Login concluído | Toast | `src/components/AuthSwitch.tsx:443` |
| Enviamos um código de verificação para seu e-mail. | Cadastro aguardando confirmação | Toast | `src/components/AuthSwitch.tsx:467` |
| Organização cadastrada com sucesso! | Cadastro ONG confirmado imediatamente | Toast | `src/components/AuthSwitch.tsx:470` |
| Conta criada com sucesso! | Cadastro doador confirmado imediatamente | Toast | `src/components/AuthSwitch.tsx:470` |
| Enviamos um novo código de verificação para seu e-mail. | Login em conta não confirmada | Toast | `src/components/AuthSwitch.tsx:494` |
| E-mail confirmado com sucesso! | OTP aceito | Toast | `src/components/AuthSwitch.tsx:517` |
| Enviamos um novo código para seu e-mail. | Reenvio concluído | Toast | `src/components/AuthSwitch.tsx:545` |

### Callback do Google

| Copy atual | Gatilho | Onde aparece | Fonte |
|---|---|---|---|
| Entrando na sua conta... | Retorno do provedor em andamento | Centro da tela | `src/pages/AuthCallback.tsx:83` |
| Nao foi possivel entrar | Falha no OAuth | Título central | `src/pages/AuthCallback.tsx:63` |
| O login com Google ainda nao esta ativado no Supabase. | Provedor não habilitado | Abaixo do título | `src/pages/AuthCallback.tsx:16` |
| A URL de retorno do app ainda nao foi liberada no Supabase. | Redirect não autorizado | Abaixo do título | `src/pages/AuthCallback.tsx:17` |
| O login foi cancelado ou nao foi autorizado no Google. | Acesso negado | Abaixo do título | `src/pages/AuthCallback.tsx:18` |
| Nao foi possivel concluir o login com Google. Confira a configuracao do provedor e tente novamente. | Outro erro OAuth | Abaixo do título | `src/pages/AuthCallback.tsx:19` |
| Voltar para o login | Botão de recuperação | Tela de erro | `src/pages/AuthCallback.tsx:73` |

### Perfil da organização

| Copy atual | Gatilho | Onde aparece | Fonte |
|---|---|---|---|
| Selecione uma categoria. | Categoria vazia | Sob o seletor | `src/pages/NGOAccountProfile.tsx:369` |
| Informe um CNPJ válido. | CNPJ vazio ou inválido | Sob o campo | `src/pages/NGOAccountProfile.tsx:370` |
| Informe um endereço completo. | Endereço vazio ou curto | Sob o campo | `src/pages/NGOAccountProfile.tsx:371` |
| Conte um pouco sobre a organização. | Descrição vazia | Sob o campo | `src/pages/NGOAccountProfile.tsx:372` |
| Informe o objetivo atual da organização. | Objetivo vazio | Sob o campo | `src/pages/NGOAccountProfile.tsx:373` |
| Informe um perfil do Instagram válido. | Instagram inválido | Sob o campo | `src/pages/NGOAccountProfile.tsx:374` |
| Informe um telefone válido. | Telefone preenchido e inválido | Sob o campo | `src/pages/NGOAccountProfile.tsx:375` |

### Doação e pagamento

| Copy atual | Gatilho | Onde aparece | Fonte |
|---|---|---|---|
| Escolha um valor entre R$ 0,51 e R$ 100.000,00. | Valor fora do intervalo | Toast | `src/components/NGOProfile.tsx:72` |
| Não foi possível gerar o PIX. Confira o valor e tente novamente. | Falha ao criar o PIX | Toast | `src/components/NGOProfile.tsx:147` |
| Pagamento cancelado. Nenhuma doação foi concluída. | Retorno cancelado do provedor de pagamento | Toast na página inicial | `src/pages/Index.tsx:133` |
| Seu pagamento está sendo confirmado. O impacto será atualizado automaticamente. | Confirmação demorou ou falhou temporariamente | Toast na página inicial | `src/pages/Index.tsx:169` |

### Rota inexistente

| Copy atual | Onde aparece | Fonte |
|---|---|---|
| 404 | Centro da página | `src/pages/NotFound.tsx:14` |
| Oops! Page not found | Abaixo do 404 | `src/pages/NotFound.tsx:15` |
| Return to Home | Link de recuperação | `src/pages/NotFound.tsx:17` |

---

## 15. Conteúdo de demonstração das organizações

Este conteúdo aparece nos cartões de descoberta, perfis públicos, resultados de busca e posts do feed enquanto a plataforma ainda não possui volume suficiente de dados reais.

### Organizações, descrições e metas

| Organização | Categoria | Descrição exibida | Objetivo exibido | Fonte |
|---|---|---|---|---|
| Abraço Sereno | Saúde Mental | Acolhimento emocional gratuito para pessoas em momentos de ansiedade, luto e vulnerabilidade social. | Criar rodas de conversa semanais e oferecer 200 atendimentos de escuta qualificada por mês. | `src/data/demoNgos.ts:36` |
| Casa Recomeço | Social | Rede comunitária que conecta famílias a apoio psicossocial, oficinas de cuidado e orientação básica. | Montar kits de cuidado e ampliar as oficinas para três bairros nos próximos meses. | `src/data/demoNgos.ts:60` |
| Mente em Flor | Saúde Mental | Terapia acessível e grupos de apoio para jovens que enfrentam ansiedade e depressão. | Subsidiar 300 sessões de terapia para adolescentes em situação de vulnerabilidade. | `src/data/demoNgos.ts:84` |
| Respire Bem | Saúde | Programas de mindfulness e primeiros socorros emocionais em escolas públicas e postos de saúde. | Levar oficinas de respiração e autocuidado a 10 escolas neste semestre. | `src/data/demoNgos.ts:107` |
| Mãos que Acolhem | Social | Distribuição de refeições e apoio a pessoas em situação de rua com escuta e encaminhamento. | Servir 1.000 refeições quentes por mês e ampliar a equipe de voluntários. | `src/data/demoNgos.ts:123` |
| Ponte Solidária | Social | Capacitação profissional e apoio à geração de renda para mulheres chefes de família. | Formar 120 mulheres em cursos profissionalizantes até o fim do ano. | `src/data/demoNgos.ts:145` |
| Patas do Bem | Pets | Resgate, cuidado veterinário e adoção responsável de animais abandonados. | Custear castrações e tratamentos para 200 animais resgatados. | `src/data/demoNgos.ts:161` |
| Verde Vivo | Meio Ambiente | Reflorestamento urbano e educação ambiental com escolas e comunidades locais. | Plantar 5.000 mudas nativas e criar 3 hortas comunitárias. | `src/data/demoNgos.ts:183` |
| Focinhos Felizes | Pets | Resgate e adoção de gatos, com feiras de adoção e campanhas de castração. | Castrar 150 gatos e viabilizar 80 adoções responsáveis neste semestre. | `src/data/demoNgos.ts:198` |
| Abrigo Peludo | Pets | Cuidado e acolhimento de cães idosos e com deficiência até a adoção definitiva. | Manter alimentação e tratamentos para 60 cães resgatados por mês. | `src/data/demoNgos.ts:220` |
| Rio Limpo | Meio Ambiente | Mutirões de despoluição de rios e nascentes com comunidades ribeirinhas. | Realizar 12 mutirões e retirar 5 toneladas de resíduos das margens. | `src/data/demoNgos.ts:234` |
| Semente do Futuro | Educação | Educação ambiental e hortas em escolas para crianças e adolescentes. | Criar 5 hortas escolares e formar 300 crianças em cuidado ambiental. | `src/data/demoNgos.ts:256` |
| Futuro em Foco | Educação | Reforço escolar, leitura e tecnologia para crianças e adolescentes da rede pública. | Oferecer acompanhamento educacional contínuo para 240 estudantes neste ano. | `src/data/demoNgos.ts:270` |
| Saúde em Rede | Saúde | Prevenção, orientação e acesso a cuidados básicos para comunidades com atendimento limitado. | Realizar 500 atendimentos preventivos e formar agentes comunitários de saúde. | `src/data/demoNgos.ts:293` |

### Histórias simuladas originais

| Organização | Título na mídia | Legenda exibida | Fonte |
|---|---|---|---|
| Abraço Sereno | Roda de acolhimento | Encontro aberto com voluntários e participantes da comunidade. | `src/data/demoNgos.ts:51` |
| Casa Recomeço | Oficina de cuidado | Uma tarde de orientação, escuta e vínculos com as famílias atendidas. | `src/data/demoNgos.ts:75` |
| Mente em Flor | Grupo de apoio | Encontro semanal de jovens em rede de apoio e escuta. | `src/data/demoNgos.ts:99` |
| Mãos que Acolhem | Refeições solidárias | Voluntários preparando e servindo o jantar da comunidade. | `src/data/demoNgos.ts:136` |
| Patas do Bem | Adoção responsável | Mais um resgatado encontrando um novo lar cheio de amor. | `src/data/demoNgos.ts:174` |
| Focinhos Felizes | Feira de adoção | Um sábado de encontros que terminam em novos lares. | `src/data/demoNgos.ts:211` |
| Rio Limpo | Mutirão no rio | Voluntários devolvendo vida às margens do rio. | `src/data/demoNgos.ts:247` |
| Futuro em Foco | Aprender em rede | Uma tarde de leitura, experimentação e novas descobertas. | `src/data/demoNgos.ts:284` |
| Saúde em Rede | Cuidado próximo | Orientação preventiva e cuidado chegando perto de quem precisa. | `src/data/demoNgos.ts:307` |

---

## 16. Textos acessíveis e auxiliares

Estes textos podem não estar sempre visíveis, mas são lidos por tecnologias assistivas ou aparecem em tooltips, títulos e controles.

### Controles do produto

| Copy atual | Elemento identificado | Fonte |
|---|---|---|
| Ir para a página inicial do TranquiliCare | Logo na autenticação | `src/components/AuthSwitch.tsx:1143` |
| Escolha como entrar | Seletor Doador/Organização | `src/components/AuthSwitch.tsx:1176` |
| Etapas do caminho de doador / organização | Trilha de cadastro | `src/components/AuthSwitch.tsx:1241` |
| Código de verificação de até 8 dígitos | Grupo de inputs OTP | `src/components/AuthSwitch.tsx:221` |
| Digito {n} | Cada input OTP | `src/components/AuthSwitch.tsx:241` |
| Voltar para o início | Logos e botões de retorno dos perfis | `src/pages/DonorProfile.tsx:208`, `src/pages/NGOAccountProfile.tsx:431` |
| Trocar foto | Botão sobre o avatar do doador | `src/pages/DonorProfile.tsx:240` |
| Fechar | Botões de modais | `src/components/NGOProfile.tsx:268` |
| Fechar história | Visualizadores de história | `src/components/Stories.tsx:527`, `src/components/NGOProfile.tsx:125` |
| Fechar agradecimento | Modal pós-doação | `src/components/DonationThankYouDialog.tsx:166` |
| Fechar mapa | Mapa incorporado | `src/components/ui/view-on-map.tsx:77` |
| Mapa de {organização} | Painel do mapa | `src/components/ui/view-on-map.tsx:57` |
| Localização de {organização} | Título do iframe | `src/components/ui/view-on-map.tsx:66` |
| Conhecer a causa {organização} | Área principal do cartão editorial | `src/components/marketplace/CauseShowcaseCard.tsx:52` |
| Salvar nos favoritos / Remover dos favoritos | Coração dos cartões de causa | `src/components/marketplace/CauseShowcaseCard.tsx:64` |
| Buscar causas ou organizações | Campo de busca | `src/components/Marketplace.tsx:282` |
| Descobrir como o valor escolhido chega à organização | Link narrativo de doação | `src/components/LoggedOutHero.tsx:174` |
| Descobrir como o TranquiliCare verifica as ONGs | Seletor animado de selos | `src/components/discovery/SealRolodex.tsx:117` |
| Abrir Como verificamos as ONGs | Texto oculto do seletor | `src/components/discovery/SealRolodex.tsx:119` |
| Conhecer a verificação da categoria {categoria} | Selo do perfil da ONG | `src/components/NGOProfile.tsx:211` |
| Selo verificado de {categoria} | Tooltip do selo | `src/components/NGOProfile.tsx:212` |
| Conteúdo do perfil da organização | Grupo das três abas | `src/components/NGOProfile.tsx:246` |
| Abrir história: {legenda} | Publicação na aba Histórias | `src/components/ngo-profile/NGOProfileTabs.tsx:115` |
| Valor da doação: {valor}. Arraste para cima ou para baixo para alterar. | Seletor de valor | `src/components/ui/donation-amount-wheel.tsx:410` |
| Editar valor manualmente / Concluir edição manual | Lápis do seletor | `src/components/ui/donation-amount-wheel.tsx:508` |
| Pagamento por PIX | Região do componente de pagamento | `src/components/ui/pix-qr-disclosure.tsx:80` |
| QR Code PIX para pagamento | Imagem ou QR Code gerado no navegador | `src/components/ui/pix-qr-disclosure.tsx:146`, `src/components/ui/pix-qr-disclosure.tsx:155` |
| Copiar código PIX / Código PIX copiado | Botão de cópia, conforme o estado | `src/components/ui/pix-qr-disclosure.tsx:166` |
| Fechar QR Code | Botão de fechamento do componente expandido | `src/components/ui/pix-qr-disclosure.tsx:196` |
| Esfera de histórias interativa | Esfera da página inicial | `src/components/ui/img-sphere.tsx:138` |
| Arraste para explorar as histórias | Dica opcional da esfera | `src/components/ui/img-sphere.tsx:179` |
| Criando imagem para compartilhar / Compartilhar como imagem | Botão de captura | `src/components/ShareCameraButton.tsx:83` |

### Textos padrão dos componentes de interface

Estes textos vêm de componentes genéricos e só aparecem se o respectivo componente for usado.

| Copy atual | Componente | Fonte |
|---|---|---|
| Close | Dialog e Sheet | `src/components/ui/dialog.tsx:47`, `src/components/ui/sheet.tsx:62` |
| Previous slide | Carrossel, botão anterior | `src/components/ui/carousel.tsx:189` |
| Next slide | Carrossel, botão seguinte | `src/components/ui/carousel.tsx:217` |
| pagination | Navegação de páginas | `src/components/ui/pagination.tsx:10` |
| Go to previous page / Previous | Página anterior | `src/components/ui/pagination.tsx:50` |
| Go to next page / Next | Próxima página | `src/components/ui/pagination.tsx:58` |
| More pages | Reticências da paginação | `src/components/ui/pagination.tsx:68` |
| Toggle Sidebar | Controle da barra lateral | `src/components/ui/sidebar.tsx:237` |

---

## 17. Pontos de atenção editorial

Esta seção não altera a aplicação. Ela registra inconsistências encontradas para uma futura rodada de copy.

1. **Ano do rodapé:** o site mostra “© 2025” embora a revisão tenha sido feita em 2026. Fonte: `src/pages/Index.tsx:285`.
2. **Callback sem acentos:** a tela do Google usa “Nao”, “possivel”, “esta”, “configuracao” e “nao foi autorizado”. Isso destoa do restante da aplicação. Fonte: `src/pages/AuthCallback.tsx:16-19`, `src/pages/AuthCallback.tsx:63`.
3. **Página 404 em inglês:** “Oops! Page not found” e “Return to Home” quebram a consistência em português. Fonte: `src/pages/NotFound.tsx:15-17`.
4. **Gênero no login da ONG:** “Bem-vinda de volta.” trata a organização no feminino, enquanto outras áreas alternam “organização” e “ONG”. É válido, mas deve ser uma decisão consciente de voz. Fonte: `src/components/AuthSwitch.tsx:104`.
5. **“Apoio” e “doação”:** ambos são usados para a mesma transação. “Apoio” domina a narrativa emocional; “doação” aparece em números, pagamento e regras. Recomenda-se manter essa distinção explicitamente no guia de marca.
6. **“ONG”, “organização” e “organização social”:** os três termos aparecem na interface. O documento permite decidir qual é institucional, qual é coloquial e qual deve ser reservado a contextos legais.
7. **Conteúdo ilustrativo:** o feed marca posts como “Simulação”, mas os cartões de ONG e a campanha relâmpago não exibem um selo equivalente. As copys de demonstração estão catalogadas na seção 15 para essa decisão.
8. **Promessa de atualização em tempo real:** “Atualizado em tempo real” é uma promessa forte e deve continuar vinculada a dados efetivamente atualizados pelo backend.
9. **Número de dígitos do código:** a interface aceita de 6 a 8 dígitos e anuncia “até 8 dígitos”. Essa decisão deve acompanhar exatamente a configuração do Supabase.
10. **Textos genéricos em inglês:** componentes de dialog, carrossel, paginação e sidebar ainda possuem labels em inglês. Estão listados na seção 16.
11. **“Interesseiros”:** a palavra aparece como um dos atritos na narrativa da doação. Vale confirmar se é um termo intencional da marca ou um placeholder. Fonte: `src/components/discovery/DonationFrictionCards.tsx:4`.
12. **Frase de verificação:** “E aqui que se encontra...” está sem acento em “É” no código atual. Fonte: `src/pages/VerificationDiscovery.tsx:55`.
13. **Label do código:** “Digito” aparece sem acento no nome acessível de cada campo. Fonte: `src/components/AuthSwitch.tsx:241`.

---

## 18. Mapa de manutenção

| Área editorial | Arquivos principais |
|---|---|
| Marca, SEO e compartilhamento | `index.html`, `src/pages/Index.tsx` |
| Navegação | `src/components/Header.tsx`, `src/components/mobileNavItems.tsx`, `src/components/CosmosNav.tsx` |
| Vídeo da causa no perfil da ONG | `src/components/ui/expandable-video-player.tsx`, `src/components/ngo-profile/NGOProfileTabs.tsx` |
| Home visitante | `src/components/LoggedOutHero.tsx` |
| Dashboard autenticado | `src/components/ImpactDashboard.tsx` |
| Causas e campanhas | `src/components/Marketplace.tsx`, `src/data/ngoCategories.ts`, `src/data/flashCampaigns.ts` |
| Autenticação e cadastro | `src/components/AuthSwitch.tsx`, `src/pages/AuthCallback.tsx` |
| Feed de histórias | `src/components/Stories.tsx` |
| Cadastro da organização | `src/pages/NGOAccountProfile.tsx`, `src/lib/organizationProfile.ts` |
| Perfil público da ONG | `src/components/NGOProfile.tsx`, `src/pages/NGOPublicProfile.tsx` |
| Perfil do doador | `src/pages/DonorProfile.tsx`, `src/components/WalletCard.tsx` |
| Doação, PIX e agradecimento | `src/components/NGOProfile.tsx`, `src/components/ui/donation-amount-wheel.tsx`, `src/components/ui/pix-qr-disclosure.tsx`, `src/components/DonationThankYouDialog.tsx`, `src/components/ShareCameraButton.tsx` |
| Narrativa da doação | `src/pages/DonationIntegrityDiscovery.tsx`, `src/components/discovery/DonationFrictionCards.tsx`, `src/components/discovery/DonationLongRoadScene.tsx` |
| Narrativa da verificação | `src/pages/VerificationDiscovery.tsx`, `src/components/discovery/VerificationVisuals.tsx`, `src/data/verificationSeals.ts` |
| Conteúdo de demonstração | `src/data/demoNgos.ts`, `src/data/flashCampaigns.ts` |
| Mensagens de sistema | `src/components/AuthSwitch.tsx`, `src/pages/NGOAccountProfile.tsx`, `src/pages/Index.tsx`, `src/components/ShareCameraButton.tsx` |

## Critério de atualização

Sempre que uma copy for alterada no app, atualize a linha correspondente neste arquivo. Para novas telas, registre:

1. texto exato;
2. posição na interface;
3. condição de exibição;
4. função editorial;
5. arquivo de origem;
6. variáveis dinâmicas entre chaves, como `{nome}` e `{valor}`.

Assim este inventário continua servindo como ponte entre produto, marca, UX writing e implementação.
