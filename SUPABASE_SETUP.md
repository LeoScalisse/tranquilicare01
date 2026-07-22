# Configurar o Supabase + login com Google

O código já está pronto. Falta só a parte que só pode ser feita no navegador —
criar o projeto e ligar o Google. Enquanto isso não for feito, o app continua
funcionando normalmente com o login local (mock).

Leva ~15 minutos.

---

## 1. Criar o projeto no Supabase

1. Entre em <https://supabase.com/dashboard> e clique em **New project**.
2. Escolha um nome (ex.: `tranquilicare`), uma senha de banco e a região
   **South America (São Paulo)** — menor latência para o Brasil.
3. Espere provisionar (~2 min).

## 2. Copiar as chaves para o `.env`

Em **Project Settings → API**, copie:

| Campo no painel | Variável no `.env` |
|---|---|
| Project URL | `VITE_SUPABASE_URL` |
| `anon` / `publishable` key | `VITE_SUPABASE_ANON_KEY` |

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> Essas duas chaves são públicas por natureza — elas vão dentro do JavaScript
> que roda no navegador. Quem protege os dados é o Row Level Security, nunca o
> segredo dessas chaves. A `service_role` key, essa sim, **nunca** entra aqui.

Depois de editar o `.env`, **reinicie o `npm run dev`** — o Vite só lê as
variáveis na inicialização.

## 3. Credenciais do Google (Google Cloud Console)

1. Acesse <https://console.cloud.google.com/apis/credentials> e crie/selecione um projeto.
2. **OAuth consent screen**: tipo *External*, preencha nome do app, e-mail de
   suporte e e-mail do desenvolvedor. Salve.
3. **Create credentials → OAuth client ID → Web application**.
4. Em **Authorized redirect URIs**, cole **exatamente** a URL de callback do
   Supabase (aparece no passo 4, formato):
   ```
   https://<SEU-PROJETO>.supabase.co/auth/v1/callback
   ```
5. Copie o **Client ID** e o **Client secret**.

## 4. Ligar o Google no Supabase

Em **Authentication → Providers → Google**:

- Ative o toggle.
- Cole o **Client ID** e o **Client Secret** do passo 3.
- Salve. A URL de callback mostrada aí é a que vai no passo 3.4.

## 5. Liberar as URLs de retorno do app

Em **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:8080` (troque pela URL de produção quando publicar).
- **Redirect URLs** — adicione **todas** estas, uma por linha:
  ```
  http://localhost:8080/auth/callback
  http://localhost:8081/auth/callback
  https://SEU-DOMINIO.com/auth/callback
  ```

> As duas portas locais são necessárias porque o Vite pula para a 8081 quando a
> 8080 já está ocupada. Se a URL não estiver nessa lista, o Google até
> autentica, mas o retorno para o app falha.

## 6. Confirmação de e-mail

Em **Authentication → Sign In / Providers → Email**, a opção
**Confirm email** vem **ligada** por padrão.

- **Ligada** (recomendado em produção): ao criar conta com e-mail/senha, o app
  mostra a tela *"Confirme seu e-mail"* e a pessoa precisa clicar no link. Já
  está implementado.
- **Desligada** (mais rápido para testar agora): o cadastro já entra direto.

O login com Google **não** passa por isso — o e-mail já vem verificado pelo
Google. Por isso ele é o caminho rápido.

---

## Como o código está organizado

| Arquivo | Papel |
|---|---|
| `src/lib/supabase.ts` | Cria o client. Vira `null` se faltarem as chaves. |
| `src/lib/auth.ts` | **Fachada** — é o único import das telas. |
| `src/lib/authSupabase.ts` | Implementação real (sessão, Google, metadata). |
| `src/lib/authLocal.ts` | Mock usado enquanto o Supabase não está configurado. |
| `src/pages/AuthCallback.tsx` | Rota `/auth/callback` — recebe o retorno do Google. |

O tipo de conta (`donor` / `ngo`) fica em `user_metadata.account_type`. No
Google, que não tem formulário, a escolha é guardada em `localStorage` antes do
redirect e gravada na conta ao voltar.

## Ainda pendente (fora do escopo desta etapa)

- **Banco de dados**: ONGs, vaquinhas e doações ainda vêm de `src/data/*.ts`
  (dados de demonstração). Nada disso está no Supabase ainda.
- **Créditos** do doador vivem em `user_metadata`, não em tabela.
- Migrar `account_type` para uma tabela `profiles` com RLS quando o banco vier —
  metadata não dá para consultar nem cruzar com outras tabelas.
- **Stripe** continua removido.
