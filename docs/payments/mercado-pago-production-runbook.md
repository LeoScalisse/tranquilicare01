# Mercado Pago: runbook de produção

## Situação

O código está preparado para um piloto controlado, mas o modo real não deve ser
ativado antes de concluir todos os itens deste documento. A ativação é
deliberadamente opt-in: sem `MERCADO_PAGO_LIVEMODE=true` e sem a ONG na
`MERCADO_PAGO_LIVE_ORGANIZATION_ALLOWLIST`, nenhuma cobrança real é criada.

Arquitetura escolhida: **Marketplace Split 1:1**. Cada ONG autoriza sua própria
conta Mercado Pago via OAuth PKCE; o PIX é criado usando o token da ONG e a taxa
do TranquiliCare é enviada como `application_fee`.

O valor escolhido pelo doador é destinado à ONG, mas não representa promessa
de valor líquido: a tarifa de processamento do Mercado Pago é descontada do
saldo do vendedor conforme as condições comerciais da conta. A taxa de 5% do
TranquiliCare é adicionada ao total cobrado e separada pelo split.

Referências oficiais:

- [Pré-requisitos do Split 1:1](https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/prerequisites)
- [Configuração OAuth do Marketplace](https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/create-configuration)
- [Integração do Marketplace e application_fee](https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)
- [PIX no Checkout Transparente](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/payment-submission/pix)
- [Webhooks e validação de assinatura](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)

## Bloqueadores externos

- [ ] Conta do TranquiliCare verificada no Mercado Pago.
- [ ] Aplicação configurada como Marketplace/Checkout API.
- [ ] OAuth com PKCE habilitado.
- [ ] Redirect URI cadastrada exatamente como:
  `https://zpndyadqgqympasgnniw.supabase.co/functions/v1/mercado-pago-oauth-callback`
- [ ] URL de webhook cadastrada exatamente como:
  `https://zpndyadqgqympasgnniw.supabase.co/functions/v1/payment-webhook?provider=mercado_pago`
- [ ] ONG piloto com conta verificada, chave PIX cadastrada e autorização para
  receber pagamentos.
- [ ] Política operacional de estorno aprovada. O estorno automatizado do
  Mercado Pago ainda permanece desabilitado.
- [ ] Termos, Política de Privacidade e comunicação da taxa de 5% revisados.

## Segredos das Edge Functions

Configure no Supabase Dashboard, sem prefixo `VITE_` e sem colocar valores no
Git:

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_CLIENT_ID`
- `MERCADO_PAGO_CLIENT_SECRET`
- `MERCADO_PAGO_OAUTH_REDIRECT_URI`
- `MERCADO_PAGO_WEBHOOK_URL`
- `PAYMENT_CREDENTIALS_ENCRYPTION_KEY` (32 bytes em Base64 URL-safe)
- `PAYMENT_RATE_LIMIT_PEPPER` (aleatório, mínimo 32 caracteres)
- `PAYMENT_OPERATIONS_SECRET` (aleatório, mínimo 32 caracteres)
- `MERCADO_PAGO_LIVE_ORGANIZATION_ALLOWLIST` (UUID da ONG piloto)

Durante preparação e deploy mantenha:

```text
MERCADO_PAGO_LIVEMODE=false
MERCADO_PAGO_OAUTH_LIVEMODE=false
```

Não troque a chave de criptografia depois de conectar ONGs sem antes criar um
procedimento de recriptografia; isso tornaria os tokens armazenados ilegíveis.

## Ordem de implantação

1. Faça backup lógico do banco.
2. Aplique as migrações pendentes, incluindo:
   - `20260824000200_mercado_pago_marketplace_oauth.sql`
   - `20260824000300_payment_rate_limits.sql`
3. Implante as funções:
   - `create-payment`
   - `confirm-payment`
   - `payment-webhook`
   - `mercado-pago-connect`
   - `mercado-pago-oauth-callback`
   - `mercado-pago-connection`
   - `reconcile-payments`
4. Com ambos os modos ainda em `false`, repita o teste PIX sandbox completo.
5. Troque apenas `MERCADO_PAGO_OAUTH_LIVEMODE=true` e conecte a conta real da
   ONG piloto na área autenticada da ONG.
6. Confirme no banco que existe um `payment_recipients` ativo com
   `provider='mercado_pago'`, `livemode=true` e que a credencial não está
   desconectada. Nunca consulte ou copie o token criptografado.
7. Confirme que a allowlist contém somente o UUID da ONG piloto.
8. Troque `MERCADO_PAGO_LIVEMODE=true`.
9. Faça uma doação real de baixo valor com contas distintas de pagador e
   recebedor. Use dados reais e válidos de e-mail/CPF do pagador. Valide QR,
   webhook, confirmação, valor líquido da ONG, tarifa do Mercado Pago e taxa do
   TranquiliCare.
10. Mantenha o piloto restrito por pelo menos 24 horas antes de adicionar outra
    ONG à allowlist.

## Reconciliação e alertas

Agende uma chamada `POST` para `reconcile-payments` a cada 5 minutos, enviando
`Authorization: Bearer <PAYMENT_OPERATIONS_SECRET>`. Essa função examina até
100 pagamentos pendentes, consulta o Mercado Pago com a credencial da ONG,
reaplica eventos terminais idempotentes e grava `payment_reconciliations`.

Alertar quando ocorrer qualquer condição:

- `payment_reconciliations.matches=false` por mais de 10 minutos;
- `payment_reconciliations.error_message` não nulo;
- `payment_events.processing_status='failed'`;
- aumento de `payments.failure_code` por código;
- credencial OAuth expirada, desconectada ou falha de refresh;
- taxa de webhooks entregues abaixo do esperado.

Execute `cleanup_payment_rate_limits()` diariamente com uma tarefa interna do
banco para remover janelas antigas.

## Rollback seguro

Se o piloto apresentar falhas:

1. Defina imediatamente `MERCADO_PAGO_LIVEMODE=false`.
2. Não apague pagamentos, eventos, reconciliações ou credenciais.
3. Retire a ONG da allowlist apenas depois de desligar o modo real.
4. Reconcile os pagamentos já criados e trate manualmente os estados
   divergentes.
5. Faça estornos somente pelo painel do Mercado Pago e registre o atendimento
   até o fluxo automatizado ser implementado.

## Critério de liberação geral

- [ ] Build, lint e suíte completa sem erro.
- [ ] Migrações aplicadas e funções implantadas na mesma versão.
- [ ] OAuth real concluído sem exposição de tokens.
- [ ] Webhook real verificado e idempotente.
- [ ] Piloto real confirmado no app e no painel do Mercado Pago.
- [ ] Split financeiro conferido manualmente.
- [ ] Reconciliação agendada e alertas ativos.
- [ ] Procedimento de suporte e estorno ensaiado.
- [ ] Aprovação jurídica/fiscal e de privacidade.
