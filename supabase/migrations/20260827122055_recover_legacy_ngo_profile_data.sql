-- Recover data that older frontend versions successfully stored in the
-- compatibility JSON, but could not copy to ngo_profiles because the
-- role-specific row did not exist yet. Existing non-empty canonical values
-- always win, so this migration cannot roll a newer edit back.
update public.ngo_profiles as ngo
set
  description = coalesce(nullif(trim(ngo.description), ''), nullif(trim(profile.ngo_profile ->> 'description'), ''), ''),
  category = coalesce(nullif(trim(ngo.category), ''), nullif(trim(profile.ngo_profile ->> 'category'), ''), ''),
  goal = coalesce(nullif(trim(ngo.goal), ''), nullif(trim(profile.ngo_profile ->> 'goal'), ''), ''),
  objectives = case
    when ngo.objectives = '[]'::jsonb
      and jsonb_typeof(profile.ngo_profile -> 'objectives') = 'array'
      then profile.ngo_profile -> 'objectives'
    else ngo.objectives
  end,
  youtube_url = coalesce(
    nullif(trim(ngo.youtube_url), ''),
    nullif(trim(profile.ngo_profile ->> 'youtubeUrl'), ''),
    nullif(trim(profile.ngo_profile ->> 'youtube_url'), '')
  ),
  cover_image_url = coalesce(
    nullif(trim(ngo.cover_image_url), ''),
    nullif(trim(profile.ngo_profile ->> 'coverImage'), ''),
    nullif(trim(profile.ngo_profile ->> 'cover_image_url'), '')
  ),
  instagram = coalesce(nullif(trim(ngo.instagram), ''), nullif(trim(profile.ngo_profile ->> 'instagram'), '')),
  phone = coalesce(
    ngo.phone,
    case
      when length(regexp_replace(coalesce(profile.ngo_profile ->> 'phone', ''), '[^0-9]', '', 'g')) between 10 and 11
        then regexp_replace(profile.ngo_profile ->> 'phone', '[^0-9]', '', 'g')
      else null
    end
  ),
  address = coalesce(nullif(trim(ngo.address), ''), nullif(trim(profile.ngo_profile ->> 'address'), ''), ''),
  geocoded_address = coalesce(
    nullif(trim(ngo.geocoded_address), ''),
    nullif(trim(profile.ngo_profile ->> 'geocodedAddress'), ''),
    nullif(trim(profile.ngo_profile ->> 'geocoded_address'), '')
  ),
  latitude = case
    when ngo.latitude is not null then ngo.latitude
    when jsonb_typeof(profile.ngo_profile -> 'latitude') = 'number'
      and (profile.ngo_profile ->> 'latitude')::double precision between -90 and 90
      then (profile.ngo_profile ->> 'latitude')::double precision
    else null
  end,
  longitude = case
    when ngo.longitude is not null then ngo.longitude
    when jsonb_typeof(profile.ngo_profile -> 'longitude') = 'number'
      and (profile.ngo_profile ->> 'longitude')::double precision between -180 and 180
      then (profile.ngo_profile ->> 'longitude')::double precision
    else null
  end
from public.profiles as profile
where profile.id = ngo.user_id
  and profile.account_type = 'ngo'::public.account_type
  and jsonb_typeof(profile.ngo_profile) = 'object';

-- The public e-mail lives on the canonical organization rather than the
-- legacy role table. Restore it separately when the saved value is valid.
update public.organizations as organization
set public_email = lower(trim(coalesce(
  profile.ngo_profile ->> 'publicEmail',
  profile.ngo_profile ->> 'public_email'
)))
from public.profiles as profile
where profile.id = organization.legacy_owner_profile_id
  and profile.account_type = 'ngo'::public.account_type
  and coalesce(
    profile.ngo_profile ->> 'publicEmail',
    profile.ngo_profile ->> 'public_email',
    ''
  ) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';
