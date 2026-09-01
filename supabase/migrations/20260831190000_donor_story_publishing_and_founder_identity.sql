-- Allow authenticated donors to publish personal stories through the same
-- stories/media model used by organizations. Existing organization stories
-- and all existing data remain unchanged.

alter table public.stories
  alter column organization_id drop not null;

create or replace function public.get_public_story_authors(requested_profile_ids uuid[])
returns table (id uuid, name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.name, profile.avatar_url
  from public.profiles as profile
  where profile.id = any(coalesce(requested_profile_ids, array[]::uuid[]))
    and profile.account_type = 'donor'
    and exists (
      select 1
      from public.stories as story
      where story.author_profile_id = profile.id
        and story.organization_id is null
        and story.status = 'published'
        and story.published_at <= now()
    );
$$;

revoke all on function public.get_public_story_authors(uuid[]) from public;
grant execute on function public.get_public_story_authors(uuid[]) to anon, authenticated;

comment on function public.get_public_story_authors(uuid[]) is
  'Safe public projection of name and avatar for donors who published a visible story.';

drop policy if exists stories_public_or_member_read on public.stories;
create policy stories_public_or_member_read
on public.stories
for select
to anon, authenticated
using (
  (
    status = 'published'
    and published_at <= now()
    and (
      organization_id is null
      or private.organization_is_active(organization_id)
    )
  )
  or (
    organization_id is null
    and author_profile_id = (select auth.uid())
  )
  or private.has_organization_role(organization_id)
);

drop policy if exists stories_member_insert on public.stories;
create policy stories_member_insert
on public.stories
for insert
to authenticated
with check (
  author_profile_id = (select auth.uid())
  and (
    private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
    or (
      organization_id is null
      and exists (
        select 1
        from public.profiles as profile
        where profile.id = (select auth.uid())
          and profile.account_type = 'donor'
      )
    )
  )
);

drop policy if exists stories_member_update on public.stories;
create policy stories_member_update
on public.stories
for update
to authenticated
using (
  private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
  or (organization_id is null and author_profile_id = (select auth.uid()))
)
with check (
  private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
  or (organization_id is null and author_profile_id = (select auth.uid()))
);

drop policy if exists stories_member_delete on public.stories;
create policy stories_member_delete
on public.stories
for delete
to authenticated
using (
  private.has_organization_role(organization_id, array['owner', 'admin'])
  or (organization_id is null and author_profile_id = (select auth.uid()))
);

create or replace function private.media_asset_has_public_reference(target_media_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.organizations as organization
      where organization.status = 'active'
        and (organization.avatar_media_id = target_media_id or organization.cover_media_id = target_media_id)
    )
    or exists (
      select 1
      from public.campaigns as campaign
      join public.organizations as organization on organization.id = campaign.organization_id
      where campaign.cover_media_id = target_media_id
        and campaign.status in ('active', 'completed')
        and organization.status = 'active'
    )
    or exists (
      select 1
      from public.story_media as link
      join public.stories as story on story.id = link.story_id
      left join public.organizations as organization on organization.id = story.organization_id
      where link.media_asset_id = target_media_id
        and story.status = 'published'
        and story.published_at <= now()
        and (story.organization_id is null or organization.status = 'active')
    );
$$;

revoke all on function private.media_asset_has_public_reference(uuid) from public;
grant execute on function private.media_asset_has_public_reference(uuid) to anon, authenticated, service_role;

create or replace function private.validate_story_media_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  story_organization_id uuid;
  story_author_profile_id uuid;
  media_organization_id uuid;
  media_owner_profile_id uuid;
begin
  select organization_id, author_profile_id
  into story_organization_id, story_author_profile_id
  from public.stories
  where id = new.story_id;

  select organization_id, owner_profile_id
  into media_organization_id, media_owner_profile_id
  from public.media_assets
  where id = new.media_asset_id;

  if story_organization_id is null then
    if media_organization_id is not null
      or media_owner_profile_id is distinct from story_author_profile_id then
      raise exception 'personal story media must belong to its author'
        using errcode = '23514';
    end if;
  elsif media_organization_id is distinct from story_organization_id then
    raise exception 'story media must belong to the same organization'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_story_media_organization() from public;

drop policy if exists media_assets_member_insert on public.media_assets;
create policy media_assets_member_insert
on public.media_assets
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and (
    private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
    or organization_id is null
  )
);

