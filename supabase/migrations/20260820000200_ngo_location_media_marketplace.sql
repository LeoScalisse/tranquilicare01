alter table public.ngo_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geocoded_address text;

alter table public.ngo_profiles
  drop constraint if exists ngo_profiles_latitude_range;
alter table public.ngo_profiles
  add constraint ngo_profiles_latitude_range
  check (latitude is null or latitude between -90 and 90);

alter table public.ngo_profiles
  drop constraint if exists ngo_profiles_longitude_range;
alter table public.ngo_profiles
  add constraint ngo_profiles_longitude_range
  check (longitude is null or longitude between -180 and 180);

grant update (latitude, longitude, geocoded_address)
on public.ngo_profiles
to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_media_insert_own on storage.objects;
create policy profile_media_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists profile_media_delete_own on storage.objects;
create policy profile_media_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.list_public_ngos()
returns table (
  user_id uuid,
  name text,
  email text,
  avatar_url text,
  description text,
  category text,
  goal text,
  objectives jsonb,
  youtube_url text,
  cover_image_url text,
  instagram text,
  phone text,
  cnpj text,
  address text,
  latitude double precision,
  longitude double precision,
  geocoded_address text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    organization.user_id,
    profile.name,
    profile.email,
    profile.avatar_url,
    organization.description,
    organization.category,
    organization.goal,
    organization.objectives,
    organization.youtube_url,
    organization.cover_image_url,
    organization.instagram,
    organization.phone,
    organization.cnpj,
    organization.address,
    organization.latitude,
    organization.longitude,
    organization.geocoded_address,
    organization.status
  from public.ngo_profiles as organization
  join public.profiles as profile on profile.id = organization.user_id
  where organization.status = 'approved'
    and profile.account_type = 'ngo'::public.account_type
    and length(trim(profile.name)) >= 2
    and length(trim(organization.description)) > 0
    and length(trim(organization.category)) > 0
    and length(trim(organization.goal)) > 0
  order by organization.updated_at desc;
$$;

revoke all on function public.list_public_ngos() from public;
grant execute on function public.list_public_ngos() to anon, authenticated;
