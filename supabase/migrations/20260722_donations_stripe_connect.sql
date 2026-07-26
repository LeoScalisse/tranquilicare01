-- TranquiliCare: donation ledger for Stripe Connect destination charges.
-- Run after supabase/schema.sql. Do not expose service-role writes to the browser.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'donation_status') then
    create type public.donation_status as enum ('pending', 'succeeded', 'failed', 'refunded');
  end if;
end
$$;

create table if not exists public.ngo_payment_accounts (
  ngo_id text primary key,
  stripe_account_id text not null unique check (stripe_account_id like 'acct_%'),
  onboarding_complete boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references auth.users(id) on delete set null,
  ngo_id text not null,
  campaign_id text,
  stripe_account_id text not null check (stripe_account_id like 'acct_%'),
  amount_cents integer not null check (amount_cents >= 100),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  total_cents integer generated always as (amount_cents + platform_fee_cents) stored,
  currency text not null default 'brl' check (currency = 'brl'),
  status public.donation_status not null default 'pending',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.ngo_payment_accounts enable row level security;
alter table public.donations enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop trigger if exists ngo_payment_accounts_touch_updated_at on public.ngo_payment_accounts;
create trigger ngo_payment_accounts_touch_updated_at
before update on public.ngo_payment_accounts
for each row execute function public.touch_updated_at();

drop trigger if exists donations_touch_updated_at on public.donations;
create trigger donations_touch_updated_at
before update on public.donations
for each row execute function public.touch_updated_at();

-- The browser can see only its own donation history. Creation and status changes
-- happen from trusted Edge Functions using the service role.
revoke all on public.ngo_payment_accounts from anon, authenticated;
revoke all on public.donations from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;

grant select on public.donations to authenticated;

drop policy if exists "donations_select_own" on public.donations;
create policy "donations_select_own"
on public.donations
for select
to authenticated
using (donor_id = auth.uid());