drop policy if exists media_assets_member_update on public.media_assets;
create policy media_assets_member_update
on public.media_assets
for update
to authenticated
using (
  private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
  or (organization_id is null and owner_profile_id = (select auth.uid()))
)
with check (
  private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
  or (organization_id is null and owner_profile_id = (select auth.uid()))
);

drop policy if exists media_assets_member_delete on public.media_assets;
create policy media_assets_member_delete
on public.media_assets
for delete
to authenticated
using (
  private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
  or (organization_id is null and owner_profile_id = (select auth.uid()))
);

drop policy if exists story_media_member_insert on public.story_media;
create policy story_media_member_insert
on public.story_media
for insert
to authenticated
with check (
  exists (
    select 1
    from public.stories as story
    where story.id = story_media.story_id
      and (
        private.has_organization_role(story.organization_id, array['owner', 'admin', 'editor'])
        or (story.organization_id is null and story.author_profile_id = (select auth.uid()))
      )
  )
);

drop policy if exists story_media_member_update on public.story_media;
create policy story_media_member_update
on public.story_media
for update
to authenticated
using (
  exists (
    select 1 from public.stories as story
    where story.id = story_media.story_id
      and (
        private.has_organization_role(story.organization_id, array['owner', 'admin', 'editor'])
        or (story.organization_id is null and story.author_profile_id = (select auth.uid()))
      )
  )
)
with check (
  exists (
    select 1 from public.stories as story
    where story.id = story_media.story_id
      and (
        private.has_organization_role(story.organization_id, array['owner', 'admin', 'editor'])
        or (story.organization_id is null and story.author_profile_id = (select auth.uid()))
      )
  )
);

drop policy if exists story_media_member_delete on public.story_media;
create policy story_media_member_delete
on public.story_media
for delete
to authenticated
using (
  exists (
    select 1 from public.stories as story
    where story.id = story_media.story_id
      and (
        private.has_organization_role(story.organization_id, array['owner', 'admin', 'editor'])
        or (story.organization_id is null and story.author_profile_id = (select auth.uid()))
      )
  )
);

create or replace function private.can_write_story_storage_key(target_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    split_part(target_key, '/', 1) = (select auth.uid())::text
    or exists (
      select 1
      from public.organization_members as member
      where member.organization_id::text = split_part(target_key, '/', 1)
        and member.profile_id = (select auth.uid())
        and member.status = 'active'
        and member.role in ('owner', 'admin', 'editor')
    );
$$;

revoke all on function private.can_write_story_storage_key(text) from public;
grant execute on function private.can_write_story_storage_key(text) to authenticated;

drop policy if exists stories_media_insert_member on storage.objects;
create policy stories_media_insert_member
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'stories-public'
  and private.can_write_story_storage_key(name)
);

drop policy if exists stories_media_update_member on storage.objects;
create policy stories_media_update_member
on storage.objects
for update
to authenticated
using (
  bucket_id = 'stories-public'
  and private.can_write_story_storage_key(name)
)
with check (
  bucket_id = 'stories-public'
  and private.can_write_story_storage_key(name)
);

drop policy if exists stories_media_delete_member on storage.objects;
create policy stories_media_delete_member
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'stories-public'
  and private.can_write_story_storage_key(name)
);

comment on column public.stories.organization_id is
  'Organization for NGO stories; null only for personal stories authored by donor profiles.';
