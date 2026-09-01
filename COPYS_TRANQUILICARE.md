# Copy oficial do TranquiliCare

**Versão editorial:** 31 de agosto de 2026
**Função deste arquivo:** referência única para textos visíveis do produto. Quando uma tela ou componente mudar, atualize a copy correspondente aqui antes de criar variações paralelas.

---

## 1. Voz do TranquiliCare

O TranquiliCare é humano, calmo, claro e esperançoso. A linguagem deve valorizar a causa sem transformar a dor em espetáculo.

- Use **organização** como termo principal; use **ONG** apenas quando a versão curta ajudar a leitura.
- Use **apoio** para a relação humana e **doação** para a ação financeira.
- Use **recebimentos**; não exponha o nome de gateways ou conceitos técnicos no produto.
- Diga o que acontece agora, com frases curtas e diretas.
- Não prometa impacto, verificação ou recebimento antes de eles existirem.
- Evite urgência artificial, jargão e frases motivacionais repetidas.

### Variáveis

Use as variáveis abaixo sem alterar o conteúdo entre chaves:

| Variável | Uso |
| --- | --- |
| `{nome}` | nome da pessoa ou organização |
| `{organização}` | nome da organização beneficiada |
| `{valor}` | valor da doação escolhido pelo usuário |
| `{categoria}` | categoria da causa |
| `{título da seção}` | título editorial da categoria |
| `{quantidade}` | número exibido em um contador |

---

## 2. Marca e navegação global

### Identidade

| Elemento | Copy |
| --- | --- |
| Nome | `TranquiliCare` |
| Assinatura | `Conectando corações, mudando o mundo.` |
| Rodapé | `© 2026 TranquiliCare. Conectando corações, mudando o mundo.` |

### Navegação pública

- `Início`
- `Descobrir causas`
- `Histórias`
- `Como funciona`
- `Entrar`
- `Criar conta`

### Navegação autenticada — doador

- `Início`
- `Descobrir`
- `Histórias`
- `Meu impacto`
- `Perfil`
- `Sair`

### Navegação autenticada — organização

- `Área da organização`
- `Ver perfil público`
- `Histórias`
- `Recebimentos`
- `Configurações`
- `Sair`

### Utilitários e acessibilidade

- `Abrir menu`
- `Fechar menu`
- `Voltar`
- `Continuar`
- `Salvar alterações`
- `Cancelar`
- `Carregando…`
- `Tentar novamente`

---

## 3. Página inicial pública

### Abertura

**Título**

`Toda boa ação começa com uma escolha.`

**Texto de apoio**

`Conheça causas reais, acompanhe histórias e encontre uma forma de fazer parte.`

**Ações**

- Primária: `Conhecer causas`
- Secundária: `Como funciona`

### Globo de histórias

**Rótulo de contexto**

`Histórias que aproximam pessoas de causas reais.`

**Ação de cada história**

`Conhecer história`

**Estado sem histórias**

`Em breve, novas histórias vão aparecer por aqui.`

### Fundadoras

**Título**

`ONGs fundadoras`

**Texto**

`Organizações que ajudam a construir os primeiros capítulos do TranquiliCare.`

**Ação**

`Conhecer`

**Observação para demonstrações**

`A visualização de dados da organização fundadora é uma demonstração do painel.`

### Categorias

**Título**

`Encontre uma causa para chamar de sua.`

**Filtros**

- `Todas`
- `Educação`
- `Saúde`
- `Saúde Mental`
- `Social`
- `Pets`
- `Meio Ambiente`

**Estado vazio de categoria**

`Ainda estamos buscando causas e histórias para {título da seção}.`

Exemplo: `Ainda estamos buscando causas e histórias para Para quem alegra nossos dias.`

### Vaquinhas

**Título**

`Vaquinhas em andamento`

**Texto**

`Causas que estão mobilizando apoio agora.`

**Estado vazio**

`Ainda não há vaquinhas para mostrar por aqui.`

---

## 4. Descoberta e cards do marketplace

### Cabeçalho

**Título**

`Descubra causas para acompanhar.`

**Busca**

| Elemento | Copy |
| --- | --- |
| Label | `Buscar causas` |
| Placeholder | `Busque por organização, causa ou cidade` |
| Sem resultado | `Não encontramos uma causa com essa busca.` |
| Ação de retorno | `Limpar busca` |

