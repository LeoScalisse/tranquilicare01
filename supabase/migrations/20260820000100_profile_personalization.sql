alter table public.ngo_profiles
  add column if not exists cover_image_url text,
  add column if not exists youtube_url text,
  add column if not exists objectives jsonb not null default '[]'::jsonb;

alter table public.ngo_profiles
  drop constraint if exists ngo_profiles_objectives_array;
alter table public.ngo_profiles
  add constraint ngo_profiles_objectives_array
  check (jsonb_typeof(objectives) = 'array');

alter table public.donor_profiles
  add column if not exists bio text not null default '',
  add column if not exists location text not null default '',
  add column if not exists instagram text,
  add column if not exists phone text,
  add column if not exists cover_image_url text,
  add column if not exists interests text[] not null default '{}'::text[];

alter table public.donor_profiles
  drop constraint if exists donor_profiles_phone_format;
alter table public.donor_profiles
  add constraint donor_profiles_phone_format
  check (phone is null or phone ~ '^[0-9]{10,11}$');

drop policy if exists donor_profiles_update_own on public.donor_profiles;
create policy donor_profiles_update_own
on public.donor_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant update (bio, location, instagram, phone, cover_image_url, interests)
on public.donor_profiles
to authenticated;

grant update (cover_image_url, youtube_url, objectives)
on public.ngo_profiles
to authenticated;
