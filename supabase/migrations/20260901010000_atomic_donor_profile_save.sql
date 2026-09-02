-- Save common identity and donor-specific fields as one transaction. Older
-- accounts may not have a donor_profiles row, so a plain UPDATE can silently
-- affect zero rows and leave Auth metadata ahead of the relational database.

create or replace function public.save_own_donor_profile(
  profile_name text,
  profile_avatar_url text,
  profile_bio text,
  profile_location text,
  profile_instagram text,
  profile_phone text,
  profile_cover_image_url text,
  profile_interests text[]
)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_phone text := nullif(regexp_replace(coalesce(profile_phone, ''), '[^0-9]', '', 'g'), '');
begin
  if current_user_id is null then
    raise exception 'authentication-required' using errcode = '42501';
  end if;

  if normalized_phone is not null and normalized_phone !~ '^[0-9]{10,11}$' then
    raise exception 'invalid-donor-phone' using errcode = '22023';
  end if;

  update public.profiles
  set name = trim(coalesce(profile_name, '')),
      avatar_url = nullif(trim(coalesce(profile_avatar_url, '')), '')
  where id = current_user_id
    and account_type = 'donor'::public.account_type;

  if not found then
    raise exception 'donor-account-not-found' using errcode = 'P0002';
  end if;

  insert into public.donor_profiles as donor (
    user_id,
    bio,
    location,
    instagram,
    phone,
    cover_image_url,
    interests
  ) values (
    current_user_id,
    trim(coalesce(profile_bio, '')),
    trim(coalesce(profile_location, '')),
    nullif(trim(coalesce(profile_instagram, '')), ''),
    normalized_phone,
    nullif(trim(coalesce(profile_cover_image_url, '')), ''),
    coalesce(profile_interests, array[]::text[])
  )
  on conflict on constraint donor_profiles_pkey do update set
    bio = excluded.bio,
    location = excluded.location,
    instagram = excluded.instagram,
    phone = excluded.phone,
    cover_image_url = excluded.cover_image_url,
    interests = excluded.interests;

  return query select current_user_id;
end;
$$;

revoke all on function public.save_own_donor_profile(
  text, text, text, text, text, text, text, text[]
) from public, anon;

grant execute on function public.save_own_donor_profile(
  text, text, text, text, text, text, text, text[]
) to authenticated;

comment on function public.save_own_donor_profile(
  text, text, text, text, text, text, text, text[]
) is 'Atomically saves the authenticated donor identity and private profile preferences.';

notify pgrst, 'reload schema';