### Card de organização

O card é um template do TranquiliCare: foto real como fundo, tratamento visual discreto, logo sobreposta, nome, categoria e selos aplicáveis. A organização não escolhe fonte, cores ou posições.

| Elemento | Copy |
| --- | --- |
| Categoria | `{categoria}` |
| Selo de fundadora | `ONG fundadora` |
| Selo de verificação | `Organização verificada` |
| Sem logo | `{organização}` |
| Ação | `Conhecer organização` |
| Foto alternativa | `Foto de {organização}` |
| Logo alternativa | `Logo de {organização}` |

### Fallbacks editoriais

- Sem foto principal: `Conheça a causa de {organização}.`
- Sem logo: exibir o nome da organização no sistema visual padrão.
- Sem organização elegível: `Ainda estamos preparando novas causas para você conhecer.`

---

## 5. Conta e acesso

### Escolha de perfil

**Doador**

`Quero apoiar causas e acompanhar histórias.`

**Organização**

`Quero apresentar minha causa e construir minha presença.`

### Acesso do doador

**Título para criar conta**

`O começo do bem.`

**Texto**

`Crie sua conta para acompanhar as causas que fazem sentido para você.`

**Título para entrar**

`Que bom ter você de volta.`

**Campos**

- `Nome`
- `E-mail`
- `Senha`

**Placeholders**

- `Como você quer ser chamado?`
- `seuemail@exemplo.com`
- `Crie uma senha segura`

**Ações**

- `Criar conta`
- `Entrar`
- `Continuar com Google`
- `Esqueci minha senha`

### Acesso da organização

**Título para criar conta**

`Sua causa merece ser encontrada.`

**Texto**

`Crie o acesso da sua organização para começar.`

**Título para entrar**

`Continue dando forma à sua causa.`

**Campos**

- `E-mail da organização`
- `Senha`

**Placeholders**

- `contato@organizacao.org.br`
- `Digite sua senha`

**Ações**

- `Continuar`
- `Entrar`
- `Continuar com Google`

### Confirmação de e-mail

**Cabeçalho**

`2 de 4`

**Título**

`Confirme seu e-mail.`

**Texto**

`Use o código enviado para {e-mail}.`

**Campo**

`Código de confirmação`

**Ações**

- `Confirmar e-mail`
- `Reenviar código`
- `Usar outro e-mail`

**Mensagens**

- `Código reenviado.`
- `Não foi possível confirmar o e-mail. Confira o código e tente novamente.`

---

## 6. Onboarding da organização

### Trilha visual

Ordem editorial e lógica:

1. `Criar acesso`
2. `Confirmar e-mail`
3. `Apresentar a causa`
4. `Preparar estreia`
5. `Preparar recebimentos`

Na trilha visual, as etapas 3 e 4 acima são identificadas como `03A` e `03B`; a preparação de recebimentos é `04`. A seta deve respeitar sempre a sequência: `01 → 02 → 03A → 03B → 04`.

### 3 de 4 — Apresente sua causa

**Título**

`Apresente sua causa.`

**Texto**

`É assim que as pessoas vão conhecê-la pela primeira vez.`

| Campo | Label | Placeholder |
| --- | --- | --- |
| Categoria principal | `Qual é a principal causa de vocês?` | `Escolha uma causa` |
| Propósito | `Por que essa causa existe?` | `O que vocês acreditam que precisa mudar?` |
| Atuação | `O que vocês fazem?` | `Conte como vocês atuam e quem essa causa alcança.` |
| Foco atual | `O que vocês querem tornar possível agora?` | `Conte qual é a prioridade mais importante da organização neste momento.` |
| Localização | `Onde vocês atuam?` | `Cidade` |
| Estado | `Estado` | `Selecione o estado` |

**Imagem de perfil opcional**

- Ação: `Adicionar imagem`
- Texto: `Opcional. Você poderá trocar depois.`

**Ação principal**

`Continuar`

**Regra editorial**

O campo **Propósito** alimenta a aba pública `A causa`. O campo **Foco atual** descreve uma prioridade futura, nunca um impacto já realizado.

### 3B — Dê um rosto à sua causa

**Título**

`Dê um rosto à sua causa.`

**Texto**

`Envie sua logo e três fotos que representem o trabalho de vocês. O TranquiliCare cuida do resto.`

