-- Provider-agnostic payment model. This migration is additive and preserves
-- every legacy Stripe column/table for rollback and historical compatibility.

alter table public.donations
  add column if not exists payment_provider text not null default 'stripe',
  add column if not exists payment_method text not null default 'card',
  add column if not exists provider_recipient_id text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_action_id text,
  add column if not exists provider_transfer_id text,
  add column if not exists processing_fee_cents integer,
  add column if not exists amount_to_recipient_cents integer,
  add column if not exists paid_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists refunded_at timestamptz;

-- Future providers do not issue acct_ identifiers. Keep the old column for
-- Stripe history, but stop requiring it for every new donation.
alter table public.donations
  alter column stripe_account_id drop not null;
alter table public.donations
  drop constraint if exists donations_stripe_account_id_check;

update public.donations
set payment_provider = 'stripe',
    payment_method = 'card',
    provider_recipient_id = coalesce(provider_recipient_id, stripe_account_id),
    provider_payment_id = coalesce(provider_payment_id, stripe_payment_intent_id),
    provider_action_id = coalesce(provider_action_id, stripe_checkout_session_id),
    amount_to_recipient_cents = coalesce(amount_to_recipient_cents, amount_cents),
    paid_at = case when status = 'succeeded' then coalesce(paid_at, updated_at) else paid_at end,
    failed_at = case when status = 'failed' then coalesce(failed_at, updated_at) else failed_at end,
    refunded_at = case when status = 'refunded' then coalesce(refunded_at, updated_at) else refunded_at end;

alter table public.donations
  drop constraint if exists donations_payment_method_check;
alter table public.donations
  add constraint donations_payment_method_check
  check (payment_method in ('card', 'pix', 'boleto'));

alter table public.donations
  drop constraint if exists donations_processing_fee_cents_check;
alter table public.donations
  add constraint donations_processing_fee_cents_check
  check (processing_fee_cents is null or processing_fee_cents >= 0);

alter table public.donations
  drop constraint if exists donations_amount_to_recipient_cents_check;
alter table public.donations
  add constraint donations_amount_to_recipient_cents_check
  check (amount_to_recipient_cents is null or amount_to_recipient_cents >= 0);

create index if not exists donations_provider_action_idx
on public.donations (payment_provider, provider_action_id)
where provider_action_id is not null;

create index if not exists donations_provider_payment_idx
on public.donations (payment_provider, provider_payment_id)
where provider_payment_id is not null;

create table if not exists public.payment_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  provider text not null,
  provider_recipient_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'restricted', 'disabled')),
  livemode boolean not null default false,
  capabilities jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, livemode),
  unique (provider, provider_recipient_id, livemode)
);

insert into public.payment_recipients (
  organization_id,
  provider,
  provider_recipient_id,
  status,
  livemode,
  capabilities,
  metadata,
  created_at,
  updated_at
)
select
  ngo_id,
  'stripe',
  stripe_account_id,
  case
    when onboarding_complete and charges_enabled and payouts_enabled then 'active'
    when onboarding_complete then 'restricted'
    else 'pending'
  end,
  false,
  jsonb_build_object(
    'charges', charges_enabled,
    'payouts', payouts_enabled,
    'split', true
  ),
  jsonb_build_object(
    'source', 'legacy_ngo_payment_accounts',
    'livemode_assumed', false
  ),
  created_at,
  updated_at
from public.ngo_payment_accounts
on conflict (organization_id, provider, livemode) do update
set provider_recipient_id = excluded.provider_recipient_id,
    status = excluded.status,
    capabilities = excluded.capabilities,
    metadata = public.payment_recipients.metadata || excluded.metadata,
    updated_at = excluded.updated_at;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete restrict,
  recipient_id uuid references public.payment_recipients(id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  provider_action_id text,
  provider_transfer_id text,
  payment_method text not null check (payment_method in ('card', 'pix', 'boleto')),
  currency text not null default 'brl',
  donation_amount_cents integer not null check (donation_amount_cents >= 50),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  processing_fee_cents integer check (processing_fee_cents is null or processing_fee_cents >= 0),
  total_amount_cents integer not null check (total_amount_cents >= 50),
  expected_recipient_amount_cents integer not null check (expected_recipient_amount_cents >= 0),
  actual_recipient_amount_cents integer check (actual_recipient_amount_cents is null or actual_recipient_amount_cents >= 0),
  status text not null default 'created'
    check (status in ('created', 'pending', 'paid', 'failed', 'canceled', 'refunded', 'partially_refunded', 'disputed')),
  failure_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  failed_at timestamptz,
  canceled_at timestamptz,
  refunded_at timestamptz,
  check (total_amount_cents = donation_amount_cents + platform_fee_cents)
);

