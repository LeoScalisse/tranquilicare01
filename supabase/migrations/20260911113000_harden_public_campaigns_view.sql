-- Keep the public campaign projection subject to caller RLS without losing the
-- public, aggregate-only donation progress displayed on campaign cards.

begin;

alter table public.campaigns
  add column if not exists raised_amount_cents bigint not null default 0
  check (raised_amount_cents >= 0);

-- Prevent a donation write from racing the initial production-only backfill.
lock table public.donations in share row exclusive mode;

update public.campaigns as campaign
set raised_amount_cents = coalesce((
  select sum(donation.amount_cents)::bigint
  from public.donations as donation
  where donation.campaign_uuid = campaign.id
    and donation.status = 'succeeded'
    and not donation.is_test
    and donation.created_at >= coalesce((
      select baseline.started_at
      from private.production_metric_baseline as baseline
      where baseline.singleton = true
    ), now())
), 0);

create or replace function private.sync_campaign_raised_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  production_started_at timestamptz;
begin
  select baseline.started_at
  into production_started_at
  from private.production_metric_baseline as baseline
  where baseline.singleton = true;

  production_started_at := coalesce(production_started_at, now());

  if tg_op <> 'INSERT'
     and old.campaign_uuid is not null
     and old.status = 'succeeded'
     and not old.is_test
     and old.created_at >= production_started_at then
    update public.campaigns
    set raised_amount_cents = greatest(0, raised_amount_cents - old.amount_cents)
    where id = old.campaign_uuid;
  end if;

  if tg_op <> 'DELETE'
     and new.campaign_uuid is not null
     and new.status = 'succeeded'
     and not new.is_test
     and new.created_at >= production_started_at then
    update public.campaigns
    set raised_amount_cents = raised_amount_cents + new.amount_cents
    where id = new.campaign_uuid;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_campaign_raised_amount() from public, anon, authenticated;

drop trigger if exists donations_sync_campaign_raised_amount on public.donations;
create trigger donations_sync_campaign_raised_amount
after insert or delete or update of amount_cents, status, is_test, campaign_uuid, created_at
on public.donations
for each row execute function private.sync_campaign_raised_amount();

create or replace view public.public_campaigns
with (security_barrier = true, security_invoker = true)
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
  campaign.raised_amount_cents,
  campaign.starts_at,
  campaign.ends_at,
  campaign.status,
  media.external_url as cover_url,
  campaign.created_at
from public.campaigns as campaign
join public.public_organizations as organization on organization.id = campaign.organization_id
left join public.media_assets as media on media.id = campaign.cover_media_id
where campaign.status in ('active', 'completed')
  and (campaign.starts_at is null or campaign.starts_at <= now());

revoke all on public.public_campaigns from public;
grant select on public.public_campaigns to anon, authenticated;

comment on column public.campaigns.raised_amount_cents is
  'Production-only succeeded donation total maintained by a private trigger.';
comment on view public.public_campaigns is
  'RLS-respecting public campaign projection backed by a non-sensitive aggregate.';

commit;
