-- Keep founder invitations private and auditable while making onboarding
-- errors precise. The catalog stores hashes only; plaintext codes never live
-- in a client bundle or public table.

create schema if not exists private;
create extension if not exists pgcrypto;

alter table private.founder_ngo_codes
  add column if not exists code_name text,
  add column if not exists is_test boolean not null default false;

create unique index if not exists founder_ngo_codes_code_name_unique
  on private.founder_ngo_codes (lower(code_name))
  where code_name is not null;

create table if not exists private.founder_code_catalog_releases (
  release_key text primary key,
  applied_at timestamptz not null default now()
);

revoke all on table private.founder_code_catalog_releases from public, anon, authenticated;

-- Hashes are SHA-256 values of the canonical alphanumeric forms. Real codes
-- remain single-use invitations. The CARE entry is intentionally reusable for
-- controlled end-to-end testing.
insert into private.founder_ngo_codes (
  code_hash,
  code_name,
  is_test,
  max_redemptions,
  revoked_at,
  expires_at
)
values
  ('08966b7f3b40ec32e47e95c136b86d51bae1a9261974115e1ed33f382781bcf3', 'CADES', false, 1, null, null),
  ('c816cafb0bec57fbdf9f72a3e3fc5c83ded66aabe99ac015e1455ebede4a3aa8', 'MONTEAZUL', false, 1, null, null),
  ('5ed9cca6255e6e0ab7d664335bf2f7720f7e748b938d40eb37f2e7aba81666e4', 'CARE', true, 100, null, null)
on conflict (code_hash) do update set
  code_name = excluded.code_name,
  is_test = excluded.is_test,
  max_redemptions = greatest(private.founder_ngo_codes.max_redemptions, excluded.max_redemptions),
  revoked_at = null,
  expires_at = null;

-- This release is idempotent. If a real invitation was consumed by an earlier
-- test, reserve exactly one fresh activation without deleting its audit trail.
do $$
begin
  insert into private.founder_code_catalog_releases (release_key)
  values ('20260902-founder-catalog-v3')
  on conflict (release_key) do nothing;

  if found then
    update private.founder_ngo_codes
    set max_redemptions = greatest(max_redemptions, redemption_count + 1)
    where code_hash in (
      '08966b7f3b40ec32e47e95c136b86d51bae1a9261974115e1ed33f382781bcf3',
      'c816cafb0bec57fbdf9f72a3e3fc5c83ded66aabe99ac015e1455ebede4a3aa8'
    );

    update private.founder_ngo_codes
    set max_redemptions = greatest(max_redemptions, redemption_count + 100)
    where code_hash = '5ed9cca6255e6e0ab7d664335bf2f7720f7e748b938d40eb37f2e7aba81666e4';
  end if;
end
$$;

-- Preserve older rows for audit purposes, but only the current catalog may be
-- redeemed from now on.
update private.founder_ngo_codes
set revoked_at = coalesce(revoked_at, now())
where code_hash not in (
  '08966b7f3b40ec32e47e95c136b86d51bae1a9261974115e1ed33f382781bcf3',
  'c816cafb0bec57fbdf9f72a3e3fc5c83ded66aabe99ac015e1455ebede4a3aa8',
  '5ed9cca6255e6e0ab7d664335bf2f7720f7e748b938d40eb37f2e7aba81666e4'
);

-- Supabase may install pgcrypto in either `extensions` or `public`. Resolve
-- its real schema once per call instead of relying on a search_path. This is
-- essential because the public RPC intentionally runs with an empty path.
create or replace function private.founder_code_sha256(candidate text)
returns text
language plpgsql
stable
strict
security definer
set search_path = ''
as $$
declare
  pgcrypto_schema text;
  result_hash text;
begin
  select namespace.nspname
  into pgcrypto_schema
  from pg_catalog.pg_extension as installed_extension
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = installed_extension.extnamespace
  where installed_extension.extname = 'pgcrypto';

  if pgcrypto_schema is null then
    raise exception 'pgcrypto-extension-not-found' using errcode = '55000';
  end if;

  execute pg_catalog.format(
    'select pg_catalog.encode(%I.digest($1, ''sha256''), ''hex'')',
    pgcrypto_schema
  )
  into result_hash
  using candidate;

  return result_hash;
