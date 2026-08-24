-- Security hardening for payment confirmations and unpublished story media.

alter table public.payments
  add column if not exists confirmation_token_hash text,
  add column if not exists confirmation_expires_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.payments'::regclass
      and conname = 'payments_confirmation_token_hash_format'
  ) then
    alter table public.payments
      add constraint payments_confirmation_token_hash_format
      check (confirmation_token_hash is null or confirmation_token_hash ~ '^[0-9a-f]{64}$');
  end if;
end
$$;

comment on column public.payments.confirmation_token_hash is
  'SHA-256 hash of the short-lived capability used to confirm anonymous payments.';
comment on column public.payments.confirmation_expires_at is
  'Expiration for anonymous payment confirmation access.';

alter table public.media_assets
  alter column visibility set default 'private';

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
      join public.organizations as organization on organization.id = story.organization_id
      where link.media_asset_id = target_media_id
        and story.status = 'published'
        and story.published_at <= now()
        and organization.status = 'active'
    );
$$;

revoke all on function private.media_asset_has_public_reference(uuid) from public;
grant execute on function private.media_asset_has_public_reference(uuid) to anon, authenticated, service_role;

create or replace function private.story_storage_object_is_public(target_bucket text, target_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.media_assets as media
    where media.bucket = target_bucket
      and media.storage_key = target_key
      and media.visibility = 'public'
      and media.purpose = 'story'
      and private.media_asset_has_public_reference(media.id)
  );
$$;

revoke all on function private.story_storage_object_is_public(text, text) from public;
grant execute on function private.story_storage_object_is_public(text, text) to anon, authenticated, service_role;

create or replace function private.refresh_story_media_visibility(target_media_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.media_assets as media
  set visibility = case
    when private.media_asset_has_public_reference(media.id) then 'public'
    else 'private'
  end,
  updated_at = now()
  where media.id = target_media_id
    and media.purpose = 'story';
$$;

revoke all on function private.refresh_story_media_visibility(uuid) from public;

create or replace function private.validate_story_media_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  story_organization_id uuid;
  media_organization_id uuid;
begin
  select organization_id into story_organization_id
  from public.stories
  where id = new.story_id;

  select organization_id into media_organization_id
  from public.media_assets
  where id = new.media_asset_id;

  if story_organization_id is null
    or media_organization_id is null
    or story_organization_id <> media_organization_id then
    raise exception 'story media must belong to the same organization'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_story_media_organization() from public;

create or replace function private.sync_story_media_link_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.refresh_story_media_visibility(old.media_asset_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform private.refresh_story_media_visibility(new.media_asset_id);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function private.sync_story_media_link_visibility() from public;

create or replace function private.sync_story_visibility_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  media_id uuid;
begin
  for media_id in
    select link.media_asset_id
    from public.story_media as link
    where link.story_id = new.id
  loop
    perform private.refresh_story_media_visibility(media_id);
  end loop;
  return new;
end;
$$;

revoke all on function private.sync_story_visibility_change() from public;

drop trigger if exists story_media_validate_organization on public.story_media;
create trigger story_media_validate_organization
before insert or update of story_id, media_asset_id on public.story_media
for each row execute function private.validate_story_media_organization();

drop trigger if exists story_media_sync_visibility on public.story_media;
create trigger story_media_sync_visibility
after insert or update or delete on public.story_media
for each row execute function private.sync_story_media_link_visibility();

drop trigger if exists stories_sync_media_visibility on public.stories;
create trigger stories_sync_media_visibility
after insert or update of status, published_at on public.stories
for each row execute function private.sync_story_visibility_change();

update public.media_assets as media
set visibility = case
  when private.media_asset_has_public_reference(media.id) then 'public'
  else 'private'
end,
updated_at = now()
where media.purpose = 'story';

drop policy if exists media_assets_public_or_member_read on public.media_assets;
create policy media_assets_public_or_member_read
on public.media_assets
for select
to anon, authenticated
using (
  (visibility = 'public' and private.media_asset_has_public_reference(id))
  or private.has_organization_role(organization_id)
  or owner_profile_id = (select auth.uid())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stories-public',
  'stories-public',
  false,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists stories_media_select_published_or_member on storage.objects;
create policy stories_media_select_published_or_member
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'stories-public'
  and (
    private.story_storage_object_is_public(bucket_id, name)
    or exists (
      select 1
      from public.organization_members as member
      where member.organization_id::text = (storage.foldername(name))[1]
        and member.profile_id = (select auth.uid())
        and member.status = 'active'
        and member.role in ('owner', 'admin', 'editor')
    )
  )
);
