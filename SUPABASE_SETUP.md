# Configurar o Supabase + login com Google

O codigo ja esta pronto. Falta so a parte que precisa ser feita no navegador:
criar o projeto, ligar o Google e rodar o schema. Enquanto isso nao for feito, o
app continua funcionando normalmente com o login local (mock).

Leva cerca de 15 minutos.

---

## 1. Criar o projeto no Supabase

1. Entre em <https://supabase.com/dashboard> e clique em **New project**.
2. Escolha um nome, por exemplo `tranquilicare`, uma senha de banco e a regiao
   **South America (Sao Paulo)** para menor latencia no Brasil.
3. Espere provisionar.

## 2. Copiar as chaves para o `.env`

Em **Project Settings > API**, copie:

| Campo no painel | Variavel no `.env` |
|---|---|
| Project URL | `VITE_SUPABASE_URL` |
| `anon` / `publishable` key | `VITE_SUPABASE_ANON_KEY` ou `VITE_SUPABASE_PUBLISHABLE_KEY` |

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Essas duas chaves sao publicas por natureza; elas vao dentro do JavaScript que
roda no navegador. Quem protege os dados e o Row Level Security. A
`service_role` key nunca entra no frontend.

Depois de editar o `.env`, reinicie o `npm run dev`, porque o Vite so le as
variaveis na inicializacao.

## 3. Credenciais do Google (Google Cloud Console)

1. Acesse <https://console.cloud.google.com/apis/credentials> e crie/selecione um projeto.
2. Em **OAuth consent screen**, use o tipo **External**, preencha nome do app,
   e-mail de suporte e e-mail do desenvolvedor. Salve.
3. Em **Create credentials > OAuth client ID > Web application**, crie o client.
4. Em **Authorized redirect URIs**, cole exatamente a URL de callback do
   Supabase:

```text
https://<SEU-PROJETO>.supabase.co/auth/v1/callback
```

5. Copie o **Client ID** e o **Client secret**.

## 4. Ligar o Google no Supabase

Em **Authentication > Providers > Google**:

- Ative o toggle.
- Cole o **Client ID** e o **Client Secret** do passo 3.
- Salve. A URL de callback mostrada ali e a que vai no passo 3.4.

## 5. Liberar as URLs de retorno do app

Em **Authentication > URL Configuration**:

- **Site URL**: `http://localhost:8080` (troque pela URL de producao quando publicar).
- **Redirect URLs**: adicione todas estas, uma por linha:

```text
http://localhost:8080/auth/callback
http://localhost:8081/auth/callback
https://SEU-DOMINIO.com/auth/callback
```

As duas portas locais ajudam porque o Vite pode usar 8081 quando a 8080 ja esta
ocupada. Se a URL nao estiver nessa lista, o Google autentica, mas o retorno
para o app falha.

## 6. Confirmacao de e-mail

Em **Authentication > Sign In / Providers > Email**, a opcao **Confirm email**
vem ligada por padrao.

- Ligada, recomendado em producao: ao criar conta com e-mail/senha, o app mostra
  a tela "Confirme seu e-mail" e a pessoa precisa clicar no link.
- Desligada, mais rapido para testar agora: o cadastro ja entra direto.

O login com Google nao passa por isso; o e-mail ja vem verificado pelo Google.

### Confirmacao por codigo

Para o fluxo atual do app, edite o template **Confirm signup**, mantenha `{{ .Token }}` visivel no HTML e use o modelo pronto em `supabase/email_templates/confirm-signup.html`. Remova o link `{{ .ConfirmationURL }}` se quiser somente o codigo.

O app confirma com `verifyOtp({ email, token, type: 'email' })` e reenvia com `resend({ type: 'signup' })`.

O Supabase hospedado usa 6 digitos por padrao. Se quiser manter o formato visual 4 + 4, configure o comprimento do OTP de email como 8 no painel. O app aceita codigos de 6 a 8 digitos para nao bloquear contas enquanto essa configuracao estiver divergente. O modelo separa automaticamente codigos de 8 digitos em grupos de 4 com um hifen. O app remove essa separacao antes de validar. O modelo usa a logo em `/tranquilicare-logo.png`. Em producao, essa imagem precisa estar publicada em uma URL HTTPS acessivel; em testes locais, o Gmail nao consegue acessar `localhost`.

### Quando o email nao chega

1. Abra **Logs > Logs Explorer**, selecione a fonte **Auth** e confira o horario da tentativa.
2. Se estiver usando o SMTP padrao do Supabase, ele envia apenas para enderecos autorizados da equipe e permite somente 2 mensagens por hora. O app tambem bloqueia o reenvio por 60 segundos para respeitar a janela minima do Auth.
3. Com SMTP proprio, confirme host, porta, usuario, senha e remetente; depois veja o log de entrega do provedor.
4. Verifique Spam/Promocoes e a lista de supressao/bounces do provedor. Se houver rastreamento de links, desative-o para emails do Auth.

## 7. Rodar o schema seguro de perfis

Depois que Auth estiver funcionando, abra o **SQL Editor** do Supabase e rode o
arquivo versionado neste projeto:

```text
supabase/schema.sql
```

Ele cria tres camadas de perfil:

- `public.profiles`: identidade comum, com nome, e-mail, avatar e tipo de conta.
- `public.donor_profiles`: dados exclusivos de doadores, com os creditos ainda
  mantidos como compatibilidade ate existir um ledger.
