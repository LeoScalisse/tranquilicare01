-- Temporary, server-controlled donation simulation for end-to-end product
-- testing. Test donations are persisted for donor history and NGO relationship
-- workflows, but never call a payment provider or affect public impact totals.

alter table public.donations
  add column if not exists is_test boolean not null default false;

alter table public.donor_relationships
  add column if not exists is_test boolean not null default false;

create table if not exists private.runtime_feature_flags (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table private.runtime_feature_flags enable row level security;
revoke all on table private.runtime_feature_flags from public, anon, authenticated;

insert into private.runtime_feature_flags (key, enabled, updated_at)
values ('donation_simulation', true, now())
on conflict (key) do update
set enabled = excluded.enabled,
    updated_at = excluded.updated_at;

create or replace function public.donation_simulation_status()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select flag.enabled
    from private.runtime_feature_flags as flag
    where flag.key = 'donation_simulation'
  ), false);
$$;

revoke all on function public.donation_simulation_status() from public;
grant execute on function public.donation_simulation_status() to anon, authenticated;

create or replace function public.create_simulated_donation(
  target_organization_id uuid,
  donation_amount_cents integer
)
returns table (
  id uuid,
  amount_cents integer,
  donor_id uuid,
  organization_id uuid,
  created_at timestamptz,
  provider_action_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_donation public.donations%rowtype;
  simulation_enabled boolean := false;
begin
  if current_user_id is null then
    raise exception 'donor-account-required' using errcode = '42501';
  end if;

  select coalesce(flag.enabled, false)
  into simulation_enabled
  from private.runtime_feature_flags as flag
  where flag.key = 'donation_simulation';

  if not coalesce(simulation_enabled, false) then
    raise exception 'donation-simulation-disabled' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = current_user_id
      and profile.account_type = 'donor'::public.account_type
  ) then
    raise exception 'donor-account-required' using errcode = '42501';
  end if;

  if donation_amount_cents < 51 or donation_amount_cents > 10000000 then
    raise exception 'invalid-donation-amount' using errcode = '22023';
  end if;

  if not private.organization_profile_is_public(target_organization_id) then
    raise exception 'organization-not-available' using errcode = 'P0002';
  end if;

  -- Keep the temporary endpoint useful for testing without making it an
  -- unlimited write primitive if its URL is discovered.
  if (
    select count(*)
    from public.donations as donation
    where donation.donor_profile_id = current_user_id
      and donation.is_test
      and donation.created_at >= now() - interval '1 hour'
  ) >= 30 then
    raise exception 'simulation-rate-limit' using errcode = 'P0001';
  end if;

  insert into public.donations (
    donor_id,
    ngo_id,
    amount_cents,
    platform_fee_cents,
    currency,
    status,
    payment_provider,
    payment_method,
    provider_action_id,
    processing_fee_cents,
    amount_to_recipient_cents,
    paid_at,
    donor_profile_id,
    organization_id,
    is_test
  ) values (
    current_user_id,
    target_organization_id::text,
    donation_amount_cents,
    round(donation_amount_cents * 0.05)::integer,
    'brl',
    'succeeded'::public.donation_status,
    'simulation',
    'pix',
    'simulation:' || gen_random_uuid()::text,
    0,
    donation_amount_cents,
    now(),
    current_user_id,
    target_organization_id,
    true
  )
  returning * into created_donation;

  return query
  select
    created_donation.id,
    created_donation.amount_cents,
    created_donation.donor_id,
    created_donation.organization_id,
    created_donation.created_at,
    created_donation.provider_action_id;
end;
$$;

revoke all on function public.create_simulated_donation(uuid, integer) from public;
grant execute on function public.create_simulated_donation(uuid, integer) to authenticated;

-- Test donations must not inflate the real public counters.
create or replace function public.update_platform_impact_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  amount_delta bigint := 0;
  count_delta bigint := 0;
begin
  if tg_op = 'INSERT' then
    if new.status = 'succeeded' and not new.is_test then
      amount_delta := new.amount_cents;
      count_delta := 1;
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'succeeded' and not old.is_test then
      amount_delta := -old.amount_cents;
      count_delta := -1;
    end if;
  else
    if old.status = 'succeeded' and not old.is_test then
      amount_delta := amount_delta - old.amount_cents;
      count_delta := count_delta - 1;
    end if;
    if new.status = 'succeeded' and not new.is_test then
      amount_delta := amount_delta + new.amount_cents;
      count_delta := count_delta + 1;
    end if;
  end if;

  if amount_delta <> 0 or count_delta <> 0 then
    insert into public.platform_impact_stats (
      singleton, donated_amount_cents, donation_count, updated_at
    ) values (
      true, greatest(amount_delta, 0), greatest(count_delta, 0), now()
    )
    on conflict (singleton) do update
    set donated_amount_cents = greatest(
          0,
          public.platform_impact_stats.donated_amount_cents + amount_delta
        ),
        donation_count = greatest(
          0,
          public.platform_impact_stats.donation_count + count_delta
        ),
        updated_at = now();
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

insert into public.platform_impact_stats (
  singleton, donated_amount_cents, donation_count, updated_at
)
select
  true,
  coalesce(sum(donation.amount_cents), 0)::bigint,
  count(*)::bigint,
  now()
from public.donations as donation
where donation.status = 'succeeded'
  and not donation.is_test
on conflict (singleton) do update
set donated_amount_cents = excluded.donated_amount_cents,
    donation_count = excluded.donation_count,
    updated_at = excluded.updated_at;

-- Carry the test marker into the NGO's private relationship workspace.
create or replace function private.sync_donation_relationship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  relationship_id uuid;
  donor_record record;
  effective_donated_at timestamptz;
begin
  if new.status <> 'succeeded' or new.organization_id is null then
    return new;
  end if;

  select profile.name, profile.email, profile.avatar_url
  into donor_record
  from public.profiles as profile
  where profile.id = new.donor_profile_id;

  effective_donated_at := coalesce(new.paid_at, new.updated_at, new.created_at, now());

  insert into public.donor_relationships (
    organization_id, donation_id, donor_profile_id, donor_name, donor_email,
    donor_avatar_url, amount_cents, donated_at, next_contact_at, is_test
  ) values (
    new.organization_id,
    new.id,
    new.donor_profile_id,
    coalesce(nullif(trim(donor_record.name), ''), 'Apoiador anônimo'),
    donor_record.email,
    donor_record.avatar_url,
    new.amount_cents,
    effective_donated_at,
    effective_donated_at,
    new.is_test
  )
  on conflict (donation_id) do update set
    donor_profile_id = excluded.donor_profile_id,
    donor_name = excluded.donor_name,
    donor_email = excluded.donor_email,
    donor_avatar_url = excluded.donor_avatar_url,
    amount_cents = excluded.amount_cents,
    donated_at = excluded.donated_at,
    is_test = excluded.is_test
  returning id into relationship_id;

  perform private.seed_donor_contact_schedule(
    relationship_id,
    new.organization_id,
    effective_donated_at
  );

  return new;
end;
$$;

revoke all on function private.sync_donation_relationship() from public;

update public.donor_relationships as relationship
set is_test = donation.is_test
from public.donations as donation
where donation.id = relationship.donation_id
  and relationship.is_test is distinct from donation.is_test;

comment on column public.donations.is_test is
  'True only for persisted end-to-end simulations. Never represents transferred funds.';
comment on column public.donor_relationships.is_test is
  'Mirrors the source donation test marker for clear NGO workspace labeling.';