#### Logo

**Label**

`Logo da organização`

**Ação**

`Adicionar logo`

**Ajuda**

`Aceitamos formatos comuns de imagem.`

**Regra de produto traduzida para a interface**

`A logo do perfil permanece como foi enviada. Quando possível, usamos uma versão tratada apenas no card do marketplace.`

#### Fotos

**Título**

`Escolha 3 fotos que representem sua causa.`

**Áreas de envio**

- `+ Foto 1`
- `+ Foto 2`
- `+ Foto 3`

**Texto de ajuda**

`Escolha momentos que ajudem alguém a entender o trabalho de vocês.`

**Ações após o envio**

- `Trocar foto`
- `Remover foto`
- `Escolher outra foto`

#### Autorização

`Confirmo que a organização possui autorização para utilizar e compartilhar estas imagens.`

#### Preview

**Sobretítulo**

`PRÉVIA REAL`

**Título**

`Veja como sua causa vai aparecer.`

**Texto**

`Esta é a mesma composição usada no marketplace.`

**Ação principal**

`Continuar`

**Falhas não bloqueantes**

- `Não conseguimos tratar a logo agora. Sua logo original será usada.`
- `Não foi possível processar esta imagem. Tente outra foto ou continue sem ela.`
- `Você pode continuar com menos de três fotos.`

### 4 de 4 — Prepare sua organização para receber apoio

**Título**

`Prepare sua organização para receber apoio.`

**Texto**

`Complete a verificação e configure os recebimentos quando estiver pronto.`

#### Seção: Organização

`Informe os dados institucionais necessários para a verificação.`

**Campos**

- `CNPJ`
- `Endereço oficial`

#### Seção: Responsável

`Informe apenas os dados necessários para a verificação da organização.`

#### Seção: Recebimentos

**Texto**

`Configure onde os valores destinados à sua causa serão recebidos.`

**Estados**

| Estado | Texto | Ação |
| --- | --- | --- |
| Pendente | `Recebimentos ainda não configurados` | `Configurar recebimentos` |
| Em análise | `Recebimentos em análise` | — |
| Pronto | `Recebimentos configurados` | — |
| Revisão | `Precisamos revisar algumas informações` | `Revisar recebimentos` |

**Ações finais**

- Primária: `Concluir preparação`
- Secundária: `Fazer depois`

### Ao escolher “Fazer depois”

O progresso é salvo e a organização entra em sua área privada. Não existe tela de “cadastro incompleto”.

**Lembrete discreto na área privada**

**Título**

`Prepare sua organização para receber apoio`

**Texto**

`Conclua a verificação e configure os recebimentos quando estiver pronto.`

**Ação**

`Continuar preparação`

### Estados do produto para a organização

| Aspecto | Copy de estado |
| --- | --- |
| Perfil | `Perfil pronto` / `Perfil em preparação` |
| Verificação | `Verificação pendente` / `Em análise` / `Verificada` |
| Recebimentos | `Recebimentos pendentes` / `Em análise` / `Configurados` |
| Doações | `Doações desabilitadas até a conclusão da preparação.` |

---

## 7. Perfil público da organização

### Cabeçalho

- `Organização verificada`
- `ONG fundadora`
- `{categoria}`
- `{cidade}, {estado}`
- `Conhecer histórias`
- `Apoiar esta causa`

### Abas

- `A causa`
- `Histórias`
- `Impacto`

### Aba “A causa”

| Elemento | Copy |
| --- | --- |
| Propósito | `Por que existimos` |
| Atuação | `O que fazemos` |
| Foco atual | `O que queremos tornar possível agora` |
| Localização | `Onde atuamos` |
| Endereço e mapa | `Encontre a organização` |
| Contatos e redes | `Acompanhe e entre em contato` |

### Aba “Histórias”

**Estado vazio**

`Esta organização ainda está preparando suas primeiras histórias.`

**Ação da organização**

`Criar primeira história`

### Aba “Impacto” — demonstração fundadora

**Aviso**

`Este painel é uma demonstração visual do TranquiliCare.`

**Seções**

- `Radar de doadores`
- `Apoios recentes`
- `Calendário de impacto`

---

## 8. Área privada da organização

### Abertura

`Olá, {nome}.`

`Sua causa já tem um lugar no TranquiliCare.`