- `public.ngo_profiles`: CNPJ, endereco, descricao, categoria, objetivo,
  Instagram, telefone e status de verificacao da organizacao.

As tres tabelas usam RLS. Cada conta le seus proprios dados; uma ONG so se torna
publicamente legivel quando o status for `approved`. CNPJ e telefone possuem
restricoes de formato no banco, e o navegador nao pode alterar creditos, tipo de
conta ou status.

Se `supabase/schema.sql` ja foi executado anteriormente, rode apenas a migracao
nova no SQL Editor:

```text
supabase/migrations/20260815_organized_user_profiles.sql
```

Ela faz o backfill das contas existentes sem apagar o campo JSON legado. Isso
mantem a aplicacao compativel durante a transicao para as tabelas estruturadas.

O app ja tenta usar essa tabela quando ela existe. Se ela ainda nao foi criada,
ele continua funcionando com fallback em `user_metadata`, para nao quebrar o
fluxo durante a configuracao.


## 8. Pagamentos e repasses com Stripe Connect

A primeira fase do app usa **Stripe Checkout + Connect destination charges**:
se a pessoa informa R$ 100,00, o Checkout mostra R$ 100,00 de doação + R$ 5,00 de taxa TranquiliCare = R$ 105,00. O Stripe transfere a cobrança para a conta conectada da ONG e devolve a application fee para a plataforma. A tarifa de processamento da Stripe ainda é descontada do saldo da plataforma, então os R$ 5,00 são a receita bruta da TranquiliCare, não necessariamente o líquido final.

Antes de aceitar dinheiro real, cada ONG precisa concluir o onboarding do Stripe Connect e ter uma conta `acct_...` com cobranças e repasses habilitados. Os IDs das ONGs atuais ainda são dados de demonstração; não cadastre uma conta Stripe em uma ONG sem validar a identidade e os dados bancários da organização.

### Preparação no Supabase

1. Rode `supabase/migrations/20260722_donations_stripe_connect.sql` no SQL Editor, depois de `supabase/schema.sql`.
2. Em **Edge Functions > Secrets**, cadastre os valores abaixo. Nunca coloque `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` no `.env` do Vite:

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:8080
APP_ORIGIN=http://localhost:8080
```

3. Publique as funções `supabase/functions/create-checkout-session` e `supabase/functions/stripe-webhook`.
4. No Stripe Workbench, crie um webhook para:

```text
https://SEU_PROJETO.supabase.co/functions/v1/stripe-webhook
```

Selecione `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `payment_intent.succeeded` e `payment_intent.payment_failed`. Copie o `whsec_...` desse endpoint para o secret da função.

5. Após uma ONG concluir o Connect, registre a conta vinculada usando o ID real retornado pela Stripe:

```sql
insert into public.ngo_payment_accounts
  (ngo_id, stripe_account_id, onboarding_complete, charges_enabled, payouts_enabled)
values
  ('ID-REAL-DA-ONG', 'acct_XXXXXXXXXXXXXXXX', true, true, true)
on conflict (ngo_id) do update set
  stripe_account_id = excluded.stripe_account_id,
  onboarding_complete = excluded.onboarding_complete,
  charges_enabled = excluded.charges_enabled,
  payouts_enabled = excluded.payouts_enabled,
  updated_at = now();
```

A função rejeita a doação enquanto a conta não estiver pronta. Isso evita cobrar alguém e não ter destino habilitado para o dinheiro.

### Créditos na conta do doador

As colunas `profiles.credits` e `donor_profiles.credits` não devem representar dinheiro real. A segunda existe apenas para iniciar a separação dos dados por tipo de perfil, preservando compatibilidade. Para adicionar créditos pagos e distribuir depois, a próxima fase precisa de um ledger imutável com depósitos, consumo, estornos, chargebacks, idempotência e reconciliação. Também precisamos validar o modelo jurídico e contábil brasileiro antes de manter saldo de terceiros.
## Como o codigo esta organizado

| Arquivo | Papel |
|---|---|
| `src/lib/supabase.ts` | Cria o client. Vira `null` se faltarem as chaves ou se a URL estiver invalida. |
| `src/lib/auth.ts` | Fachada: e o unico import de auth das telas. |
| `src/lib/authSupabase.ts` | Implementacao real: sessao, Google, profiles e fallback em metadata. |
| `src/lib/authLocal.ts` | Mock usado enquanto o Supabase nao esta configurado. |
| `src/pages/AuthCallback.tsx` | Rota `/auth/callback`: recebe o retorno do Google. |
| `supabase/schema.sql` | Schema seguro para perfis comuns, doadores e ONGs, com RLS e RPC de tipo de conta inicial. |

## Ainda pendente

- ONGs, campanhas, doacoes e marketplace ainda vem de `src/data/*.ts` como dados de demonstracao.
- `credits` ja tem coluna protegida no schema, mas ainda falta o fluxo real de pagamentos/doacoes gravando nela por webhook ou funcao segura.
- Para privilegios de ONG, use verificacao/membership em tabela com RLS; nao confie apenas no role visual `account_type`.
- Stripe Checkout/Connect está preparado na migration e nas Edge Functions; falta publicar as funções, concluir o onboarding das ONGs e vincular cada cct_....
