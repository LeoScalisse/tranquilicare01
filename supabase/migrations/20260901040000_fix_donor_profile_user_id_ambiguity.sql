-- Qualify donor_profiles.user_id inside the RPC. Because the function returns
-- a table column also named user_id, an unqualified `where user_id = ...`
-- raises PostgreSQL 42702 at execution time.

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

  update public.profiles as donor_identity
  set name = trim(coalesce(profile_name, '')),
      avatar_url = nullif(trim(coalesce(profile_avatar_url, '')), '')
  where donor_identity.id = current_user_id
    and donor_identity.account_type::text = 'donor';

  if not found then
    raise exception 'donor-account-not-found' using errcode = 'P0002';
  end if;

  update public.donor_profiles as donor
  set bio = trim(coalesce(profile_bio, '')),
      location = trim(coalesce(profile_location, '')),
      instagram = nullif(trim(coalesce(profile_instagram, '')), ''),
      phone = normalized_phone,
      cover_image_url = nullif(trim(coalesce(profile_cover_image_url, '')), ''),
      interests = coalesce(profile_interests, array[]::text[])
  where donor.user_id = current_user_id;

  if not found then
    insert into public.donor_profiles (
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
    );
  end if;

  return query select current_user_id;
end;
$$;

revoke all on function public.save_own_donor_profile(
  text, text, text, text, text, text, text, text[]
) from public, anon;

grant execute on function public.save_own_donor_profile(
  text, text, text, text, text, text, text, text[]
) to authenticated;

notify pgrst, 'reload schema';
