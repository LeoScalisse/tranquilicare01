-- Persist the NGO onboarding checkpoint in the canonical organization record.
-- This is additive: existing profile and media data are left untouched.

alter table public.organizations
  add column if not exists onboarding_stage text not null default 'cause',
  add column if not exists onboarding_completed_at timestamptz;

alter table public.organizations
  drop constraint if exists organizations_onboarding_stage_check;

alter table public.organizations
  add constraint organizations_onboarding_stage_check
  check (onboarding_stage in ('cause', 'visual', 'preparation', 'complete'));

-- Preserve the state users already experienced before checkpoints existed.
-- A ready visual profile previously opened the private profile immediately.
update public.organizations as organization
set onboarding_stage = case
      when coalesce(profile.profile_status, 'not_started') <> 'ready' then 'cause'
      when organization.visual_profile_status <> 'ready' then 'visual'
      else 'complete'
    end,
    onboarding_completed_at = case
      when organization.visual_profile_status = 'ready'
        and coalesce(profile.profile_status, 'not_started') = 'ready'
      then coalesce(organization.onboarding_completed_at, organization.updated_at, now())
      else null
    end
from public.ngo_profiles as profile
where profile.user_id = organization.legacy_owner_profile_id;

comment on column public.organizations.onboarding_stage is
  'Server-persisted NGO onboarding checkpoint: cause, visual, preparation or complete.';
comment on column public.organizations.onboarding_completed_at is
  'Time at which the organization completed or explicitly deferred the preparation step.';

revoke update (onboarding_stage, onboarding_completed_at)
on table public.organizations from authenticated;

create or replace function public.advance_own_organization_onboarding(
  requested_stage text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  target_organization_id uuid;
  current_stage text;
  current_rank integer;
  requested_rank integer;
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication-required';
  end if;

  if requested_stage not in ('cause', 'visual', 'preparation', 'complete') then
    raise exception using errcode = '22023', message = 'invalid-onboarding-stage';
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
    raise exception using errcode = '42501', message = 'organization-access-denied';
  end if;

  select organization.onboarding_stage
  into current_stage
  from public.organizations as organization
  where organization.id = target_organization_id
  for update;

  current_rank := array_position(array['cause', 'visual', 'preparation', 'complete'], current_stage);
  requested_rank := array_position(array['cause', 'visual', 'preparation', 'complete'], requested_stage);

  if requested_rank > current_rank + 1 then
    raise exception using errcode = '22023', message = 'onboarding-stage-out-of-order';
  end if;

  if requested_stage = 'visual' and not exists (
    select 1 from public.ngo_profiles as profile
    where profile.user_id = current_profile_id and profile.profile_status = 'ready'
  ) then
    raise exception using errcode = '22023', message = 'cause-profile-not-ready';
  end if;

  if requested_stage = 'preparation' and not exists (
    select 1 from public.organizations as organization
    where organization.id = target_organization_id
      and organization.visual_profile_status = 'ready'
  ) then
    raise exception using errcode = '22023', message = 'visual-profile-not-ready';
  end if;

  if requested_rank >= current_rank then
    update public.organizations
    set onboarding_stage = requested_stage,
        onboarding_completed_at = case
          when requested_stage = 'complete' then coalesce(onboarding_completed_at, now())
          else null
        end,
        updated_at = now()
    where id = target_organization_id;
    current_stage := requested_stage;
  end if;

  return current_stage;
end;
$$;

revoke all on function public.advance_own_organization_onboarding(text) from public;
grant execute on function public.advance_own_organization_onboarding(text) to authenticated;
