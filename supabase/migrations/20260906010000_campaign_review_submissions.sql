-- Launch-safe campaign creation. Donors and NGO members submit proposals;
-- only the TranquiliCare review process can turn them into public campaigns.

create table if not exists public.campaign_submissions (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  beneficiary_organization_id uuid not null references public.organizations(id) on delete restrict,
  requester_type text not null check (requester_type in ('donor', 'ngo')),
  title text not null check (char_length(trim(title)) between 8 and 100),
  summary text not null check (char_length(trim(summary)) between 30 and 280),
  story text not null check (char_length(trim(story)) between 100 and 5000),
  goal_amount_cents bigint not null check (goal_amount_cents between 5000 and 100000000),
  ends_at timestamptz not null,
  cover_url text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'in_review', 'changes_requested', 'approved', 'rejected', 'withdrawn')),
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_submission_deadline check (
    ends_at > created_at + interval '7 days'
    and ends_at <= created_at + interval '365 days'
  ),
  constraint campaign_submission_cover_url check (
    cover_url is null or cover_url = '' or cover_url ~* '^https://'
  )
);

create index if not exists campaign_submissions_requester_idx
on public.campaign_submissions (requester_profile_id, created_at desc);

create index if not exists campaign_submissions_review_queue_idx
on public.campaign_submissions (status, created_at asc)
where status in ('pending_review', 'in_review', 'changes_requested');

drop trigger if exists campaign_submissions_touch_updated_at
on public.campaign_submissions;
create trigger campaign_submissions_touch_updated_at
before update on public.campaign_submissions
for each row execute function public.touch_updated_at();

alter table public.campaign_submissions enable row level security;
revoke all on table public.campaign_submissions from anon, authenticated;
grant select on table public.campaign_submissions to authenticated;

drop policy if exists campaign_submissions_read_own on public.campaign_submissions;
create policy campaign_submissions_read_own
on public.campaign_submissions
for select
to authenticated
using (requester_profile_id = (select auth.uid()));

create or replace function public.submit_campaign_for_review(
  beneficiary_organization_id uuid,
  campaign_title text,
  campaign_summary text,
  campaign_story text,
  campaign_goal_amount_cents bigint,
  campaign_ends_at timestamptz,
  campaign_cover_url text default null,
  accepted_terms boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  current_account_type text;
  submission_id uuid;
  owns_beneficiary boolean := false;
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication-required';
  end if;

  if not accepted_terms then
    raise exception using errcode = '22023', message = 'campaign-terms-required';
  end if;

  select profile.account_type
  into current_account_type
  from public.profiles as profile
  where profile.id = current_profile_id;

  if current_account_type not in ('donor', 'ngo') then
    raise exception using errcode = '42501', message = 'campaign-account-not-eligible';
  end if;

  select exists (
    select 1
    from public.organization_members as member
    where member.profile_id = current_profile_id
      and member.organization_id = beneficiary_organization_id
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  ) into owns_beneficiary;

  if current_account_type = 'ngo' and not owns_beneficiary then
    raise exception using errcode = '42501', message = 'campaign-organization-access-denied';
  end if;

  if current_account_type = 'donor' and not (
    private.organization_profile_is_public(beneficiary_organization_id)
    and private.organization_can_receive_donations(beneficiary_organization_id)
  ) then
    raise exception using errcode = '22023', message = 'campaign-beneficiary-unavailable';
  end if;

  if campaign_goal_amount_cents not between 5000 and 100000000 then
    raise exception using errcode = '22023', message = 'campaign-goal-invalid';
  end if;
  if campaign_ends_at <= now() + interval '7 days'
     or campaign_ends_at > now() + interval '365 days' then
    raise exception using errcode = '22023', message = 'campaign-deadline-invalid';
  end if;
  if campaign_cover_url is not null and trim(campaign_cover_url) <> ''
     and campaign_cover_url !~* '^https://' then
    raise exception using errcode = '22023', message = 'campaign-cover-invalid';
  end if;
  if (
    select count(*)
    from public.campaign_submissions as recent
    where recent.requester_profile_id = current_profile_id
      and recent.created_at > now() - interval '24 hours'
  ) >= 3 then
    raise exception using errcode = 'P0001', message = 'campaign-submission-rate-limit';
  end if;

  insert into public.campaign_submissions (
    requester_profile_id,
    beneficiary_organization_id,
    requester_type,
    title,
    summary,
    story,
    goal_amount_cents,
    ends_at,
    cover_url,
    terms_accepted_at
  ) values (
    current_profile_id,
    beneficiary_organization_id,
    current_account_type,
    trim(campaign_title),
    trim(campaign_summary),
    trim(campaign_story),
    campaign_goal_amount_cents,
    campaign_ends_at,
    nullif(trim(campaign_cover_url), ''),
    now()
  ) returning id into submission_id;

  insert into public.audit_logs (
    actor_profile_id, actor_type, action, entity_type, entity_id, metadata
  ) values (
    current_profile_id,
    'profile',
    'campaign.submitted_for_review',
    'campaign_submission',
    submission_id::text,
    jsonb_build_object('beneficiary_organization_id', beneficiary_organization_id)
  );

  return submission_id;
end;
$$;

revoke all on function public.submit_campaign_for_review(uuid, text, text, text, bigint, timestamptz, text, boolean) from public;
grant execute on function public.submit_campaign_for_review(uuid, text, text, text, bigint, timestamptz, text, boolean) to authenticated;

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
    where donation.status = 'succeeded' and not donation.is_test
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

comment on table public.campaign_submissions is
  'Private review queue for donor and NGO campaign proposals.';
comment on view public.public_campaigns is
  'Public, review-approved campaigns with test donations excluded from progress.';