### Ações principais

- `Editar perfil`
- `Ver perfil público`
- `Criar história`
- `Continuar preparação`

### Perfil em preparação

`Complete as informações da sua causa para que as pessoas a conheçam melhor.`

### Histórias

**Título**

`Histórias da sua organização`

**Estado vazio**

`Quando vocês compartilharem uma história, ela aparecerá aqui.`

**Ação**

`Criar história`

---

## 9. Histórias

### Página pública

**Título**

`Histórias que aproximam.`

**Texto**

`Conheça de perto as pessoas, os momentos e as causas que estão acontecendo por aqui.`

**Busca**

- Label: `Buscar histórias`
- Placeholder: `Busque por uma causa, organização ou assunto`

### Publicação

| Elemento | Copy |
| --- | --- |
| Organização | `Por {organização}` |
| Leitura | `Ler história` |
| Compartilhamento | `Compartilhar` |
| Salvar | `Salvar história` |
| Denúncia | `Denunciar` |
| Voltar | `Voltar para histórias` |

### Criar história

**Título**

`Compartilhe um capítulo da sua causa.`

**Campos**

- `Título da história`
- `Conte o que aconteceu`
- `Adicionar imagem`

**Placeholders**

- `Dê um nome a este capítulo`
- `Conte de um jeito simples o que as pessoas podem conhecer.`

**Ações**

- `Publicar história`
- `Salvar rascunho`
- `Cancelar`

**Estados**

- `História publicada.`
- `Rascunho salvo.`
- `Não foi possível publicar a história. Tente novamente.`

---

## 10. Perfil do doador

### Abertura

`Seu impacto ganha forma nas causas que você escolhe acompanhar.`

### Seções

- `Causas que acompanho`
- `Minhas doações`
- `Conquistas`
- `Atividade recente`

### Estados vazios

- `Quando você acompanhar uma causa, ela aparecerá aqui.`
- `Sua primeira doação vai aparecer aqui.`
- `Ainda não há atividade para mostrar.`

### Edição

- `Editar perfil`
- `Salvar alterações`
- `Alterações salvas.`
- `Não foi possível salvar as alterações. Tente novamente.`

---

## 11. Doação e PIX

### Escolha de valor

**Título**

`Escolha como quer apoiar.`

**Texto**

`Sua doação ajuda {organização} a seguir com sua causa.`

**Campo livre**

`Outro valor`

**Ação**

`Continuar`

### Intenção de doação

**Taxa da plataforma**

`TranquiliCare · 5%`

**Explicação**

`Os {valor} que você escolheu chegam à organização. O valor do TranquiliCare é adicionado separadamente.`

Não pedir e-mail como condição para concluir uma doação.

### PIX pronto

**Rótulo**

`PIX PRONTO`

**Título**

`Tudo pronto para concluir sua doação.`

**Texto**

`Abra o QR Code ou copie o código PIX para pagar pelo app do seu banco.`

**Ações**

- `Ver PIX`
- `Copiar código PIX`
- `Código PIX copiado.`

### QR Code aberto

Acima: somente o QR Code.
Abaixo:

`Sua doação será confirmada automaticamente assim que o pagamento for identificado.`

### Confirmação em andamento

`Só um instante. Estamos confirmando seu PIX.`

Não acrescentar textos auxiliares, instruções bancárias ou promessas de prazo nesse estado.

### Confirmação

**Título**

`Sua doação foi confirmada.`

**Texto**

`Obrigado por apoiar {organização}.`

**Ações**

- `Ver a causa`
- `Compartilhar`
- `Concluir`

---

## 12. Pós-doação

Não usar a frase `Transforme sua doação em um capítulo pronto para postar.` Nem incluir player de vídeo neste momento.

### Pessoa sem conta conectada

**Título**

`Quer acompanhar o que sua doação ajuda a tornar possível?`

**Texto**

`Crie uma conta para receber os próximos capítulos desta causa.`

**Ação**

`Quero acompanhar`

### Pessoa com conta conectada

**Título**

`Você agora acompanha esta causa.`

**Texto**

`Os próximos capítulos aparecerão no seu impacto.`

**Ação**

`Ver meu impacto`

### Textos rotativos de compartilhamento

- `Seu apoio abriu espaço para um novo capítulo.`
- `Uma escolha sua agora faz parte desta história.`
- `Causas reais crescem quando alguém decide estar por perto.`

