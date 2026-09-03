-- Production replacement for demo campaigns: authenticated organizations can
-- join the campaign-creation interest list without exposing other entries.

create table if not exists public.campaign_creation_interests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested', 'contacted', 'enabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, organization_id)
);

drop trigger if exists campaign_creation_interests_touch_updated_at
on public.campaign_creation_interests;
create trigger campaign_creation_interests_touch_updated_at
before update on public.campaign_creation_interests
for each row execute function public.touch_updated_at();

alter table public.campaign_creation_interests enable row level security;
revoke all on table public.campaign_creation_interests from anon, authenticated;
grant select on table public.campaign_creation_interests to authenticated;

drop policy if exists campaign_creation_interests_read_own
on public.campaign_creation_interests;
create policy campaign_creation_interests_read_own
on public.campaign_creation_interests
for select
to authenticated
using (profile_id = (select auth.uid()));

create or replace function public.register_campaign_creation_interest()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  target_organization_id uuid;
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication-required';
  end if;

  select member.organization_id
  into target_organization_id
  from public.organization_members as member
  where member.profile_id = current_profile_id
    and member.status = 'active'
    and member.role in ('owner', 'admin')
  order by (member.organization_id = current_profile_id) desc, member.created_at asc
  limit 1;

  if target_organization_id is null then
    raise exception using errcode = '42501', message = 'organization-account-required';
  end if;

  insert into public.campaign_creation_interests (profile_id, organization_id)
  values (current_profile_id, target_organization_id)
  on conflict (profile_id, organization_id) do update
    set status = case
      when public.campaign_creation_interests.status = 'enabled' then 'enabled'
      else 'interested'
    end,
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.register_campaign_creation_interest() from public;
grant execute on function public.register_campaign_creation_interest() to authenticated;

comment on table public.campaign_creation_interests is
  'Private interest list for organizations that want access to campaign creation.';
