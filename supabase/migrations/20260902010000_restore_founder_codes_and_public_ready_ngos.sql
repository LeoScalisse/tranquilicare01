-- Restore founder invitation redemption after the city/state compatibility
-- migrations replaced save_own_ngo_profile. Also separate public profile
-- visibility from verification/payment readiness: a complete cause may be
-- discovered while donations remain disabled.

create schema if not exists private;
create extension if not exists pgcrypto;

alter table public.organizations
  add column if not exists is_founder boolean not null default false,
  add column if not exists founder_granted_at timestamptz,
  add column if not exists city text,
  add column if not exists state text;

alter table public.ngo_profiles
  add column if not exists is_founder boolean not null default false,
  add column if not exists profile_status text not null default 'not_started',
  add column if not exists verification_status text not null default 'pending',
  add column if not exists payout_status text not null default 'not_configured',
  add column if not exists payment_status text not null default 'disabled';

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

update public.organizations as organization
set is_founder = true,
    founder_granted_at = coalesce(organization.founder_granted_at, now())
from public.ngo_profiles as ngo
where ngo.user_id = organization.id
  and ngo.is_founder
  and not organization.is_founder;

update public.ngo_profiles as ngo
set is_founder = true
from public.organizations as organization
where organization.id = ngo.user_id
  and organization.is_founder
  and not ngo.is_founder;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stories'::regclass
      and conname = 'stories_body_safe_length'
  ) then
    alter table public.stories
      add constraint stories_body_safe_length
      check (char_length(body) <= 5000) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stories'::regclass
      and conname = 'stories_published_body_required'
  ) then
    alter table public.stories
      add constraint stories_published_body_required
      check (status <> 'published' or char_length(trim(body)) > 0) not valid;
  end if;
end
$$;

insert into private.founder_ngo_codes (code_hash, max_redemptions)
values
  ('08966b7f3b40ec32e47e95c136b86d51bae1a9261974115e1ed33f382781bcf3', 1),
  ('c816cafb0bec57fbdf9f72a3e3fc5c83ded66aabe99ac015e1455ebede4a3aa8', 1)
on conflict (code_hash) do update
set max_redemptions = greatest(private.founder_ngo_codes.max_redemptions, excluded.max_redemptions);

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
  founder_code_id uuid;
  founder_already_granted boolean := false;
  profile_was_completed boolean := false;
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
    coalesce(ngo.profile_status = 'ready', false),
    coalesce(ngo.is_founder, false)
  into profile_was_completed, founder_already_granted
  from public.ngo_profiles as ngo
  where ngo.user_id = current_user_id;

  profile_was_completed := coalesce(profile_was_completed, false);
  founder_already_granted := coalesce(founder_already_granted, false);

  if normalized_founder_code <> '' and not founder_already_granted then
    if profile_was_completed then
      raise exception 'founder-code-setup-only' using errcode = 'P0001';
    end if;

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

create or replace function private.organization_profile_is_public(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations as organization
    left join public.ngo_profiles as ngo on ngo.user_id = organization.id
    where organization.id = target_organization_id
      and (
        organization.status = 'active'
        or (organization.status = 'pending' and ngo.profile_status = 'ready')
      )
  );
$$;

revoke all on function private.organization_profile_is_public(uuid) from public;
grant execute on function private.organization_profile_is_public(uuid) to anon, authenticated, service_role;

create or replace function private.organization_can_receive_donations(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations as organization
    join public.ngo_profiles as ngo on ngo.user_id = organization.id
    where organization.id = target_organization_id
      and organization.status = 'active'
      and ngo.verification_status = 'verified'
      and ngo.payout_status = 'configured'
      and ngo.payment_status = 'enabled'
  );
$$;

revoke all on function private.organization_can_receive_donations(uuid) from public;
grant execute on function private.organization_can_receive_donations(uuid) to anon, authenticated, service_role;

create or replace function private.organization_is_active(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.organization_profile_is_public(target_organization_id);
$$;

drop policy if exists organizations_public_or_member_read on public.organizations;
create policy organizations_public_or_member_read
on public.organizations
for select
to anon, authenticated
using (
  private.organization_profile_is_public(id)
  or private.has_organization_role(id)
);

create or replace function private.media_asset_has_public_reference(target_media_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.organizations as organization
      left join public.media_assets as media on media.id = target_media_id
      where private.organization_profile_is_public(organization.id)
        and (
          organization.avatar_media_id = target_media_id
          or organization.cover_media_id = target_media_id
          or (media.organization_id = organization.id and media.purpose = 'logo_processed')
        )
    )
    or exists (
      select 1
      from public.campaigns as campaign
      where campaign.cover_media_id = target_media_id
        and campaign.status in ('active', 'completed')
        and private.organization_profile_is_public(campaign.organization_id)
    )
    or exists (
      select 1
      from public.story_media as link
      join public.stories as story on story.id = link.story_id
      where link.media_asset_id = target_media_id
        and story.status = 'published'
        and story.published_at <= now()
        and (
          story.organization_id is null
          or private.organization_profile_is_public(story.organization_id)
        )
    );
$$;

revoke all on function private.media_asset_has_public_reference(uuid) from public;
grant execute on function private.media_asset_has_public_reference(uuid) to anon, authenticated, service_role;

-- A story published while its NGO was pending may already have a valid media
-- link. Promote only assets that now have a real public reference.
update public.media_assets as media
set visibility = 'public',
    updated_at = now()
where media.purpose = 'story'
  and media.visibility <> 'public'
  and private.media_asset_has_public_reference(media.id);

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
  null::text as cnpj,
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
  organization.is_founder,
  marketplace_logo.external_url as marketplace_logo_url,
  private.organization_can_receive_donations(organization.id) as donations_enabled
from public.organizations as organization
left join public.media_assets as avatar on avatar.id = organization.avatar_media_id
left join public.media_assets as cover on cover.id = organization.cover_media_id
left join lateral (
  select media.external_url
  from public.media_assets as media
  where media.organization_id = organization.id
    and media.purpose = 'logo_processed'
    and media.visibility = 'public'
  order by media.created_at desc
  limit 1
) as marketplace_logo on true
where private.organization_profile_is_public(organization.id);

revoke all on table public.public_organizations from public, anon, authenticated;
grant select on table public.public_organizations to anon, authenticated;

comment on view public.public_organizations is
  'Public-safe organization projection. A ready profile is discoverable independently from verification and payment readiness; CNPJ remains private.';