---

## 13. Integridade, verificação e transparência

### Página de integridade

**Título**

`Cuidar da confiança também faz parte da causa.`

**Texto**

`O TranquiliCare trabalha para que informações importantes sejam claras antes, durante e depois de cada apoio.`

### Verificação de organizações

**Título**

`Como funciona a verificação das organizações?`

**Texto**

`Verificamos informações institucionais antes de habilitar recebimentos e identificar uma organização como verificada.`

### Estados de verificação

- `Verificação pendente`
- `Verificação em análise`
- `Organização verificada`
- `Precisamos revisar algumas informações`
- `Revisar informações`

### Transparência de dados

`Documentos e dados sensíveis ficam privados e são usados apenas quando necessários para a verificação e os recebimentos.`

---

## 14. Mensagens de sistema

### Autenticação

- `Conta criada. Vamos preparar seu próximo passo.`
- `Não foi possível criar a conta. Tente novamente.`
- `Não foi possível entrar. Confira seus dados e tente novamente.`
- `Sua sessão terminou. Entre novamente para continuar.`
- `Enviamos as instruções para redefinir sua senha.`

### Perfil e onboarding da organização

- `Organização salva.`
- `Não foi possível salvar a organização. Tente novamente.`
- `Perfil salvo.`
- `Não foi possível salvar o perfil. Tente novamente.`
- `Sua preparação foi salva. Você pode continuar quando quiser.`
- `Não foi possível enviar a imagem. Tente um arquivo menor ou outro formato.`

### Mídia

- `Logo adicionada.`
- `Fotos adicionadas.`
- `Não foi possível enviar esta imagem. Tente novamente.`
- `O arquivo é muito grande. Escolha uma imagem menor.`
- `Este formato não é suportado. Envie uma imagem comum, como JPG, PNG ou WEBP.`
- `Sua logo original foi preservada.`

### Marketplace e histórias

- `Não foi possível carregar as causas. Tente novamente.`
- `Não foi possível carregar as histórias. Tente novamente.`
- `Não encontramos resultados para essa busca.`

### Doação

- `Não foi possível iniciar a doação. Tente novamente.`
- `Não foi possível copiar o código PIX. Copie manualmente e tente novamente.`
- `Ainda não identificamos o pagamento. Aguarde um instante e tente novamente.`

### Página inexistente

**Título**

`Esta página não foi encontrada.`

**Ação**

`Voltar ao início`

---

## 15. Conteúdo de demonstração

Quando dados ou painéis forem apenas ilustrativos, a interface deve ser explícita.

- `Dados de demonstração`
- `Esta visualização usa dados de demonstração.`
- `O painel abaixo é uma prévia visual e não representa doações reais.`

Nunca apresentar dados de teste como doações, organizações, verificações ou resultados reais.

---

## 16. Regras de manutenção

1. Atualize este arquivo junto com qualquer alteração de copy visível.
2. Não crie sinônimos de estados críticos: use sempre `recebimentos`, `verificação`, `perfil` e `doações` com os significados definidos aqui.
3. Preserve as variáveis entre chaves e valide que recebem dados reais antes da publicação.
4. Se uma tela fizer uma promessa operacional nova, revise também as mensagens de erro e o estado vazio correspondente.
5. Conteúdo jurídico, políticas e termos devem viver em documentos próprios; o produto deve apenas apontar para eles com uma frase clara.

---

## 17. Mapa rápido de implementação

| Jornada | Fonte principal no produto |
| --- | --- |
| Acesso e confirmação | `src/components/AuthSwitch.tsx` |
| Onboarding 3A e etapa 4 | `src/components/ngo-profile/NGOOnboardingFlow.tsx` |
| Onboarding visual 3B | `src/components/ngo-profile/NGOVisualOnboardingStep.tsx` |
| Área privada da organização | `src/pages/NGOAccountProfile.tsx` |
| Marketplace e filtros | `src/components/Marketplace.tsx` |
| Perfil e PIX | `src/components/NGOProfile.tsx` |
| Pós-doação | `src/components/DonationThankYouDialog.tsx` |
| Histórias | `src/pages/Stories.tsx` e componentes relacionados |

Este mapa não substitui a leitura do componente: ele indica onde sincronizar a interface com esta referência editorial.
