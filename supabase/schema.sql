-- Legacy consolidated snapshot. Versioned files in supabase/migrations are the
-- source of truth for new environments. Do not apply this file after migrations.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_type') then
    create type public.account_type as enum ('donor', 'ngo');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  avatar_url text,
  credits integer not null default 0 check (credits >= 0),
  account_type public.account_type not null default 'donor',
  ngo_profile jsonb,
  account_type_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists account_type_locked boolean not null default false;

alter table public.profiles
  add column if not exists ngo_profile jsonb;

alter table public.profiles enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_account_type public.account_type;
begin
  metadata_account_type := case
    when new.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
      then (new.raw_user_meta_data ->> 'account_type')::public.account_type
    else 'donor'::public.account_type
  end;

  insert into public.profiles (id, email, name, avatar_url, account_type, account_type_locked)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar', new.raw_user_meta_data ->> 'avatar_url'),
    metadata_account_type,
    new.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this schema was installed.
insert into public.profiles (id, email, name, avatar_url, account_type, account_type_locked)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name', ''),
  coalesce(u.raw_user_meta_data ->> 'avatar', u.raw_user_meta_data ->> 'avatar_url'),
  case
    when u.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
      then (u.raw_user_meta_data ->> 'account_type')::public.account_type
    else 'donor'::public.account_type
  end,
  u.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
from auth.users u
on conflict (id) do nothing;

-- OAuth cannot pass the chosen role before redirect. This one-time RPC lets a
-- signed-in user lock the role selected on the login screen, without granting
-- direct UPDATE permission on account_type.
create or replace function public.set_initial_account_type(next_account_type public.account_type)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
  set account_type = next_account_type,
      account_type_locked = true
  where id = auth.uid()
    and account_type_locked = false
  returning * into profile;

  if profile.id is null then
    select * into profile from public.profiles where id = auth.uid();
  end if;

  return profile;
end;
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Authenticated users can read their full row, but only edit public profile
-- fields. Credits, account_type and verification-like fields should be changed
-- only by trusted SQL functions, webhooks or server-side code.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, avatar_url, ngo_profile) on public.profiles to authenticated;

revoke all on function public.set_initial_account_type(public.account_type) from public;
grant execute on function public.set_initial_account_type(public.account_type) to authenticated;

-- Role-specific profile data. Common identity fields stay in public.profiles.
create table if not exists public.donor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  credits integer not null default 0 check (credits >= 0),
  bio text not null default '',
  location text not null default '',
  instagram text,
  phone text,
  cover_image_url text,
  interests text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donor_profiles_phone_format check (phone is null or phone ~ '^[0-9]{10,11}$')
);

create table if not exists public.ngo_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  cnpj text,
  address text not null default '',
  latitude double precision,
  longitude double precision,
  geocoded_address text,
  description text not null default '',
  category text not null default '',
  goal text not null default '',
  objectives jsonb not null default '[]'::jsonb,
  youtube_url text,
  cover_image_url text,
  instagram text,
  phone text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ngo_profiles_cnpj_format check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  constraint ngo_profiles_phone_format check (phone is null or phone ~ '^[0-9]{10,11}$'),
  constraint ngo_profiles_objectives_array check (jsonb_typeof(objectives) = 'array'),
  constraint ngo_profiles_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint ngo_profiles_longitude_range check (longitude is null or longitude between -180 and 180)
);

alter table public.ngo_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geocoded_address text;

create unique index if not exists ngo_profiles_cnpj_unique
on public.ngo_profiles (cnpj)
where cnpj is not null;

drop trigger if exists donor_profiles_touch_updated_at on public.donor_profiles;
create trigger donor_profiles_touch_updated_at
before update on public.donor_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists ngo_profiles_touch_updated_at on public.ngo_profiles;
create trigger ngo_profiles_touch_updated_at
before update on public.ngo_profiles
for each row execute function public.touch_updated_at();