create unique index if not exists payments_provider_payment_unique
on public.payments (provider, provider_payment_id)
where provider_payment_id is not null;

create unique index if not exists payments_provider_action_unique
on public.payments (provider, provider_action_id)
where provider_action_id is not null;

create index if not exists payments_donation_idx on public.payments (donation_id, created_at desc);

insert into public.payments (
  donation_id,
  recipient_id,
  provider,
  provider_payment_id,
  provider_action_id,
  payment_method,
  currency,
  donation_amount_cents,
  platform_fee_cents,
  processing_fee_cents,
  total_amount_cents,
  expected_recipient_amount_cents,
  status,
  metadata,
  created_at,
  updated_at,
  paid_at,
  failed_at,
  refunded_at
)
select
  donation.id,
  recipient.id,
  coalesce(donation.payment_provider, 'stripe'),
  donation.provider_payment_id,
  donation.provider_action_id,
  donation.payment_method,
  donation.currency,
  donation.amount_cents,
  donation.platform_fee_cents,
  donation.processing_fee_cents,
  donation.total_cents,
  coalesce(donation.amount_to_recipient_cents, donation.amount_cents),
  case donation.status
    when 'succeeded' then 'paid'
    when 'failed' then 'failed'
    when 'refunded' then 'refunded'
    else 'pending'
  end,
  jsonb_build_object('source', 'legacy_donations_backfill'),
  donation.created_at,
  donation.updated_at,
  donation.paid_at,
  donation.failed_at,
  donation.refunded_at
from public.donations as donation
left join public.payment_recipients as recipient
  on recipient.provider = coalesce(donation.payment_provider, 'stripe')
 and recipient.provider_recipient_id = donation.provider_recipient_id
where not exists (
  select 1 from public.payments as existing
  where existing.donation_id = donation.id
    and existing.provider = coalesce(donation.payment_provider, 'stripe')
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payment_id uuid references public.payments(id) on delete set null,
  donation_id uuid references public.donations(id) on delete set null,
  event_type text not null,
  provider_payload jsonb,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processing', 'processed', 'failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  unique (provider, provider_event_id)
);

insert into public.payment_events (
  provider,
  provider_event_id,
  event_type,
  processing_status,
  received_at,
  processed_at
)
select
  'stripe',
  id,
  case
    when event_type in ('checkout.session.completed', 'checkout.session.async_payment_succeeded', 'payment_intent.succeeded')
      then 'payment.paid'
    when event_type in ('checkout.session.async_payment_failed', 'payment_intent.payment_failed')
      then 'payment.failed'
    else 'payment.pending'
  end,
  'processed',
  processed_at,
  processed_at
from public.stripe_webhook_events
on conflict (provider, provider_event_id) do nothing;

create table if not exists public.payment_reconciliations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  provider text not null,
  internal_status text not null,
  provider_status text,
  matches boolean not null,
  differences jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null default now(),
  error_message text
);

drop trigger if exists payment_recipients_touch_updated_at on public.payment_recipients;
create trigger payment_recipients_touch_updated_at
before update on public.payment_recipients
for each row execute function public.touch_updated_at();

drop trigger if exists payments_touch_updated_at on public.payments;
create trigger payments_touch_updated_at
before update on public.payments
for each row execute function public.touch_updated_at();

alter table public.payment_recipients enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_reconciliations enable row level security;

revoke all on public.payment_recipients from anon, authenticated;
revoke all on public.payment_events from anon, authenticated;
revoke all on public.payment_reconciliations from anon, authenticated;
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.donations
    where donations.id = payments.donation_id
      and donations.donor_id = (select auth.uid())
  )
);

comment on table public.ngo_payment_accounts is
  'Deprecated compatibility table for the first Stripe-only implementation. Use payment_recipients.';
comment on column public.donations.stripe_account_id is
  'Deprecated provider-specific compatibility field. Use payment_provider and provider_recipient_id.';
comment on column public.donations.stripe_checkout_session_id is
  'Deprecated provider-specific compatibility field. Use provider_action_id.';
comment on column public.donations.stripe_payment_intent_id is
  'Deprecated provider-specific compatibility field. Use provider_payment_id.';
comment on table public.stripe_webhook_events is
  'Deprecated Stripe-only event ledger. Use payment_events with provider + provider_event_id idempotency.';
