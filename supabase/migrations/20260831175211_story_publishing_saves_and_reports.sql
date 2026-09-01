-- Real story interactions: private saves, private reports and automatic
-- takedown after five distinct reporters. Existing story/media data is kept.

create table if not exists public.story_saves (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, story_id)
);

create index if not exists story_saves_story_idx
on public.story_saves (story_id, created_at desc);

alter table public.story_saves enable row level security;

revoke all on table public.story_saves from public, anon, authenticated;
grant select, insert, delete on table public.story_saves to authenticated;

drop policy if exists story_saves_own_read on public.story_saves;
create policy story_saves_own_read
on public.story_saves
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists story_saves_own_insert on public.story_saves;
create policy story_saves_own_insert
on public.story_saves
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1
    from public.stories as story
    where story.id = story_saves.story_id
      and story.status = 'published'
      and story.published_at <= now()
  )
);

drop policy if exists story_saves_own_delete on public.story_saves;
create policy story_saves_own_delete
on public.story_saves
for delete
to authenticated
using (profile_id = (select auth.uid()));

create table if not exists public.story_reports (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  reporter_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (
    char_length(trim(reason)) between 5 and 1000
  ),
  created_at timestamptz not null default now(),
  unique (story_id, reporter_profile_id)
);

create index if not exists story_reports_story_idx
on public.story_reports (story_id, created_at desc);

alter table public.story_reports enable row level security;

revoke all on table public.story_reports from public, anon, authenticated;
grant select, insert on table public.story_reports to authenticated;

drop policy if exists story_reports_own_read on public.story_reports;
create policy story_reports_own_read
on public.story_reports
for select
to authenticated
using (reporter_profile_id = (select auth.uid()));

drop policy if exists story_reports_own_insert on public.story_reports;
create policy story_reports_own_insert
on public.story_reports
for insert
to authenticated
with check (
  reporter_profile_id = (select auth.uid())
  and exists (
    select 1
    from public.stories as story
    where story.id = story_reports.story_id
      and story.status = 'published'
      and story.published_at <= now()
      and story.author_profile_id is distinct from (select auth.uid())
  )
);

create or replace function private.archive_story_after_report_threshold()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*)
    from public.story_reports as report
    where report.story_id = new.story_id
  ) >= 5 then
    update public.stories
    set status = 'archived',
        updated_at = now()
    where id = new.story_id
      and status = 'published';
  end if;

  return new;
end;
$$;

revoke all on function private.archive_story_after_report_threshold() from public;

drop trigger if exists story_reports_enforce_threshold on public.story_reports;
create trigger story_reports_enforce_threshold
after insert on public.story_reports
for each row execute function private.archive_story_after_report_threshold();

-- A published story is public only while its organization is active. Members
-- retain access to drafts and archived stories in their private workspace.
create or replace function private.organization_is_active(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations as organization
    where organization.id = target_organization_id
      and organization.status = 'active'
  );
$$;

revoke all on function private.organization_is_active(uuid) from public;
grant execute on function private.organization_is_active(uuid) to anon, authenticated, service_role;

drop policy if exists stories_public_or_member_read on public.stories;
create policy stories_public_or_member_read
on public.stories
for select
to anon, authenticated
using (
  (
    status = 'published'
    and published_at <= now()
    and private.organization_is_active(organization_id)
  )
  or private.has_organization_role(organization_id)
);

comment on table public.story_saves is
  'Private relationship between a profile and a story saved for later.';

comment on table public.story_reports is
  'Private moderation reports. One report per profile and story; five distinct reports archive the story.';
