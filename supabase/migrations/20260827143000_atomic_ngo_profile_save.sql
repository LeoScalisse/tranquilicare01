-- Persist the organization setup as one database transaction. Previously the
-- client updated auth metadata, profiles, ngo_profiles and organizations in
-- separate requests, so a duplicate CNPJ or RLS error could leave half a
-- profile saved and reopen onboarding on every login.
create or replace function public.save_own_ngo_profile(
  profile_name text,
  profile_avatar_url text,
  profile_payload jsonb,
  profile_public_email text,
  profile_description text,
  profile_category text,
  profile_goal text,
  profile_objectives jsonb,
  profile_youtube_url text,
  profile_cover_image_url text,
  profile_instagram text,
  profile_phone text,
  profile_cnpj text,
  profile_address text,
  profile_latitude double precision,
  profile_longitude double precision,
  profile_geocoded_address text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved_user_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication-required' using errcode = '42501';
  end if;

  update public.profiles
  set
    name = trim(profile_name),
    avatar_url = nullif(trim(profile_avatar_url), ''),
    ngo_profile = profile_payload
  where id = current_user_id
    and account_type = 'ngo'::public.account_type;

  if not found then
    raise exception 'organization-account-not-found' using errcode = 'P0002';
  end if;

  insert into public.ngo_profiles (
    user_id,
    description,
    category,
    goal,
    objectives,
    youtube_url,
    cover_image_url,
    instagram,
    phone,
    cnpj,
    address,
    latitude,
    longitude,
    geocoded_address
  )
  values (
    current_user_id,
    trim(profile_description),
    trim(profile_category),
    trim(profile_goal),
    coalesce(profile_objectives, '[]'::jsonb),
    nullif(trim(profile_youtube_url), ''),
    nullif(trim(profile_cover_image_url), ''),
    nullif(trim(profile_instagram), ''),
    nullif(regexp_replace(coalesce(profile_phone, ''), '[^0-9]', '', 'g'), ''),
    nullif(regexp_replace(coalesce(profile_cnpj, ''), '[^0-9]', '', 'g'), ''),
    trim(profile_address),
    profile_latitude,
    profile_longitude,
    nullif(trim(profile_geocoded_address), '')
  )
  on conflict (user_id) do update set
    description = excluded.description,
    category = excluded.category,
    goal = excluded.goal,
    objectives = excluded.objectives,
    youtube_url = excluded.youtube_url,
    cover_image_url = excluded.cover_image_url,
    instagram = excluded.instagram,
    phone = excluded.phone,
    cnpj = excluded.cnpj,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    geocoded_address = excluded.geocoded_address
  returning user_id into saved_user_id;

  update public.organizations
  set public_email = lower(trim(profile_public_email))
  where id = current_user_id;

  if not found then
    raise exception 'organization-not-persisted' using errcode = 'P0002';
  end if;

  return saved_user_id;
end;
$$;

revoke all on function public.save_own_ngo_profile(
  text, text, jsonb, text, text, text, text, jsonb, text, text, text, text,
  text, text, double precision, double precision, text
) from public;

grant execute on function public.save_own_ngo_profile(
  text, text, jsonb, text, text, text, text, jsonb, text, text, text, text,
  text, text, double precision, double precision, text
) to authenticated;
