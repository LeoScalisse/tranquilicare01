-- Restore compatibility between the production database and the NGO
-- onboarding client. Older production projects do not yet have the founder
-- flag on ngo_profiles and expose an older save_own_ngo_profile signature.

alter table public.ngo_profiles
  add column if not exists is_founder boolean not null default false;

alter table public.organizations
  add column if not exists city text,
  add column if not exists state text;

-- A public cause can be ready after city/state are provided. A full official
-- address remains optional until the separate preparation step.
create or replace function public.sync_ngo_preparation_states()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
  has_location boolean;
  is_client_write boolean;
begin
  select ngo_profile into payload from public.profiles where id = new.user_id;

  has_location := coalesce(btrim(payload->>'address'), '') <> ''
    or (
      coalesce(btrim(payload->>'city'), '') <> ''
      and coalesce(btrim(payload->>'state'), '') ~ '^[A-Za-z]{2}$'
    );

  new.profile_status := case
    when coalesce(btrim(payload->>'category'), '') <> ''
      and coalesce(btrim(payload->>'description'), '') <> ''
      and coalesce(btrim(payload->>'goal'), '') <> ''
      and has_location
      and exists (
        select 1
        from jsonb_array_elements_text(coalesce(payload->'objectives', '[]'::jsonb)) as objective(value)
        where btrim(objective.value) <> ''
      ) then 'ready'
    else 'not_started'
  end;

  is_client_write := auth.uid() is not null;
  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    new.payout_status := 'not_configured';
    new.payment_status := 'disabled';
  elsif is_client_write then
    new.verification_status := old.verification_status;
    new.payout_status := old.payout_status;
    new.payment_status := case
      when old.verification_status = 'verified' and old.payout_status = 'configured'
        and old.payment_status = 'enabled' then 'enabled'
      else 'disabled'
    end;
  else
    new.verification_status := case new.verification_status
      when 'in_review' then 'in_review'
      when 'verified' then 'verified'
      when 'needs_review' then 'needs_review'
      else 'pending'
    end;
    new.payout_status := case new.payout_status
      when 'in_review' then 'in_review'
      when 'configured' then 'configured'
      when 'needs_review' then 'needs_review'
      else 'not_configured'
    end;
    new.payment_status := case
      when new.verification_status = 'verified' and new.payout_status = 'configured'
        and new.payment_status = 'enabled' then 'enabled'
      else 'disabled'
    end;
  end if;
  return new;
end;
$$;

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

  insert into public.ngo_profiles (
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
  ) on conflict (user_id) do update set
    description = excluded.description, category = excluded.category,
    goal = excluded.goal, objectives = excluded.objectives,
    youtube_url = excluded.youtube_url, cover_image_url = excluded.cover_image_url,
    instagram = excluded.instagram, phone = excluded.phone, cnpj = excluded.cnpj,
    address = excluded.address, latitude = excluded.latitude,
    longitude = excluded.longitude, geocoded_address = excluded.geocoded_address,
    is_founder = public.ngo_profiles.is_founder
  returning user_id, is_founder into saved_user_id, saved_is_founder;

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

-- Keep the already deployed client working until it receives the version that
-- sends city and state. It delegates to the new implementation with blanks.
create or replace function public.save_own_ngo_profile(
  profile_name text, profile_avatar_url text, profile_payload jsonb,
  profile_public_email text, profile_description text, profile_category text,
  profile_goal text, profile_objectives jsonb, profile_youtube_url text,
  profile_cover_image_url text, profile_instagram text, profile_phone text,
  profile_cnpj text, profile_address text, profile_latitude double precision,
  profile_longitude double precision, profile_geocoded_address text,
  founder_invitation_code text
)
returns table (user_id uuid, is_founder boolean)
language sql
security invoker
set search_path = ''
as $$
  select * from public.save_own_ngo_profile(
    profile_name, profile_avatar_url, profile_payload, profile_public_email,
    profile_description, profile_category, profile_goal, profile_objectives,
    profile_youtube_url, profile_cover_image_url, profile_instagram,
    profile_phone, profile_cnpj, profile_address, '', '', profile_latitude,
    profile_longitude, profile_geocoded_address, founder_invitation_code
  );
$$;

revoke all on function public.save_own_ngo_profile(
  text, text, jsonb, text, text, text, text, jsonb, text, text, text, text,
  text, text, text, text, double precision, double precision, text, text
) from public;
grant execute on function public.save_own_ngo_profile(
  text, text, jsonb, text, text, text, text, jsonb, text, text, text, text,
  text, text, text, text, double precision, double precision, text, text
) to authenticated;

revoke all on function public.save_own_ngo_profile(
  text, text, jsonb, text, text, text, text, jsonb, text, text, text, text,
  text, text, double precision, double precision, text, text
) from public;
grant execute on function public.save_own_ngo_profile(
  text, text, jsonb, text, text, text, text, jsonb, text, text, text, text,
  text, text, double precision, double precision, text, text
) to authenticated;
