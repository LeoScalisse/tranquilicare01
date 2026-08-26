# Plano de implementação: Mercado Pago em produção

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Use `superpowers:test-driven-development` for every production-code change and `superpowers:verification-before-completion` before claiming readiness.

**Goal:** habilitar PIX real no Mercado Pago Split 1:1 com onboarding OAuth seguro das ONGs e ativação progressiva.

**Architecture:** o frontend solicita conexão e pagamentos às Supabase Edge Functions. O backend armazena credenciais OAuth criptografadas, resolve o token da ONG recebedora, cria `/v1/payments` com `application_fee` e confirma estados exclusivamente por API/webhook. Sandbox continua isolado do modo real.

**Tech Stack:** React, TypeScript, Supabase Postgres/Edge Functions (Deno), Mercado Pago OAuth/Payments API, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-24-mercado-pago-production.md`

**Global Constraints:** não expor segredos, não capturar pagamento real automaticamente, não habilitar produção antes do piloto, preservar mudanças locais existentes.

---

### Task 1: Criar a base segura de credenciais OAuth

**Files:**
- Create: `supabase/migrations/20260824000200_mercado_pago_marketplace_oauth.sql`
- Create: `supabase/functions/_shared/payments/security/credential-crypto.ts`
- Test: `supabase/functions/_shared/payments/security/credential-crypto.test.ts`
- Test: `src/lib/__tests__/data-architecture.test.ts`

**Steps:**
1. Escrever testes que falhem para round-trip AES-GCM, adulteração, chave inválida e ausência de grants públicos.
2. Criar tabelas de credenciais e estados OAuth com RLS, índices, unicidade e revogação explícita.
3. Implementar envelope criptográfico versionado com Web Crypto.
4. Rodar testes focados até passarem.

### Task 2: Implementar cliente OAuth Mercado Pago

**Files:**
- Create: `supabase/functions/_shared/payments/providers/mercado-pago/mercado-pago-oauth-client.ts`
- Test: `supabase/functions/_shared/payments/providers/mercado-pago/mercado-pago-oauth-client.test.ts`

**Steps:**
1. Testar geração PKCE, URL de autorização, troca e renovação de token com HTTP falso.
2. Implementar Authorization Code + PKCE e refresh token.
3. Garantir erros sanitizados e nenhum segredo em mensagens.

### Task 3: Criar funções de conectar, callback, status e desconectar ONG

**Files:**
- Create: `supabase/functions/mercado-pago-connect/index.ts`
- Create: `supabase/functions/mercado-pago-oauth-callback/index.ts`
- Create: `supabase/functions/mercado-pago-connection/index.ts`
- Create: `supabase/functions/_shared/payments/handlers/mercado-pago-oauth-handler.ts`
- Test: `supabase/functions/_shared/payments/handlers/mercado-pago-oauth-handler.test.ts`
- Modify: `supabase/config.toml`

**Steps:**
1. Testar autenticação, papel owner/admin/finance, state expirado/reutilizado e callback válido.
2. Persistir apenas tokens criptografados.
3. Retornar ao perfil da ONG com status sanitizado.
4. Permitir desconexão autenticada sem apagar histórico financeiro.

### Task 4: Resolver credencial da ONG no domínio de pagamentos

**Files:**
- Modify: `supabase/functions/_shared/payments/domain/payment.types.ts`
- Modify: `supabase/functions/_shared/payments/infrastructure/supabase-payment-repository.ts`
- Modify: `supabase/functions/_shared/payments/infrastructure/payment-runtime.ts`
- Test: `supabase/functions/_shared/payments/infrastructure/supabase-payment-repository.test.ts`

**Steps:**
1. Testar recebedor conectado, expirado, sandbox e ausente.
2. Descriptografar somente dentro da Edge Function.
3. Renovar token próximo ao vencimento com lock/idempotência.
4. Falhar fechado se a ONG não estiver pronta para produção.

### Task 5: Implementar PIX real com Split 1:1

**Files:**
- Modify: `supabase/functions/_shared/payments/providers/mercado-pago/mercado-pago-provider.ts`
- Modify: `supabase/functions/_shared/payments/providers/mercado-pago/mercado-pago-provider.test.ts`

**Steps:**
1. Escrever teste vermelho para `/v1/payments`, token do vendedor, `transaction_amount`, `application_fee`, idempotency key e QR Code.
2. Preservar o fluxo sandbox atual.
3. Mapear resposta/status real sem registrar payload sensível.
4. Testar falhas, duplicidade e token ausente.

### Task 6: Confirmar e receber webhooks com a credencial correta

**Files:**
- Modify: `supabase/functions/_shared/payments/handlers/confirm-payment-handler.ts`
- Modify: `supabase/functions/_shared/payments/handlers/payment-webhook-handler.ts`
- Modify tests correspondentes.

**Steps:**
1. Testar consulta usando o recebedor da tentativa original.
2. Validar assinatura antes de qualquer chamada ao provedor.
3. Preservar idempotência de evento e impedir regressão de status.
4. Cobrir eventos duplicados, fora de ordem e pagamento desconhecido.

### Task 7: Adicionar proteção contra abuso e observabilidade

**Files:**
- Create migration de limites/auditoria se necessário.
- Modify: `create-payment` e `confirm-payment` handlers.
- Add tests focados.

**Steps:**
1. Aplicar rate limit por origem/doação sem armazenar IP bruto.
2. Usar chave de idempotência estável por tentativa.
3. Emitir logs estruturados apenas com IDs internos e códigos sanitizados.
4. Documentar alertas para falhas de criação, webhook e reconciliação.

### Task 8: Adicionar conexão Mercado Pago ao perfil da ONG

**Files:**
- Create: `src/components/ngo-profile/MercadoPagoConnectionCard.tsx`
- Modify: `src/pages/NGOAccountProfile.tsx`
- Add tests do componente.

**Steps:**
1. Testar estados desconectado, conectando, conectado, expiração e erro.
2. Abrir OAuth somente por ação do administrador.
3. Não mostrar nenhum token ou credencial.
4. Bloquear recebimento real enquanto conexão/validação não estiver pronta.

### Task 9: Verificação e piloto de produção

**Files:**
- Create: `docs/mercado-pago-production-runbook.md`
- Update: `docs/payments-architecture.md`

**Steps:**
1. Rodar testes focados, suíte completa, lint e build.
2. Aplicar migration e deploy das funções mantendo livemode falso.
3. Configurar app Marketplace, Redirect URL, PKCE e secrets reais no painel.
4. Conectar uma ONG piloto verificada.
5. Executar manualmente um PIX real de baixo valor, conferir split/webhook/consulta/conciliação.
6. Registrar rollback e só então ativar livemode para o piloto.
