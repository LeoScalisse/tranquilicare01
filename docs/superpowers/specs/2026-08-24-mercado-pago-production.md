# Especificação: Mercado Pago em produção

## Objetivo

Levar o checkout PIX do TranquiliCare do sandbox para produção sem centralizar na plataforma o dinheiro destinado às ONGs. O modelo escolhido é o **Mercado Pago Split 1:1 (Marketplace)**: cada ONG conecta sua própria conta Mercado Pago por OAuth, recebe a parcela da doação e o Mercado Pago separa a taxa de serviço do TranquiliCare por `application_fee`.

## Escopo inicial

- PIX no Checkout Transparente.
- Uma ONG recebedora por doação.
- OAuth Authorization Code com PKCE para conectar a conta da ONG.
- Tokens de vendedor criptografados no banco e nunca enviados ao navegador.
- Criação de pagamento real com o token OAuth da ONG e `application_fee`.
- Webhook assinado, consulta de confirmação e processamento idempotente.
- Renovação de tokens antes do vencimento.
- Ativação progressiva: sandbox, piloto real de baixo valor e liberação geral.

Cartão, Apple Pay, boleto e split 1:N não fazem parte desta primeira liberação. A arquitetura continuará preparada para outros métodos.

## Regras financeiras

- O valor escolhido pelo doador é o valor destinado à ONG.
- A taxa de serviço de 5% é adicionada ao total cobrado.
- `transaction_amount` é o total mostrado no checkout.
- `application_fee` é a taxa do TranquiliCare.
- A conta OAuth da ONG é a conta vendedora da transação.
- Nenhum status vindo do frontend pode marcar uma doação como paga; somente consulta autenticada ao provedor ou webhook válido.

## Segurança e conformidade

- A aplicação Mercado Pago deve estar configurada como Marketplace, com Redirect URL HTTPS estática e PKCE habilitado.
- Cada ONG precisa de conta Mercado Pago verificada no nível exigido pelo Split 1:1.
- `client_secret`, chave de criptografia, access tokens e refresh tokens ficam apenas no backend.
- OAuth `state` é aleatório, expira em 10 minutos, é de uso único e é comparado por hash.
- Tokens são criptografados com AES-GCM e chave separada armazenada nos Secrets do Supabase.
- Tabelas de credenciais não concedem acesso a `anon` ou `authenticated`; Edge Functions usam service role.
- Logs nunca incluem tokens, códigos OAuth, segredo de webhook, CPF ou payload PIX completo.
- Criação e confirmação de pagamento terão limites de abuso e idempotência.

## Critérios para ativar produção

1. Testes unitários, integração, lint e build aprovados.
2. OAuth de uma ONG piloto conectado e renovável.
3. PIX real de baixo valor criado, pago, confirmado por webhook e conciliado.
4. Taxa e valor líquido conferidos nas duas contas Mercado Pago.
5. Expiração, cancelamento, duplicidade de webhook e indisponibilidade testados.
6. Política operacional de reembolso e atendimento aprovada.
7. Monitoramento e rollback documentados.
8. Somente então `MERCADO_PAGO_LIVEMODE=true` para a ONG piloto; a liberação geral permanece separada.

## Fora de escopo

- Guardar dados de cartão.
- Simular ou capturar pagamentos reais automaticamente durante desenvolvimento.
- Ativar todas as ONGs de uma vez.
- Reembolso automático sem autorização administrativa e saldo verificado.
