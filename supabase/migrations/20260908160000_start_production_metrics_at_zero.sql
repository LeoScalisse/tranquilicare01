-- Establish a production metrics epoch without deleting historical payment,
-- profile, organization, or relationship records. Everything that existed
-- before this migration remains unchanged for audit and is excluded from
-- production numbers by the baseline timestamp.

begin;

create table if not exists private.production_metric_baseline (
  singleton boolean primary key default true check (singleton),
  started_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table private.production_metric_baseline enable row level security;
revoke all on table private.production_metric_baseline from public, anon, authenticated;

-- Keep the epoch and the zeroed aggregate atomic with respect to new payments.
lock table public.donations in share row exclusive mode;

insert into private.production_metric_baseline (singleton, started_at, updated_at)
values (true, now(), now())
on conflict (singleton) do update
set started_at = excluded.started_at,
    updated_at = excluded.updated_at;

insert into public.platform_impact_stats (
  singleton,
  donated_amount_cents,
  donation_count,
  updated_at
)
values (true, 0, 0, now())
on conflict (singleton) do update
set donated_amount_cents = 0,
    donation_count = 0,
    updated_at = excluded.updated_at;

-- Only donations created after the production epoch may move the public
-- singleton. Historical rows remain immutable and cannot accidentally lower
-- the new production total when edited later.
create or replace function public.update_platform_impact_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  amount_delta bigint := 0;
  count_delta bigint := 0;
  production_started_at timestamptz;
begin
  select baseline.started_at
  into production_started_at
  from private.production_metric_baseline as baseline
  where baseline.singleton = true;

  production_started_at := coalesce(production_started_at, now());

  if tg_op = 'INSERT' then
    if new.created_at >= production_started_at
       and new.status = 'succeeded'
       and not new.is_test then
      amount_delta := new.amount_cents;
      count_delta := 1;
    end if;
  elsif tg_op = 'DELETE' then
    if old.created_at >= production_started_at
       and old.status = 'succeeded'
       and not old.is_test then
      amount_delta := -old.amount_cents;
      count_delta := -1;
    end if;
  else
    if old.created_at >= production_started_at
       and old.status = 'succeeded'
       and not old.is_test then
      amount_delta := amount_delta - old.amount_cents;
      count_delta := count_delta - 1;
    end if;
    if new.created_at >= production_started_at
       and new.status = 'succeeded'
       and not new.is_test then
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

create or replace function public.get_home_dashboard_stats()
returns table (
  community_amount_cents bigint,
  community_donation_count bigint,
  personal_amount_cents bigint,
  personal_donation_count bigint,
  received_amount_cents bigint,
  received_donation_count bigint,
  verified_organization_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with metric_baseline as (
    select baseline.started_at
    from private.production_metric_baseline as baseline
    where baseline.singleton = true
  ),
  viewer_organizations as (
    select member.organization_id
    from public.organization_members as member
    where member.profile_id = auth.uid()
      and member.status = 'active'
    union
    select organization.id
    from public.organizations as organization
    where organization.legacy_owner_profile_id = auth.uid()
  ),
  platform as (
    select coalesce(stats.donated_amount_cents, 0)::bigint as amount,
           coalesce(stats.donation_count, 0)::bigint as total
    from public.platform_impact_stats as stats
    where stats.singleton = true
  ),
  personal as (
    select coalesce(sum(donation.amount_cents), 0)::bigint as amount,
           count(*)::bigint as total
    from public.donations as donation
    where donation.status = 'succeeded'
      and not donation.is_test
      and donation.created_at >= coalesce((select started_at from metric_baseline), now())
      and (
        donation.donor_profile_id = auth.uid()
        or donation.donor_id = auth.uid()
      )
  ),
  received as (
    select coalesce(sum(donation.amount_cents), 0)::bigint as amount,
           count(*)::bigint as total
    from public.donations as donation
    where donation.status = 'succeeded'
      and not donation.is_test
      and donation.created_at >= coalesce((select started_at from metric_baseline), now())
      and donation.organization_id in (select organization_id from viewer_organizations)
  ),
  verified as (
    select count(*)::bigint as total
    from public.organizations as organization
    where organization.status = 'active'
      and organization.created_at >= coalesce((select started_at from metric_baseline), now())
      and exists (
        select 1
        from public.organization_verifications as verification
        where verification.organization_id = organization.id
          and verification.status = 'approved'
      )
  )
  select
    coalesce((select amount from platform), 0),
    coalesce((select total from platform), 0),
    (select amount from personal),
    (select total from personal),
    (select amount from received),
    (select total from received),
    (select total from verified);
$$;

revoke all on function public.get_home_dashboard_stats() from public;
grant execute on function public.get_home_dashboard_stats() to anon, authenticated;

create or replace function public.get_production_metric_baseline()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select baseline.started_at
  from private.production_metric_baseline as baseline
  where baseline.singleton = true;
$$;

revoke all on function public.get_production_metric_baseline() from public;
grant execute on function public.get_production_metric_baseline() to anon, authenticated;

create or replace view public.public_campaigns
with (security_barrier = true)
as
select
  campaign.id,
  campaign.organization_id,
  organization.name as organization_name,
  organization.avatar_url as organization_image,
  organization.cover_image_url as organization_cover_image,
  campaign.title,
  campaign.description,
  campaign.goal_amount_cents,
  coalesce(sum(donation.amount_cents) filter (
    where donation.status = 'succeeded'
      and not donation.is_test
      and donation.created_at >= coalesce((
        select baseline.started_at
        from private.production_metric_baseline as baseline
        where baseline.singleton = true
      ), now())
  ), 0)::bigint as raised_amount_cents,
  campaign.starts_at,
  campaign.ends_at,
  campaign.status,
  media.external_url as cover_url,
  campaign.created_at
from public.campaigns as campaign
join public.public_organizations as organization on organization.id = campaign.organization_id
left join public.media_assets as media on media.id = campaign.cover_media_id
left join public.donations as donation on donation.campaign_uuid = campaign.id
where campaign.status in ('active', 'completed')
  and (campaign.starts_at is null or campaign.starts_at <= now())
group by campaign.id, organization.id, organization.name, organization.avatar_url,
  organization.cover_image_url, media.external_url;

revoke all on public.public_campaigns from public;
grant select on public.public_campaigns to anon, authenticated;

comment on table private.production_metric_baseline is
  'Authoritative epoch for public production metrics. Historical records remain preserved and excluded.';

commit;
