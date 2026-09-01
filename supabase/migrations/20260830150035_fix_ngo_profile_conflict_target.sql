-- `RETURNS TABLE (user_id, is_founder)` exposes output variables to
-- PL/pgSQL. Referencing `user_id` as an inferred ON CONFLICT column therefore
-- raises SQLSTATE 42702 before either a new or an existing NGO can finish
-- onboarding. Name the primary-key constraint explicitly so the statement has
-- no variable/column ambiguity.

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
  profile_city text,
  profile_state text,
  profile_latitude double precision,
  profile_longitude double precision,
  profile_geocoded_address text,
  founder_invitation_code text
)
returns table (user_id uuid, is_founder boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved_user_id uuid;
  saved_is_founder boolean;
  normalized_state text := upper(trim(coalesce(profile_state, '')));
begin
  if current_user_id is null then
    raise exception 'authentication-required' using errcode = '42501';
  end if;

  if normalized_state <> '' and normalized_state !~ '^[A-Z]{2}$' then
    raise exception 'invalid-organization-state' using errcode = '22023';
  end if;

  update public.profiles
  set name = trim(profile_name),
      avatar_url = nullif(trim(profile_avatar_url), ''),
      ngo_profile = profile_payload
  where id = current_user_id
    and account_type = 'ngo'::public.account_type;

  if not found then
    raise exception 'organization-account-not-found' using errcode = 'P0002';
  end if;

  insert into public.ngo_profiles as ngo (
    user_id, description, category, goal, objectives, youtube_url,
    cover_image_url, instagram, phone, cnpj, address, latitude, longitude,
    geocoded_address, is_founder
  ) values (
    current_user_id, trim(profile_description), trim(profile_category),
    trim(profile_goal), coalesce(profile_objectives, '[]'::jsonb),
    nullif(trim(profile_youtube_url), ''), nullif(trim(profile_cover_image_url), ''),
    nullif(trim(profile_instagram), ''),
    nullif(regexp_replace(coalesce(profile_phone, ''), '[^0-9]', '', 'g'), ''),
    nullif(regexp_replace(coalesce(profile_cnpj, ''), '[^0-9]', '', 'g'), ''),
    trim(profile_address), profile_latitude, profile_longitude,
    nullif(trim(profile_geocoded_address), ''), false
  ) on conflict on constraint ngo_profiles_pkey do update set
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
    geocoded_address = excluded.geocoded_address,
    is_founder = ngo.is_founder
  returning ngo.user_id, ngo.is_founder into saved_user_id, saved_is_founder;

  update public.organizations
  set public_email = lower(nullif(trim(profile_public_email), '')),
      city = nullif(trim(profile_city), ''),
      state = nullif(normalized_state, '')
  where id = current_user_id;

  if not found then
    raise exception 'organization-not-persisted' using errcode = 'P0002';
  end if;

  return query select saved_user_id, saved_is_founder;
end;
$$;

revoke all on function public.save_own_ngo_profile(
  text, text, jsonb, text, text, text, text, jsonb, text, text, text, text,
  text, text, text, text, double precision, double precision, text, text
) from public;

grant execute on function public.save_own_ngo_profile(
  text, text, jsonb, text, text, text, text, jsonb, text, text, text, text,
  text, text, text, text, double precision, double precision, text, text
) to authenticated;
