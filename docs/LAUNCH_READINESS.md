# TranquiliCare — mapa de lançamento e heurísticas de Nielsen

Atualizado em 6 de setembro de 2026.

## Estado funcional por domínio

| Domínio | Estado no código | Para produção |
| --- | --- | --- |
| Perfis | Perfis separados de doador e ONG, edição, onboarding e estados financeiros/verificação | Validar políticas RLS e dados reais no projeto remoto |
| Histórias | Publicação persistida para doador e ONG; criação no feed e no próprio perfil; dados demonstrativos condicionados a `VITE_ENABLE_DEMO_DATA` | Manter a flag ausente ou `false` no build de produção |
| ONGs | Catálogo público, fundadoras, categorias, selo, vínculo de membro e status de recebimento | Aprovar organizações e concluir OAuth do Mercado Pago por ONG |
| Doadores | Perfil próprio, publicação de histórias, doações e criação de proposta de vaquinha | Validar e-mail, perfil público e permissão de doação no ambiente remoto |
| Vaquinhas | Formulário real, rascunho local, validação, fila privada de análise e catálogo público de aprovadas | Aplicar a migration e criar rotina administrativa de aprovação |
| Doações | Ledger, pagamentos, eventos, idempotência, reconciliação e exclusão de testes dos totais | Desativar simulação no banco, publicar funções e executar PIX de teste |
| Mercado Pago | Checkout transparente PIX por recebedor OAuth, taxa da plataforma, webhook HMAC e rollout por allowlist | Configurar segredos, URL pública HTTPS, contas de teste e depois credenciais de produção |

A implementação atual é de checkout transparente PIX. Cartão, boleto e estorno automático continuam fora do escopo implementado; não devem ser anunciados como disponíveis.

## As 10 heurísticas de Nielsen aplicadas

1. Visibilidade do estado do sistema
   - Estados de carregamento, envio, confirmação e análise aparecem junto da ação.
   - Toasts semânticos e regiões `aria-live` comunicam sucesso, aviso, informação e erro.
   - A proposta de vaquinha termina com protocolo e uma linha clara das próximas etapas.

2. Correspondência com o mundo real
   - Linguagem brasileira: “vaquinha”, “organização beneficiária”, reais e datas locais.
   - O fluxo fala em análise do TranquiliCare, sem sugerir publicação ou cobrança imediata.

3. Controle e liberdade do usuário
   - O formulário permite voltar, alterar dados e mantém rascunho local.
   - Carrosséis oferecem controles anterior/próximo; alertas podem ser dispensados.
   - Nenhum pagamento é criado durante a submissão de uma vaquinha.

4. Consistência e padrões
   - Alertas usam o mesmo componente visual, ícones Lucide e quatro variantes semânticas.
   - Botões, foco, títulos, cartões e linguagem seguem os tokens existentes do projeto.
   - O projeto continua no padrão shadcn existente em `src/components/ui`, TypeScript e Tailwind 3.4; não houve migração de versão arriscada no lançamento.

5. Prevenção de erros
   - Limites, campos obrigatórios, aceite, datas e valores são validados antes do envio.
   - RLS, validação no RPC e limite de três propostas por dia repetem a proteção no servidor.
   - Idempotência no pagamento e allowlist no rollout impedem duplicação e exposição geral.
   - O bundle de produção bloqueia PIX simulado/protótipo.

6. Reconhecimento em vez de memorização
   - Preview da vaquinha, rótulos permanentes, exemplos e texto de apoio deixam as escolhas visíveis.
   - Ações “Criar história” e “Criar vaquinha” também estão no contexto do perfil.

7. Flexibilidade e eficiência
   - A mesma criação de história pode começar no feed ou no perfil.
   - A criação de vaquinha pode começar no marketplace ou no perfil do doador.
   - Navegação por teclado, foco visível e preferência por movimento reduzido são respeitados.

8. Design estético e minimalista
   - A seção vazia de vaquinhas mantém a aparência de um cartão real sem conteúdo fictício.
   - O brilho do checkout foi reduzido para não competir com QR code e controles.
   - O carrossel fundador mantém um foco principal, controles compactos e texto essencial.

9. Ajuda para reconhecer, diagnosticar e recuperar erros
   - Mensagens usam linguagem simples, apontam o campo e dizem como corrigir.
   - Erros de tela têm limite global com opções de recarregar ou voltar ao início.
   - Dados digitados na vaquinha permanecem no rascunho após falha ou saída acidental.

10. Ajuda e documentação
   - Textos contextuais explicam análise, beneficiário, prazo e o que acontece após o envio.
   - Descoberta de integridade das doações e de verificação de ONG permanece disponível.
   - Este documento registra limites operacionais e o checklist verificável de lançamento.

Referência: Nielsen Norman Group, “10 Usability Heuristics for User Interface Design” (revisado em 30 jan. 2024): https://www.nngroup.com/articles/ten-usability-heuristics/

## Checklist operacional antes de abrir pagamentos

- Aplicar todas as migrations no projeto Supabase vinculado e executar o advisor/lint.
- Confirmar `donation_simulation_status() = false` e não definir `VITE_ENABLE_DEMO_DATA=true`.
- Publicar as Edge Functions de pagamento e webhook a partir do mesmo commit validado.
- Definir `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_CLIENT_ID`, `MERCADO_PAGO_CLIENT_SECRET`, URL de webhook HTTPS, chaves de criptografia/rate limit e origens permitidas.
- Criar contas de teste vendedor/comprador do Mercado Pago; nunca usar a mesma conta nos dois lados.
- Validar criação PIX, webhook assinado, confirmação, idempotência, expiração/falha e reconciliação.
- Iniciar com `MERCADO_PAGO_LIVEMODE=false`; depois ativar produção somente para organizações na allowlist.
- Verificar os dados e a qualidade da aplicação no painel do Mercado Pago antes das credenciais reais.
- Monitorar eventos de pagamento e manter um procedimento manual de estorno, pois reembolso automático ainda não está implementado.

Documentação oficial do Mercado Pago:
- Contas de teste: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/resources/test-accounts
- Testes e ida à produção: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/go-to-production
- Cartões, idempotência e notificações: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/cards
- Detalhes da aplicação: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/resources/application-details
