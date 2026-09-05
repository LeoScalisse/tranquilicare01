-- Founder invitations are an administrative capability. The browser only ever
-- submits a candidate code; plaintext codes and redemption records stay in the
-- private schema and cannot be read by application users.

alter table public.organizations
  add column if not exists is_founder boolean not null default false,
  add column if not exists founder_granted_at timestamptz;

alter table public.ngo_profiles
  add column if not exists is_founder boolean not null default false;

create table if not exists private.founder_ngo_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint founder_ngo_codes_redemption_limit check (redemption_count <= max_redemptions)
);

create table if not exists private.founder_ngo_redemptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  code_id uuid not null references private.founder_ngo_codes(id) on delete restrict,
  redeemed_at timestamptz not null default now()
);

revoke all on table private.founder_ngo_codes from public, anon, authenticated;
revoke all on table private.founder_ngo_redemptions from public, anon, authenticated;

comment on table private.founder_ngo_codes is
  'Administrative founder invitations. Insert SHA-256 hashes only, using the service role or a controlled migration.';
comment on table private.founder_ngo_redemptions is
  'Immutable audit trail for founder invitation redemptions.';

-- Provision a real invitation through an administrator-only channel. Example:
-- insert into private.founder_ngo_codes (code_hash)
-- values (encode(digest('YOUR-PRIVATE-FOUNDER-CODE', 'sha256'), 'hex'));

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
  founder_code_id uuid;
  profile_was_completed boolean;
  founder_already_granted boolean;
  normalized_founder_code text := upper(trim(coalesce(founder_invitation_code, '')));
begin
  if current_user_id is null then
    raise exception 'authentication-required' using errcode = '42501';
  end if;

  select
    length(trim(description)) > 0
    and length(trim(category)) > 0
    and length(trim(goal)) > 0
    and cnpj is not null
    and length(trim(address)) > 0,
    is_founder
  into profile_was_completed, founder_already_granted
  from public.ngo_profiles
  where user_id = current_user_id;

  if normalized_founder_code <> '' then
    if coalesce(profile_was_completed, false) then
      raise exception 'founder-code-setup-only' using errcode = 'P0001';
    end if;

    if not coalesce(founder_already_granted, false) then
      select code.id
      into founder_code_id
      from private.founder_ngo_codes as code
      where code.code_hash = encode(digest(normalized_founder_code, 'sha256'), 'hex')
        and code.revoked_at is null
        and (code.expires_at is null or code.expires_at > now())
        and code.redemption_count < code.max_redemptions
      for update;

      if founder_code_id is null then
        raise exception 'founder-code-invalid' using errcode = 'P0001';
      end if;

      update private.founder_ngo_codes
      set redemption_count = redemption_count + 1
      where id = founder_code_id
        and redemption_count < max_redemptions;

      if not found then
        raise exception 'founder-code-unavailable' using errcode = 'P0001';
      end if;
    end if;
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
    geocoded_address,
    is_founder
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
    nullif(trim(profile_geocoded_address), ''),
    normalized_founder_code <> '' or coalesce(founder_already_granted, false)
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
    geocoded_address = excluded.geocoded_address,
    is_founder = public.ngo_profiles.is_founder or excluded.is_founder
  returning user_id into saved_user_id;

  update public.organizations
  set
    public_email = lower(trim(profile_public_email)),
    is_founder = is_founder or normalized_founder_code <> '',
    founder_granted_at = case
      when is_founder or normalized_founder_code = '' then founder_granted_at
      else now()
    end
  where id = current_user_id
  returning is_founder into founder_already_granted;

  if not found then
    raise exception 'organization-not-persisted' using errcode = 'P0002';
  end if;

  if normalized_founder_code <> '' then
    insert into private.founder_ngo_redemptions (organization_id, code_id)
    values (current_user_id, founder_code_id)
    on conflict (organization_id) do nothing;
  end if;

  return query select saved_user_id, coalesce(founder_already_granted, false);
end;
$$;

revoke all on function public.save_own_ngo_profile(
  text, text, jsonb, text, text, text, text, jsonb, text, text, text, text,
  text, text, double precision, double precision, text, text
) from public;

grant execute on function public.save_own_ngo_profile(
  text, text, jsonb, text, text, text, text, jsonb, text, text, text, text,
  text, text, double precision, double precision, text, text
) to authenticated;

create or replace view public.public_organizations
with (security_invoker = true)
as
select
  organization.id,
  organization.slug,
  organization.name,
  organization.short_description,
  organization.description,
  organization.primary_category,
  organization.goal,
  organization.objectives,
  organization.public_email,
  organization.website,
  organization.instagram,
  organization.phone,
  organization.cnpj,
  organization.address,
  organization.city,
  organization.state,
  organization.postal_code,
  organization.latitude,
  organization.longitude,
  organization.geocoded_address,
  organization.youtube_url,
  organization.status,
  organization.published_at,
  private.organization_is_verified(organization.id) as verified,
  avatar.provider as avatar_provider,
  avatar.bucket as avatar_bucket,
  avatar.storage_key as avatar_storage_key,
  avatar.external_url as avatar_url,
  cover.provider as cover_provider,
  cover.bucket as cover_bucket,
  cover.storage_key as cover_storage_key,
  cover.external_url as cover_image_url,
  organization.created_at,
  organization.updated_at,
  -- CREATE OR REPLACE VIEW requires existing columns to remain in the same
  -- order. New public fields must be appended to preserve migration replay.
  organization.is_founder
from public.organizations as organization
left join public.media_assets as avatar on avatar.id = organization.avatar_media_id
left join public.media_assets as cover on cover.id = organization.cover_media_id
where organization.status = 'active';

revoke all on table public.public_organizations from public, anon, authenticated;
grant select on table public.public_organizations to anon, authenticated;
