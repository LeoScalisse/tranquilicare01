-- Older NGO accounts can exist without their role-specific row when profile
-- creation raced an account-type change. Backfill those rows first; the
-- existing domain trigger creates the canonical organization and membership.
insert into public.ngo_profiles (user_id)
select profile.id
from public.profiles as profile
where profile.account_type = 'ngo'::public.account_type
on conflict (user_id) do nothing;

-- The profile editor uses an upsert so both newly-created and older accounts
-- have the same persistence path. Users may only insert their own row and the
-- status column is deliberately excluded from client-writable grants.
drop policy if exists ngo_profiles_insert_own on public.ngo_profiles;
create policy ngo_profiles_insert_own
on public.ngo_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.profiles as profile
    where profile.id = user_id
      and profile.account_type = 'ngo'::public.account_type
  )
);

grant insert (
  user_id,
  cnpj,
  address,
  description,
  category,
  goal,
  objectives,
  youtube_url,
  cover_image_url,
  instagram,
  phone,
  latitude,
  longitude,
  geocoded_address
) on public.ngo_profiles to authenticated;

grant update (
  cnpj,
  address,
  description,
  category,
  goal,
  objectives,
  youtube_url,
  cover_image_url,
  instagram,
  phone,
  latitude,
  longitude,
  geocoded_address
) on public.ngo_profiles to authenticated;
