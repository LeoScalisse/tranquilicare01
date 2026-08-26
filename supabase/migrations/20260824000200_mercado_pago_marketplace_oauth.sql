-- Secure OAuth credential storage for Mercado Pago Split Payments 1:1.
-- Token plaintext is encrypted in Edge Functions before it reaches Postgres.

create table if not exists public.payment_recipient_credentials (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null unique
    references public.payment_recipients(id) on delete cascade,
  provider text not null default 'mercado_pago'
    check (provider = 'mercado_pago'),
  provider_user_id text not null,
  encrypted_access_token text not null
    check (encrypted_access_token ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  encrypted_refresh_token text not null
    check (encrypted_refresh_token ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  token_type text not null default 'bearer',
  scopes text[] not null default '{}'::text[],
  live_mode boolean not null default false,
  expires_at timestamptz not null,
  refreshed_at timestamptz not null default now(),
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists payment_recipient_credentials_expiry_idx
on public.payment_recipient_credentials (expires_at)
where disconnected_at is null;

drop trigger if exists payment_recipient_credentials_touch_updated_at
on public.payment_recipient_credentials;
create trigger payment_recipient_credentials_touch_updated_at
before update on public.payment_recipient_credentials
for each row execute function public.touch_updated_at();

create table if not exists public.payment_oauth_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  initiated_by uuid not null
    references public.profiles(id) on delete cascade,
  provider text not null default 'mercado_pago'
    check (provider = 'mercado_pago'),
  state_hash text not null unique
    check (state_hash ~ '^[a-f0-9]{64}$'),
  encrypted_code_verifier text not null
    check (encrypted_code_verifier ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  redirect_uri text not null check (redirect_uri ~ '^https://'),
  requested_live_mode boolean not null default false,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '15 minutes'),
  check (consumed_at is null or consumed_at >= created_at)
);

create index if not exists payment_oauth_states_pending_idx
on public.payment_oauth_states (expires_at)
where consumed_at is null;

alter table public.payment_recipient_credentials enable row level security;
alter table public.payment_oauth_states enable row level security;

revoke all on table public.payment_recipient_credentials from public, anon, authenticated;
revoke all on table public.payment_oauth_states from public, anon, authenticated;
grant select, insert, update, delete on table public.payment_recipient_credentials to service_role;
grant select, insert, update, delete on table public.payment_oauth_states to service_role;

comment on table public.payment_recipient_credentials is
  'Server-only encrypted OAuth credentials for payment recipients. Never expose through client queries or logs.';
comment on table public.payment_oauth_states is
  'Single-use, expiring OAuth state and encrypted PKCE verifier. Server-only.';