create or replace function public.sync_profile_role_tables()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.account_type = 'ngo'::public.account_type then
    insert into public.ngo_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    delete from public.donor_profiles where user_id = new.id;
  else
    insert into public.donor_profiles (user_id, credits)
    values (new.id, new.credits)
    on conflict (user_id) do update set credits = excluded.credits;
    delete from public.ngo_profiles where user_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_profile_role_tables() from public;

drop trigger if exists profiles_sync_role_tables on public.profiles;
create trigger profiles_sync_role_tables
after insert or update of account_type on public.profiles
for each row execute function public.sync_profile_role_tables();

insert into public.donor_profiles (user_id, credits)
select id, credits
from public.profiles
where account_type = 'donor'
on conflict (user_id) do update set credits = excluded.credits;

insert into public.ngo_profiles (
  user_id,
  cnpj,
  address,
  description,
  category,
  goal,
  instagram,
  phone
)
select
  id,
  case
    when length(regexp_replace(coalesce(ngo_profile ->> 'cnpj', ''), '[^0-9]', '', 'g')) = 14
      then regexp_replace(ngo_profile ->> 'cnpj', '[^0-9]', '', 'g')
    else null
  end,
  coalesce(ngo_profile ->> 'address', ''),
  coalesce(ngo_profile ->> 'description', ''),
  coalesce(ngo_profile ->> 'category', ''),
  coalesce(ngo_profile ->> 'goal', ''),
  nullif(ngo_profile ->> 'instagram', ''),
  case
    when length(regexp_replace(coalesce(ngo_profile ->> 'phone', ''), '[^0-9]', '', 'g')) between 10 and 11
      then regexp_replace(ngo_profile ->> 'phone', '[^0-9]', '', 'g')
    else null
  end
from public.profiles
where account_type = 'ngo'
on conflict (user_id) do nothing;

alter table public.donor_profiles enable row level security;
alter table public.ngo_profiles enable row level security;

drop policy if exists donor_profiles_select_own on public.donor_profiles;
create policy donor_profiles_select_own
on public.donor_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists donor_profiles_update_own on public.donor_profiles;
create policy donor_profiles_update_own
on public.donor_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists ngo_profiles_select_visible on public.ngo_profiles;
create policy ngo_profiles_select_visible
on public.ngo_profiles
for select
to anon, authenticated
using (status = 'approved' or (select auth.uid()) = user_id);

drop policy if exists ngo_profiles_update_own on public.ngo_profiles;
create policy ngo_profiles_update_own
on public.ngo_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.donor_profiles from anon, authenticated;
grant select on public.donor_profiles to authenticated;
grant update (bio, location, instagram, phone, cover_image_url, interests)
on public.donor_profiles
to authenticated;

revoke all on public.ngo_profiles from anon, authenticated;
grant select on public.ngo_profiles to anon, authenticated;
grant update (cnpj, address, latitude, longitude, geocoded_address, description, category, goal, objectives, youtube_url, cover_image_url, instagram, phone)
on public.ngo_profiles
to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_media_insert_own on storage.objects;
create policy profile_media_insert_own
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists profile_media_delete_own on storage.objects;
create policy profile_media_delete_own
on storage.objects for delete to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.list_public_ngos()
returns table (
  user_id uuid, name text, email text, avatar_url text, description text,
  category text, goal text, objectives jsonb, youtube_url text,
  cover_image_url text, instagram text, phone text, cnpj text, address text,
  latitude double precision, longitude double precision,
  geocoded_address text, status text
)
language sql stable security definer set search_path = ''
as $$
  select
    organization.user_id, profile.name, profile.email, profile.avatar_url,
    organization.description, organization.category, organization.goal,
    organization.objectives, organization.youtube_url, organization.cover_image_url,
    organization.instagram, organization.phone, organization.cnpj,
    organization.address, organization.latitude, organization.longitude,
    organization.geocoded_address, organization.status
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