end;
$$;

revoke all on function private.founder_code_sha256(text) from public, anon, authenticated;

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
  founder_code private.founder_ngo_codes%rowtype;
  founder_code_id uuid;
  existing_redemption_code_id uuid;
  founder_already_granted boolean := false;
  normalized_state text := upper(trim(coalesce(profile_state, '')));
  normalized_founder_code text := upper(
    regexp_replace(coalesce(founder_invitation_code, ''), '[^A-Za-z0-9]', '', 'g')
  );
begin
  if current_user_id is null then
    raise exception 'authentication-required' using errcode = '42501';
  end if;

  if normalized_state <> '' and normalized_state !~ '^[A-Z]{2}$' then
    raise exception 'invalid-organization-state' using errcode = '22023';
  end if;

  select
    coalesce(ngo.is_founder, false) or coalesce(organization.is_founder, false)
  into founder_already_granted
  from public.profiles as profile
  left join public.ngo_profiles as ngo on ngo.user_id = profile.id
  left join public.organizations as organization on organization.id = profile.id
  where profile.id = current_user_id
    and profile.account_type = 'ngo'::public.account_type;

  if not found then
    raise exception 'organization-account-not-found' using errcode = 'P0002';
  end if;

  select redemption.code_id
  into existing_redemption_code_id
  from private.founder_ngo_redemptions as redemption
  where redemption.organization_id = current_user_id;

  founder_already_granted := coalesce(founder_already_granted, false)
    or existing_redemption_code_id is not null;

  if normalized_founder_code <> '' and not founder_already_granted then
    select code.*
    into founder_code
    from private.founder_ngo_codes as code
    where code.code_hash = private.founder_code_sha256(normalized_founder_code)
    for update;

    if founder_code.id is null then
      raise exception 'founder-code-not-found' using errcode = 'P0001';
    end if;

    if founder_code.revoked_at is not null then
      raise exception 'founder-code-revoked' using errcode = 'P0001';
    end if;

    if founder_code.expires_at is not null and founder_code.expires_at <= now() then
      raise exception 'founder-code-expired' using errcode = 'P0001';
    end if;

    if founder_code.redemption_count >= founder_code.max_redemptions then
      raise exception 'founder-code-already-used' using errcode = 'P0001';
    end if;

    founder_code_id := founder_code.id;

    update private.founder_ngo_codes
    set redemption_count = redemption_count + 1
    where id = founder_code_id
      and revoked_at is null
      and (expires_at is null or expires_at > now())
      and redemption_count < max_redemptions;

    if not found then
      raise exception 'founder-code-unavailable' using errcode = 'P0001';
    end if;
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
    nullif(trim(profile_geocoded_address), ''),
    founder_already_granted or founder_code_id is not null
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
    is_founder = ngo.is_founder or excluded.is_founder
  returning ngo.user_id, ngo.is_founder into saved_user_id, saved_is_founder;

  update public.organizations as organization
  set public_email = lower(nullif(trim(profile_public_email), '')),
      city = nullif(trim(profile_city), ''),
      state = nullif(normalized_state, ''),
      is_founder = organization.is_founder or saved_is_founder,
      founder_granted_at = case
        when organization.is_founder or not saved_is_founder then organization.founder_granted_at
        else now()
      end
  where organization.id = current_user_id;

  if not found then
    raise exception 'organization-not-persisted' using errcode = 'P0002';
  end if;

  if founder_code_id is not null then
    insert into private.founder_ngo_redemptions (organization_id, code_id)
    values (current_user_id, founder_code_id)
    on conflict (organization_id) do nothing;
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

comment on table private.founder_ngo_codes is
  'Private founder invitation catalog. Only canonical SHA-256 hashes are stored; code_name is an administrative label.';
