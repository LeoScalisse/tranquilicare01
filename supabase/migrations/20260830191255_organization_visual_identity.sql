-- Continue the editorial NGO profile setup without creating a second media
-- model. The original, processed logo and debut photos all remain media_assets.

alter table public.media_assets
  drop constraint if exists media_assets_purpose_check;

alter table public.media_assets
  add constraint media_assets_purpose_check
  check (purpose in (
    'avatar',
    'cover',
    'story',
    'campaign',
    'impact_evidence',
    'logo_original',
    'logo_processed',
    'marketplace_photo',
    'other'
  ));

alter table public.organizations
  add column if not exists visual_profile_status text not null default 'not_started',
  add column if not exists media_usage_authorized_at timestamptz,
  add column if not exists media_usage_authorized_by uuid references public.profiles(id) on delete set null;

alter table public.organizations
  drop constraint if exists organizations_visual_profile_status_check;

alter table public.organizations
  add constraint organizations_visual_profile_status_check
  check (visual_profile_status in ('not_started', 'ready'));

create index if not exists media_assets_organization_visual_idx
on public.media_assets (organization_id, purpose, created_at desc)
where purpose in ('logo_original', 'logo_processed', 'marketplace_photo');

revoke update (
  visual_profile_status,
  media_usage_authorized_at,
  media_usage_authorized_by
) on table public.organizations from authenticated;

comment on column public.organizations.visual_profile_status is
  'Completion state of the provider-neutral visual marketplace setup.';
comment on column public.organizations.media_usage_authorized_at is
  'Time at which the organization confirmed it may use and share the supplied images.';
comment on column public.organizations.media_usage_authorized_by is
  'Authenticated organization member who recorded the image authorization.';

-- Record the authorization through a narrow function so the audit identity is
-- always the current authenticated profile, never a client-supplied UUID.
create or replace function public.complete_own_organization_visual_setup(
  target_organization_id uuid,
  media_authorized boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
begin
  if current_profile_id is null then
    raise exception using errcode = '42501', message = 'authentication-required';
  end if;

  if not private.has_organization_role(
    target_organization_id,
    array['owner', 'admin']
  ) then
    raise exception using errcode = '42501', message = 'organization-access-denied';
  end if;

  update public.organizations
  set visual_profile_status = 'ready',
      media_usage_authorized_at = case when media_authorized then now() else null end,
      media_usage_authorized_by = case when media_authorized then current_profile_id else null end,
      updated_at = now()
  where id = target_organization_id;
end;
$$;

revoke all on function public.complete_own_organization_visual_setup(uuid, boolean) from public;
grant execute on function public.complete_own_organization_visual_setup(uuid, boolean) to authenticated;

-- The public profile bucket stores only the processed logo and optimized
-- marketplace photos. Untouched logos live in the private bucket below.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'profile-media';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-media-originals',
  'organization-media-originals',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists organization_media_originals_select_own on storage.objects;
create policy organization_media_originals_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'organization-media-originals'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists organization_media_originals_insert_own on storage.objects;
create policy organization_media_originals_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'organization-media-originals'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists organization_media_originals_update_own on storage.objects;
create policy organization_media_originals_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'organization-media-originals'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'organization-media-originals'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists organization_media_originals_delete_own on storage.objects;
create policy organization_media_originals_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'organization-media-originals'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Reuse a visual media row that already points to the same object. This keeps
-- the compatibility profile triggers from duplicating the processed logo or
-- selected marketplace photo as a second avatar/cover row.
create or replace function private.upsert_public_media(
  target_organization_id uuid,
  target_owner_profile_id uuid,
  target_purpose text,
  target_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  media_id uuid;
begin
  if nullif(trim(target_url), '') is null then
    return null;
  end if;

  select media.id
  into media_id
  from public.media_assets as media
  where media.organization_id = target_organization_id
    and media.media_type = 'image'
    and media.external_url = target_url
  order by media.created_at desc
  limit 1;

  if media_id is not null then
    update public.media_assets
    set visibility = 'public',
        metadata = metadata || jsonb_build_object('source', 'organization_visual_setup'),
        updated_at = now()
    where id = media_id;
    return media_id;
  end if;

  insert into public.media_assets (
    owner_profile_id,
    organization_id,
    purpose,
    provider,
    bucket,
    storage_key,
    external_url,
    media_type,
    visibility,
    metadata
  )
  values (
    target_owner_profile_id,
    target_organization_id,
    target_purpose,
    case
      when target_url like '%/storage/v1/object/public/profile-media/%' then 'supabase'
      else 'external'
    end,
    case
      when target_url like '%/storage/v1/object/public/profile-media/%' then 'profile-media'
      else null
    end,
    case
      when target_url like '%/storage/v1/object/public/profile-media/%'
        then split_part(target_url, '/profile-media/', 2)
      else null
    end,
    target_url,
    'image',
    'public',
    jsonb_build_object('source', 'legacy_compatibility_trigger')
  )
  on conflict (organization_id, purpose)
  where purpose in ('avatar', 'cover')
  do update set
    provider = excluded.provider,
    bucket = excluded.bucket,
    storage_key = excluded.storage_key,
    external_url = excluded.external_url,
    updated_at = now()
  returning id into media_id;

  return media_id;
end;
$$;

revoke all on function private.upsert_public_media(uuid, uuid, text, text) from public;
