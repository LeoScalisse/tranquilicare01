import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap((entry) => {
  const path = resolve(directory, entry);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.(ts|tsx)$/.test(entry) && !path.includes(`${resolve('src', 'lib', '__tests__')}`)
    ? [path]
    : [];
});

describe('data architecture boundaries', () => {
  it('keeps Supabase Storage calls inside its adapter', () => {
    expect(read('src/lib/profileMedia.ts')).not.toContain('supabase.storage');
    expect(read('src/data/supabase/supabase-media-storage.ts')).toContain('.storage');
    expect(read('src/domain/media/media-storage.ts')).not.toContain('SupabaseClient');
  });

  it('never exposes service-role configuration in frontend source', () => {
    const frontend = sourceFiles(resolve(process.cwd(), 'src'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    expect(frontend).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|service_role/i);
  });

  it('records provider-neutral media and idempotent payment constraints', () => {
    const migration = read('supabase/migrations/20260822011941_domain_data_architecture.sql');
    const paymentMigration = read('supabase/migrations/20260821000100_provider_agnostic_payments.sql');
    expect(migration).toContain('create table if not exists public.media_assets');
    expect(migration).toContain('provider text not null');
    expect(migration).toContain('storage_key text');
    expect(paymentMigration).toContain('unique (provider, provider_event_id)');
  });

  it('keeps draft story media private and binds media to the story organization', () => {
    const hardening = read('supabase/migrations/20260822023000_security_hardening.sql');
    expect(hardening).toContain("alter column visibility set default 'private'");
    expect(hardening).toContain("set public = false");
    expect(hardening).toContain('stories_media_select_published_or_member');
    expect(hardening).toContain('validate_story_media_organization');
    expect(hardening).toContain("story.status = 'published'");
  });

  it('authorizes payment details before contacting the provider', () => {
    const handler = read('supabase/functions/_shared/payments/http/confirm-payment-handler.ts');
    expect(handler).toContain('authorizePaymentConfirmation');
    expect(handler).toContain('confirmation_token_hash');
    expect(handler.indexOf('await authorizePaymentConfirmation')).toBeLessThan(
      handler.indexOf('const runtime = createPaymentRuntime'),
    );
  });
  it('rate-limits payment creation atomically without storing raw client identifiers', () => {
    const migration = read('supabase/migrations/20260824000300_payment_rate_limits.sql');
    const handler = read('supabase/functions/_shared/payments/http/create-payment-handler.ts');
    const limiter = read('supabase/functions/_shared/payments/security/payment-rate-limit.ts');

    expect(migration).toContain('consume_payment_rate_limit');
    expect(migration).toContain('security definer');
    expect(migration).toContain('request_count < p_limit');
    expect(handler).toContain('assertCreatePaymentAllowed');
    expect(limiter).toContain('SHA-256');
    expect(migration).not.toContain('payer_email');
    expect(migration).not.toContain('ip_address');
  });
  it('hardens legacy SECURITY DEFINER functions with an empty search path', () => {
    const hardening = read('supabase/migrations/20260831235900_harden_function_search_paths.sql');

    expect(hardening).toContain('alter function public.consume_payment_rate_limit');
    expect(hardening).toContain('alter function public.cleanup_payment_rate_limits');
    expect(hardening).toContain('alter function public.update_platform_impact_stats');
    expect(hardening.match(/set search_path = ''/g)).toHaveLength(3);
  });
  it('keeps Mercado Pago OAuth credentials private and encrypted', () => {
    const migration = read('supabase/migrations/20260824000200_mercado_pago_marketplace_oauth.sql');
    expect(migration).toContain('create table if not exists public.payment_recipient_credentials');
    expect(migration).toContain('create table if not exists public.payment_oauth_states');
    expect(migration).toContain('encrypted_access_token text not null');
    expect(migration).toContain('encrypted_refresh_token text not null');
    expect(migration).toContain('state_hash text not null unique');
    expect(migration).toContain('alter table public.payment_recipient_credentials enable row level security');
    expect(migration).toContain('alter table public.payment_oauth_states enable row level security');
    expect(migration).toContain('revoke all on table public.payment_recipient_credentials from public, anon, authenticated');
    expect(migration).toContain('revoke all on table public.payment_oauth_states from public, anon, authenticated');
    expect(migration).not.toMatch(/\baccess_token\s+text\b/);
    expect(migration).not.toMatch(/\brefresh_token\s+text\b/);
  });
  it('implements single-use server-side Mercado Pago OAuth endpoints', () => {
    const repository = read('supabase/functions/_shared/payments/infrastructure/supabase-mercado-pago-oauth-repository.ts');
    const connect = read('supabase/functions/_shared/payments/http/mercado-pago-connect-handler.ts');
    const callback = read('supabase/functions/_shared/payments/http/mercado-pago-oauth-callback-handler.ts');
    const config = read('supabase/config.toml');
    expect(repository).toContain('.is("consumed_at", null)');
    expect(repository).not.toContain('.eq("consumed_at", null)');
    expect(repository).toContain('.gt("expires_at", consumedAt)');
    expect(repository).toContain('.in("role", MANAGER_ROLES)');
    expect(repository).toContain('encrypted_access_token');
    expect(repository).toContain('encrypted_refresh_token');
    expect(repository).toContain('.eq("refreshed_at", current.refreshedAt)');
    expect(connect).toContain('auth.getUser');
    expect(connect.indexOf('auth.getUser')).toBeLessThan(connect.indexOf('service.begin'));
    expect(callback).not.toContain('accessToken');
    expect(callback).not.toContain('refreshToken');
    expect(callback).toContain('url.searchParams.set("reason", reason)');
    expect(config).toContain('[functions.mercado-pago-connect]');
    expect(config).toContain('[functions.mercado-pago-oauth-callback]');
    expect(config).toContain('[functions.mercado-pago-connection]');
  });
  it('routes live Mercado Pago operations through the original NGO credential', () => {
    const runtime = read('supabase/functions/_shared/payments/infrastructure/payment-runtime.ts');
    const createHandler = read('supabase/functions/_shared/payments/http/create-payment-handler.ts');
    const confirmHandler = read('supabase/functions/_shared/payments/http/confirm-payment-handler.ts');
    const webhookHandler = read('supabase/functions/_shared/payments/http/payment-webhook-handler.ts');
    expect(runtime).toContain('options.mercadoPago');
    expect(createHandler).toContain('createMercadoPagoProviderOptions(adminClient)');
    expect(confirmHandler).toContain('recipient_id');
    expect(confirmHandler).toContain('recipientId: payment.recipient_id');
    expect(webhookHandler).toContain('recipientId: localPayment?.recipient_id');
  });
  it('derives donation readiness from a usable live recipient and enforces institutional eligibility server-side', () => {
    const migration = read('supabase/migrations/20260912115207_align_payment_readiness_with_live_recipient.sql');
    const paymentRepository = read('supabase/functions/_shared/payments/infrastructure/supabase-payment-repository.ts');
    const oauthRepository = read('supabase/functions/_shared/payments/infrastructure/supabase-mercado-pago-oauth-repository.ts');
    expect(migration).toContain('organization_has_active_payment_connection');
    expect(migration).toContain('recipient.livemode = true');
    expect(migration).toContain('credential.disconnected_at is null');
    expect(migration).toContain('credential.expires_at > now()');
    expect(migration).toContain("ngo.verification_status = 'verified'");
    expect(paymentRepository).toContain("organization?.status === 'active'");
    expect(paymentRepository).toContain("ngo?.verification_status === 'verified'");
    expect(paymentRepository).toContain('if (!data.livemode)');
    expect(oauthRepository).toContain('organization_uuid: connection.organizationId');
  });
  it('keeps production opt-in and reconciliation private', () => {
    const connect = read('supabase/functions/_shared/payments/http/mercado-pago-connect-handler.ts');
    const status = read('supabase/functions/_shared/payments/http/mercado-pago-connection-handler.ts');
    const reconciliation = read('supabase/functions/_shared/payments/http/reconcile-payments-handler.ts');
    const config = read('supabase/config.toml');
    expect(connect).toContain('MERCADO_PAGO_OAUTH_LIVEMODE") === "true"');
    expect(status).toContain('MERCADO_PAGO_OAUTH_LIVEMODE") === "true"');
    expect(reconciliation).toContain('authorizePaymentOperationsRequest');
    expect(reconciliation).toContain('payment_reconciliations');
    expect(reconciliation).toContain('recipientId: payment.recipient_id');
    expect(config).toContain('[functions.reconcile-payments]');
  });
  it('keeps the Mercado Pago connection private and available only in the organization setup', () => {
    const onboarding = read('src/components/ngo-profile/NGOOnboardingFlow.tsx');
    const publicProfile = read('src/pages/NGOPublicProfile.tsx');
    expect(onboarding).toContain('MercadoPagoConnectionCard');
    expect(publicProfile).not.toContain('MercadoPagoConnectionCard');
  });
  it('restricts organization review to platform admins and synchronizes donation eligibility', () => {
    const migration = read('supabase/migrations/20260912163417_secure_organization_verification_reviews.sql');
    const grants = read('supabase/migrations/20260912165405_grant_admin_verification_view_dependencies.sql');
    const stateSync = read('supabase/migrations/20260912170020_allow_internal_verification_state_sync.sql');
    expect(migration).toContain('organization_verifications_platform_admin_update');
    expect(migration).toContain('private.platform_administrators');
    expect(migration).toContain('platform_admin_access_required');
    expect(migration).toContain('with (security_invoker = true)');
    expect(migration).toContain('organization_has_active_payment_connection');
    expect(migration).toContain("verification_status = 'verified'");
    expect(migration).toContain("payment_status = case when payment_connection_ready then 'enabled'");
    expect(migration).toContain('after insert or update of');
    expect(grants).toContain('admin_list_organization_verifications');
    expect(grants).toContain('if not public.get_platform_admin_access()');
    expect(grants).toContain('set search_path =');
    expect(grants).not.toContain('grant select on table public.organizations');
    expect(stateSync).toContain('pg_trigger_depth() <= 1');
    expect(stateSync).toContain('is_direct_client_write');
  });
  it('awards category badges only from confirmed donations and limits client writes', () => {
    const migration = read('supabase/migrations/20260824000100_donor_category_badges.sql');
    expect(migration).toContain('create table if not exists public.badge_catalog');
    expect(migration).toContain('create table if not exists public.profile_badges');
    expect(migration).toContain("new.status <> 'succeeded'");
    expect(migration).toContain('donations_award_category_badge');
    expect(migration).toContain('grant update (selected, display_order)');
    expect(migration).toContain('revoke all on function public.award_donation_category_badge() from public');
  });
});
