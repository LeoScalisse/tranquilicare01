-- TranquiliCare domain data architecture.
-- Additive migration: legacy profile and provider-specific fields remain in
-- place while the application moves to the canonical domain tables.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.organization_slug(
  organization_name text,
  organization_id uuid
)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat(
    coalesce(
      nullif(
        trim(both '-' from regexp_replace(lower(coalesce(organization_name, '')), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'organizacao'
    ),
    '-',
    left(replace(organization_id::text, '-', ''), 8)
  );
$$;

revoke all on function private.organization_slug(text, uuid) from public;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  legacy_owner_profile_id uuid unique references public.profiles(id) on delete set null,
  slug text not null unique,
  name text not null default '',
  short_description text not null default '',
  description text not null default '',
  primary_category text not null default '',
  goal text not null default '',
  objectives jsonb not null default '[]'::jsonb,
  public_email text,
  website text,
  instagram text,
  phone text,
  cnpj text,
  address text not null default '',
  city text,
  state text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  geocoded_address text,
  youtube_url text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'rejected', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_objectives_array check (jsonb_typeof(objectives) = 'array'),
  constraint organizations_cnpj_format check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  constraint organizations_phone_format check (phone is null or phone ~ '^[0-9]{10,11}$'),
  constraint organizations_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint organizations_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint organizations_state_format check (state is null or state ~ '^[A-Z]{2}$'),
  constraint organizations_website_format check (website is null or website ~ '^https?://'),
  constraint organizations_public_email_format check (
    public_email is null or public_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create index if not exists organizations_status_updated_idx
on public.organizations (status, updated_at desc);

create index if not exists organizations_category_status_idx
on public.organizations (primary_category, status);

drop trigger if exists organizations_touch_updated_at on public.organizations;
create trigger organizations_touch_updated_at
before update on public.organizations
for each row execute function public.touch_updated_at();

do $$
declare
  migrated_count integer;
begin
  insert into public.organizations (
    id,
    legacy_owner_profile_id,
    slug,
    name,
    short_description,
    description,
    primary_category,
    goal,
    objectives,
    public_email,
    instagram,
    phone,
    cnpj,
    address,
    latitude,
    longitude,
    geocoded_address,
    youtube_url,
    status,
    published_at,
    created_at,
    updated_at
  )
  select
    profile.id,
    profile.id,
    private.organization_slug(profile.name, profile.id),
    profile.name,
    left(organization.description, 180),
    organization.description,
    organization.category,
    organization.goal,
    organization.objectives,
    nullif(profile.email, ''),
    organization.instagram,
    organization.phone,
    organization.cnpj,
    organization.address,
    organization.latitude,
    organization.longitude,
    organization.geocoded_address,
    organization.youtube_url,
    case organization.status
      when 'approved' then 'active'
      when 'rejected' then 'rejected'
      else 'pending'
    end,
    case when organization.status = 'approved' then organization.updated_at else null end,
    least(profile.created_at, organization.created_at),
    greatest(profile.updated_at, organization.updated_at)
  from public.ngo_profiles as organization
  join public.profiles as profile on profile.id = organization.user_id
  on conflict (id) do nothing;

  get diagnostics migrated_count = row_count;
  raise notice 'organizations backfilled: %', migrated_count;
end
$$;

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('owner', 'admin', 'editor', 'finance', 'viewer')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create index if not exists organization_members_profile_idx
on public.organization_members (profile_id, organization_id);

drop trigger if exists organization_members_touch_updated_at on public.organization_members;
create trigger organization_members_touch_updated_at
before update on public.organization_members
for each row execute function public.touch_updated_at();

insert into public.organization_members (
  organization_id,
  profile_id,
  role,
  status,
  created_at,
  updated_at
)
select
  organization.id,
  organization.legacy_owner_profile_id,
  'owner',
  'active',
  organization.created_at,
  organization.updated_at
from public.organizations as organization
where organization.legacy_owner_profile_id is not null
on conflict (organization_id, profile_id) do nothing;

create or replace function private.has_organization_role(
  target_organization_id uuid,
  allowed_roles text[] default '{}'::text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as member
    where member.organization_id = target_organization_id
      and member.profile_id = (select auth.uid())
      and member.status = 'active'
      and (
        cardinality(allowed_roles) = 0
        or member.role = any(allowed_roles)
      )
  );
$$;

revoke all on function private.has_organization_role(uuid, text[]) from public;
grant execute on function private.has_organization_role(uuid, text[]) to anon, authenticated, service_role;

create table if not exists public.organization_verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'approved', 'rejected', 'expired')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_verifications_review_consistency check (
    status not in ('approved', 'rejected') or reviewed_at is not null
  )
);

create index if not exists organization_verifications_status_idx
on public.organization_verifications (status, updated_at desc);

drop trigger if exists organization_verifications_touch_updated_at on public.organization_verifications;
create trigger organization_verifications_touch_updated_at
before update on public.organization_verifications
for each row execute function public.touch_updated_at();

insert into public.organization_verifications (
  organization_id,
  status,
  submitted_at,
  reviewed_at,
  created_at,
  updated_at
)
select
  organization.id,
  case legacy.status
    when 'approved' then 'approved'
    when 'rejected' then 'rejected'
    else 'pending'
  end,
  legacy.created_at,
  case when legacy.status in ('approved', 'rejected') then legacy.updated_at else null end,
  legacy.created_at,
  legacy.updated_at
from public.organizations as organization
join public.ngo_profiles as legacy on legacy.user_id = organization.id
on conflict (organization_id) do nothing;

create or replace function private.organization_is_verified(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_verifications as verification
    where verification.organization_id = target_organization_id
      and verification.status = 'approved'
  );
$$;

revoke all on function private.organization_is_verified(uuid) from public;
grant execute on function private.organization_is_verified(uuid) to anon, authenticated, service_role;

create table if not exists public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.organization_verifications(id) on delete cascade,
  document_type text not null,
  storage_provider text not null,
  bucket text not null,
  storage_key text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  status text not null default 'submitted'
    check (status in ('submitted', 'accepted', 'rejected', 'replaced')),
  created_at timestamptz not null default now(),
  unique (storage_provider, bucket, storage_key)
);

create index if not exists verification_documents_verification_idx
on public.verification_documents (verification_id, created_at desc);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  purpose text not null default 'other'
    check (purpose in ('avatar', 'cover', 'story', 'campaign', 'impact_evidence', 'other')),
  provider text not null,
  bucket text,
  storage_key text,
  external_url text,
  provider_asset_id text,
  playback_id text,
  media_type text not null check (media_type in ('image', 'video', 'document')),
  visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  mime_type text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds numeric(12, 3) check (duration_seconds is null or duration_seconds >= 0),
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_locator check (
    (bucket is not null and storage_key is not null)
    or external_url is not null
    or provider_asset_id is not null
  )
);

create index if not exists media_assets_organization_idx
on public.media_assets (organization_id, created_at desc);

create unique index if not exists media_assets_profile_unique_purpose_idx
on public.media_assets (organization_id, purpose)
where purpose in ('avatar', 'cover');

drop trigger if exists media_assets_touch_updated_at on public.media_assets;
create trigger media_assets_touch_updated_at
before update on public.media_assets
for each row execute function public.touch_updated_at();

insert into public.media_assets (
  owner_profile_id,
  organization_id,
  purpose,
  provider,
  bucket,
  storage_key,
  external_url,
  media_type,
  visibility,
  metadata,
  created_at,
  updated_at
)
select
  organization.legacy_owner_profile_id,
  organization.id,
  'avatar',
  case
    when profile.avatar_url like '%/storage/v1/object/public/profile-media/%' then 'supabase'
    else 'external'
  end,
  case
    when profile.avatar_url like '%/storage/v1/object/public/profile-media/%' then 'profile-media'
    else null
  end,
  case
    when profile.avatar_url like '%/storage/v1/object/public/profile-media/%'
      then split_part(profile.avatar_url, '/profile-media/', 2)
    else null
  end,
  profile.avatar_url,
  'image',
  'public',
  jsonb_build_object('source', 'legacy_profiles.avatar_url'),
  organization.created_at,
  organization.updated_at
from public.organizations as organization
join public.profiles as profile on profile.id = organization.legacy_owner_profile_id
where nullif(trim(profile.avatar_url), '') is not null
on conflict (organization_id, purpose)
where purpose in ('avatar', 'cover')
do nothing;

insert into public.media_assets (
  owner_profile_id,
  organization_id,
  purpose,
  provider,
  bucket,
  storage_key,
  external_url,
  media_type,
  visibility,
  metadata,
  created_at,
  updated_at
)
select
  organization.legacy_owner_profile_id,
  organization.id,
  'cover',
  case
    when legacy.cover_image_url like '%/storage/v1/object/public/profile-media/%' then 'supabase'
    else 'external'
  end,
  case
    when legacy.cover_image_url like '%/storage/v1/object/public/profile-media/%' then 'profile-media'
    else null
  end,
  case
    when legacy.cover_image_url like '%/storage/v1/object/public/profile-media/%'
      then split_part(legacy.cover_image_url, '/profile-media/', 2)
    else null
  end,
  legacy.cover_image_url,
  'image',
  'public',
  jsonb_build_object('source', 'legacy_ngo_profiles.cover_image_url'),
  legacy.created_at,
  legacy.updated_at
from public.organizations as organization
join public.ngo_profiles as legacy on legacy.user_id = organization.id
where nullif(trim(legacy.cover_image_url), '') is not null
on conflict (organization_id, purpose)
where purpose in ('avatar', 'cover')
do nothing;

alter table public.organizations
  add column if not exists avatar_media_id uuid references public.media_assets(id) on delete set null,
  add column if not exists cover_media_id uuid references public.media_assets(id) on delete set null;

update public.organizations as organization
set avatar_media_id = media.id
from public.media_assets as media
where media.organization_id = organization.id
  and media.purpose = 'avatar'
  and organization.avatar_media_id is null;

update public.organizations as organization
set cover_media_id = media.id
from public.media_assets as media
where media.organization_id = organization.id
  and media.purpose = 'cover'
  and organization.cover_media_id is null;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  author_profile_id uuid references public.profiles(id) on delete set null,
  title text not null default '',
  body text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stories_publication_consistency check (
    status <> 'published' or published_at is not null
  )
);

create index if not exists stories_public_feed_idx
on public.stories (published_at desc)
where status = 'published';

create index if not exists stories_organization_idx
on public.stories (organization_id, created_at desc);

drop trigger if exists stories_touch_updated_at on public.stories;
create trigger stories_touch_updated_at
before update on public.stories
for each row execute function public.touch_updated_at();

create table if not exists public.story_media (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (story_id, media_asset_id),
  unique (story_id, sort_order)
);

create index if not exists story_media_asset_idx
on public.story_media (media_asset_id);

create table if not exists public.impact_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  value numeric not null check (value >= 0),
  unit text,
  label text not null,
  description text,
  context text,
  measurement_type text not null default 'direct'
    check (measurement_type in ('direct', 'estimated', 'collective')),
  source text,
  measured_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists impact_metrics_public_idx
on public.impact_metrics (organization_id, measured_at desc)
where is_published;

drop trigger if exists impact_metrics_touch_updated_at on public.impact_metrics;
create trigger impact_metrics_touch_updated_at
before update on public.impact_metrics
for each row execute function public.touch_updated_at();

create table if not exists public.organization_follows (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, organization_id)
);

create index if not exists organization_follows_organization_idx
on public.organization_follows (organization_id, created_at desc);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  title text not null,
  description text not null default '',
  goal_amount_cents bigint not null check (goal_amount_cents > 0),
  currency text not null default 'brl' check (currency = lower(currency) and length(currency) = 3),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed', 'canceled', 'archived')),
  cover_media_id uuid references public.media_assets(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_date_order check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists campaigns_public_idx
on public.campaigns (status, ends_at, created_at desc);

create index if not exists campaigns_organization_idx
on public.campaigns (organization_id, created_at desc);

drop trigger if exists campaigns_touch_updated_at on public.campaigns;
create trigger campaigns_touch_updated_at
before update on public.campaigns
for each row execute function public.touch_updated_at();

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_type text not null default 'system'
    check (actor_type in ('profile', 'system', 'provider', 'administrator')),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx
on public.audit_logs (entity_type, entity_id, created_at desc);

create index if not exists audit_logs_actor_idx
on public.audit_logs (actor_profile_id, created_at desc)
where actor_profile_id is not null;

-- Financial records retain their legacy text identifiers while gaining domain
-- foreign keys. Demo destinations cannot be backfilled because they are not
-- production organizations.
alter table public.donations
  add column if not exists donor_profile_id uuid,
  add column if not exists organization_id uuid,
  add column if not exists campaign_uuid uuid;

update public.donations as donation
set donor_profile_id = profile.id
from public.profiles as profile
where profile.id = donation.donor_id
  and donation.donor_profile_id is null;

update public.donations as donation
set organization_id = organization.id
from public.organizations as organization
where organization.id::text = donation.ngo_id
  and donation.organization_id is null;

update public.donations as donation
set campaign_uuid = campaign.id
from public.campaigns as campaign
where campaign.id::text = donation.campaign_id
  and donation.campaign_uuid is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'donations_donor_profile_id_fkey'
  ) then
    alter table public.donations
      add constraint donations_donor_profile_id_fkey
      foreign key (donor_profile_id) references public.profiles(id) on delete set null
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'donations_organization_id_fkey'
  ) then
    alter table public.donations
      add constraint donations_organization_id_fkey
      foreign key (organization_id) references public.organizations(id) on delete restrict
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'donations_campaign_uuid_fkey'
  ) then
    alter table public.donations
      add constraint donations_campaign_uuid_fkey
      foreign key (campaign_uuid) references public.campaigns(id) on delete restrict
      not valid;
  end if;
end
$$;

alter table public.donations validate constraint donations_donor_profile_id_fkey;
alter table public.donations validate constraint donations_organization_id_fkey;
alter table public.donations validate constraint donations_campaign_uuid_fkey;

create index if not exists donations_donor_profile_idx
on public.donations (donor_profile_id, created_at desc)
where donor_profile_id is not null;

create index if not exists donations_organization_idx
on public.donations (organization_id, created_at desc)
where organization_id is not null;

create index if not exists donations_campaign_uuid_idx
on public.donations (campaign_uuid, created_at desc)
where campaign_uuid is not null;

alter table public.payment_recipients
  add column if not exists organization_uuid uuid;

update public.payment_recipients as recipient
set organization_uuid = organization.id
from public.organizations as organization
where organization.id::text = recipient.organization_id
  and recipient.organization_uuid is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payment_recipients_organization_uuid_fkey'
  ) then
    alter table public.payment_recipients
      add constraint payment_recipients_organization_uuid_fkey
      foreign key (organization_uuid) references public.organizations(id) on delete restrict
      not valid;
  end if;
end
$$;

alter table public.payment_recipients
  validate constraint payment_recipients_organization_uuid_fkey;

create index if not exists payment_recipients_organization_uuid_idx
on public.payment_recipients (organization_uuid, provider, livemode)
where organization_uuid is not null;

comment on column public.donations.ngo_id is
  'Deprecated text destination key retained for demo and backward compatibility. Use organization_id for persisted organizations.';
comment on column public.donations.donor_id is
  'Deprecated direct Auth reference. Use donor_profile_id in domain code.';
comment on column public.donations.campaign_id is
  'Deprecated text campaign key. Use campaign_uuid for persisted campaigns.';
comment on column public.payment_recipients.organization_id is
  'Transitional provider destination key. Use organization_uuid when a domain organization exists.';
comment on table public.ngo_profiles is
  'Deprecated compatibility write model. Canonical organization data lives in organizations and organization_members.';

create or replace function private.upsert_public_media(
  target_organization_id uuid,
  target_owner_profile_id uuid,
  target_purpose text,
  target_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  media_id uuid;
begin
  if nullif(trim(target_url), '') is null then
    return null;
  end if;

  insert into public.media_assets (
    owner_profile_id,
    organization_id,
    purpose,
    provider,
    bucket,
    storage_key,
    external_url,
    media_type,
    visibility,
    metadata
  )
  values (
    target_owner_profile_id,
    target_organization_id,
    target_purpose,
    case
      when target_url like '%/storage/v1/object/public/profile-media/%' then 'supabase'
      else 'external'
    end,
    case
      when target_url like '%/storage/v1/object/public/profile-media/%' then 'profile-media'
      else null
    end,
    case
      when target_url like '%/storage/v1/object/public/profile-media/%'
        then split_part(target_url, '/profile-media/', 2)
      else null
    end,
    target_url,
    'image',
    'public',
    jsonb_build_object('source', 'legacy_compatibility_trigger')
  )
  on conflict (organization_id, purpose)
  where purpose in ('avatar', 'cover')
  do update set
    provider = excluded.provider,
    bucket = excluded.bucket,
    storage_key = excluded.storage_key,
    external_url = excluded.external_url,
    updated_at = now()
  returning id into media_id;

  return media_id;
end;
$$;

revoke all on function private.upsert_public_media(uuid, uuid, text, text) from public;

create or replace function private.sync_legacy_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile public.profiles;
  canonical_status text;
  media_id uuid;
begin
  select * into profile from public.profiles where id = new.user_id;
  if profile.id is null then
    return new;
  end if;

  canonical_status := case new.status
    when 'approved' then 'active'
    when 'rejected' then 'rejected'
    else 'pending'
  end;

  insert into public.organizations (
    id,
    legacy_owner_profile_id,
    slug,
    name,
    short_description,
    description,
    primary_category,
    goal,
    objectives,
    public_email,
    instagram,
    phone,
    cnpj,
    address,
    latitude,
    longitude,
    geocoded_address,
    youtube_url,
    status,
    published_at,
    created_at,
    updated_at
  )
  values (
    new.user_id,
    new.user_id,
    private.organization_slug(profile.name, new.user_id),
    profile.name,
    left(new.description, 180),
    new.description,
    new.category,
    new.goal,
    new.objectives,
    nullif(profile.email, ''),
    new.instagram,
    new.phone,
    new.cnpj,
    new.address,
    new.latitude,
    new.longitude,
    new.geocoded_address,
    new.youtube_url,
    canonical_status,
    case when canonical_status = 'active' then coalesce(new.updated_at, now()) else null end,
    new.created_at,
    new.updated_at
  )
  on conflict (id) do update set
    legacy_owner_profile_id = excluded.legacy_owner_profile_id,
    name = excluded.name,
    short_description = excluded.short_description,
    description = excluded.description,
    primary_category = excluded.primary_category,
    goal = excluded.goal,
    objectives = excluded.objectives,
    public_email = coalesce(public.organizations.public_email, excluded.public_email),
    instagram = excluded.instagram,
    phone = excluded.phone,
    cnpj = excluded.cnpj,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    geocoded_address = excluded.geocoded_address,
    youtube_url = excluded.youtube_url,
    status = excluded.status,
    published_at = case
      when excluded.status = 'active' then coalesce(public.organizations.published_at, excluded.published_at)
      else public.organizations.published_at
    end;

  insert into public.organization_members (organization_id, profile_id, role, status)
  values (new.user_id, new.user_id, 'owner', 'active')
  on conflict (organization_id, profile_id) do nothing;

  insert into public.organization_verifications (
    organization_id,
    status,
    submitted_at,
    reviewed_at
  )
  values (
    new.user_id,
    case new.status
      when 'approved' then 'approved'
      when 'rejected' then 'rejected'
      else 'pending'
    end,
    new.created_at,
    case when new.status in ('approved', 'rejected') then new.updated_at else null end
  )
  on conflict (organization_id) do update set
    status = excluded.status,
    reviewed_at = excluded.reviewed_at;

  if nullif(trim(new.cover_image_url), '') is not null then
    media_id := private.upsert_public_media(new.user_id, new.user_id, 'cover', new.cover_image_url);
    update public.organizations set cover_media_id = media_id where id = new.user_id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_legacy_organization() from public;

drop trigger if exists ngo_profiles_sync_domain on public.ngo_profiles;
create trigger ngo_profiles_sync_domain
after insert or update on public.ngo_profiles
for each row execute function private.sync_legacy_organization();

create or replace function private.archive_legacy_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.organizations
  set status = 'archived'
  where id = old.user_id;
  return old;
end;
$$;

revoke all on function private.archive_legacy_organization() from public;

drop trigger if exists ngo_profiles_archive_domain on public.ngo_profiles;
create trigger ngo_profiles_archive_domain
after delete on public.ngo_profiles
for each row execute function private.archive_legacy_organization();

create or replace function private.sync_legacy_organization_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  media_id uuid;
begin
  update public.organizations
  set name = new.name,
      public_email = case
        when public.organizations.public_email = old.email then nullif(new.email, '')
        else public.organizations.public_email
      end
  where legacy_owner_profile_id = new.id;

  if new.avatar_url is distinct from old.avatar_url
    and nullif(trim(new.avatar_url), '') is not null then
    media_id := private.upsert_public_media(new.id, new.id, 'avatar', new.avatar_url);
    update public.organizations set avatar_media_id = media_id where legacy_owner_profile_id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_legacy_organization_identity() from public;

drop trigger if exists profiles_sync_organization_identity on public.profiles;
create trigger profiles_sync_organization_identity
after update of name, email, avatar_url on public.profiles
for each row execute function private.sync_legacy_organization_identity();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_verifications enable row level security;
alter table public.verification_documents enable row level security;
alter table public.media_assets enable row level security;
alter table public.stories enable row level security;
alter table public.story_media enable row level security;
alter table public.impact_metrics enable row level security;
alter table public.organization_follows enable row level security;
alter table public.campaigns enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.organizations from anon, authenticated;
grant select on table public.organizations to anon, authenticated;
grant update (
  name,
  short_description,
  description,
  primary_category,
  goal,
  objectives,
  public_email,
  website,
  instagram,
  phone,
  cnpj,
  address,
  city,
  state,
  postal_code,
  latitude,
  longitude,
  geocoded_address,
  youtube_url,
  avatar_media_id,
  cover_media_id
) on table public.organizations to authenticated;

drop policy if exists organizations_public_or_member_read on public.organizations;
create policy organizations_public_or_member_read
on public.organizations
for select
to anon, authenticated
using (
  status = 'active'
  or private.has_organization_role(id)
);

drop policy if exists organizations_member_update on public.organizations;
create policy organizations_member_update
on public.organizations
for update
to authenticated
using (private.has_organization_role(id, array['owner', 'admin']))
with check (private.has_organization_role(id, array['owner', 'admin']));

revoke all on table public.organization_members from anon, authenticated;
grant select, insert, update, delete on table public.organization_members to authenticated;

drop policy if exists organization_members_read on public.organization_members;
create policy organization_members_read
on public.organization_members
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or private.has_organization_role(organization_id, array['owner'])
);

drop policy if exists organization_members_manage_insert on public.organization_members;
create policy organization_members_manage_insert
on public.organization_members
for insert
to authenticated
with check (private.has_organization_role(organization_id, array['owner']));

drop policy if exists organization_members_manage_update on public.organization_members;
create policy organization_members_manage_update
on public.organization_members
for update
to authenticated
using (private.has_organization_role(organization_id, array['owner']))
with check (private.has_organization_role(organization_id, array['owner']));

drop policy if exists organization_members_manage_delete on public.organization_members;
create policy organization_members_manage_delete
on public.organization_members
for delete
to authenticated
using (
  private.has_organization_role(organization_id, array['owner'])
  and role <> 'owner'
);

revoke all on table public.organization_verifications from anon, authenticated;
grant select, insert, update on table public.organization_verifications to authenticated;

drop policy if exists organization_verifications_member_read on public.organization_verifications;
create policy organization_verifications_member_read
on public.organization_verifications
for select
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin']));

drop policy if exists organization_verifications_member_insert on public.organization_verifications;
create policy organization_verifications_member_insert
on public.organization_verifications
for insert
to authenticated
with check (
  private.has_organization_role(organization_id, array['owner', 'admin'])
  and status in ('pending', 'in_review')
  and reviewed_at is null
  and reviewed_by is null
  and internal_notes is null
);

drop policy if exists organization_verifications_member_update on public.organization_verifications;
create policy organization_verifications_member_update
on public.organization_verifications
for update
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin']))
with check (
  private.has_organization_role(organization_id, array['owner', 'admin'])
  and status in ('pending', 'in_review')
  and reviewed_at is null
  and reviewed_by is null
  and internal_notes is null
);

revoke all on table public.verification_documents from anon, authenticated;
grant select, insert, update on table public.verification_documents to authenticated;

drop policy if exists verification_documents_member_read on public.verification_documents;
create policy verification_documents_member_read
on public.verification_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_verifications as verification
    where verification.id = verification_documents.verification_id
      and private.has_organization_role(verification.organization_id, array['owner', 'admin'])
  )
);

drop policy if exists verification_documents_member_insert on public.verification_documents;
create policy verification_documents_member_insert
on public.verification_documents
for insert
to authenticated
with check (
  status = 'submitted'
  and exists (
    select 1
    from public.organization_verifications as verification
    where verification.id = verification_documents.verification_id
      and private.has_organization_role(verification.organization_id, array['owner', 'admin'])
  )
);

drop policy if exists verification_documents_member_update on public.verification_documents;
create policy verification_documents_member_update
on public.verification_documents
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_verifications as verification
    where verification.id = verification_documents.verification_id
      and private.has_organization_role(verification.organization_id, array['owner', 'admin'])
  )
)
with check (
  status in ('submitted', 'replaced')
  and exists (
    select 1
    from public.organization_verifications as verification
    where verification.id = verification_documents.verification_id
      and private.has_organization_role(verification.organization_id, array['owner', 'admin'])
  )
);

revoke all on table public.media_assets from anon, authenticated;
grant select, insert, update, delete on table public.media_assets to authenticated;
grant select on table public.media_assets to anon;

drop policy if exists media_assets_public_or_member_read on public.media_assets;
create policy media_assets_public_or_member_read
on public.media_assets
for select
to anon, authenticated
using (
  visibility = 'public'
  or private.has_organization_role(organization_id)
  or owner_profile_id = (select auth.uid())
);

drop policy if exists media_assets_member_insert on public.media_assets;
create policy media_assets_member_insert
on public.media_assets
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
);

drop policy if exists media_assets_member_update on public.media_assets;
create policy media_assets_member_update
on public.media_assets
for update
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']))
with check (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists media_assets_member_delete on public.media_assets;
create policy media_assets_member_delete
on public.media_assets
for delete
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

revoke all on table public.stories from anon, authenticated;
grant select on table public.stories to anon, authenticated;
grant insert, update, delete on table public.stories to authenticated;

drop policy if exists stories_public_or_member_read on public.stories;
create policy stories_public_or_member_read
on public.stories
for select
to anon, authenticated
using (
  (status = 'published' and published_at <= now())
  or private.has_organization_role(organization_id)
);

drop policy if exists stories_member_insert on public.stories;
create policy stories_member_insert
on public.stories
for insert
to authenticated
with check (
  author_profile_id = (select auth.uid())
  and private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
);

drop policy if exists stories_member_update on public.stories;
create policy stories_member_update
on public.stories
for update
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']))
with check (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists stories_member_delete on public.stories;
create policy stories_member_delete
on public.stories
for delete
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin']));

revoke all on table public.story_media from anon, authenticated;
grant select on table public.story_media to anon, authenticated;
grant insert, update, delete on table public.story_media to authenticated;

drop policy if exists story_media_public_or_member_read on public.story_media;
create policy story_media_public_or_member_read
on public.story_media
for select
to anon, authenticated
using (
  exists (
    select 1 from public.stories as story
    where story.id = story_media.story_id
  )
);

drop policy if exists story_media_member_insert on public.story_media;
create policy story_media_member_insert
on public.story_media
for insert
to authenticated
with check (
  exists (
    select 1 from public.stories as story
    where story.id = story_media.story_id
      and private.has_organization_role(story.organization_id, array['owner', 'admin', 'editor'])
  )
);

drop policy if exists story_media_member_update on public.story_media;
create policy story_media_member_update
on public.story_media
for update
to authenticated
using (
  exists (
    select 1 from public.stories as story
    where story.id = story_media.story_id
      and private.has_organization_role(story.organization_id, array['owner', 'admin', 'editor'])
  )
)
with check (
  exists (
    select 1 from public.stories as story
    where story.id = story_media.story_id
      and private.has_organization_role(story.organization_id, array['owner', 'admin', 'editor'])
  )
);

drop policy if exists story_media_member_delete on public.story_media;
create policy story_media_member_delete
on public.story_media
for delete
to authenticated
using (
  exists (
    select 1 from public.stories as story
    where story.id = story_media.story_id
      and private.has_organization_role(story.organization_id, array['owner', 'admin', 'editor'])
  )
);

revoke all on table public.impact_metrics from anon, authenticated;
grant select on table public.impact_metrics to anon, authenticated;
grant insert, update, delete on table public.impact_metrics to authenticated;

drop policy if exists impact_metrics_public_or_member_read on public.impact_metrics;
create policy impact_metrics_public_or_member_read
on public.impact_metrics
for select
to anon, authenticated
using (
  is_published
  or private.has_organization_role(organization_id)
);

drop policy if exists impact_metrics_member_insert on public.impact_metrics;
create policy impact_metrics_member_insert
on public.impact_metrics
for insert
to authenticated
with check (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists impact_metrics_member_update on public.impact_metrics;
create policy impact_metrics_member_update
on public.impact_metrics
for update
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']))
with check (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists impact_metrics_member_delete on public.impact_metrics;
create policy impact_metrics_member_delete
on public.impact_metrics
for delete
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin']));

revoke all on table public.organization_follows from anon, authenticated;
grant select, insert, delete on table public.organization_follows to authenticated;

drop policy if exists organization_follows_own_read on public.organization_follows;
create policy organization_follows_own_read
on public.organization_follows
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists organization_follows_own_insert on public.organization_follows;
create policy organization_follows_own_insert
on public.organization_follows
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists organization_follows_own_delete on public.organization_follows;
create policy organization_follows_own_delete
on public.organization_follows
for delete
to authenticated
using (profile_id = (select auth.uid()));

revoke all on table public.campaigns from anon, authenticated;
grant select on table public.campaigns to anon, authenticated;
grant insert, update, delete on table public.campaigns to authenticated;

drop policy if exists campaigns_public_or_member_read on public.campaigns;
create policy campaigns_public_or_member_read
on public.campaigns
for select
to anon, authenticated
using (
  status in ('active', 'completed')
  or private.has_organization_role(organization_id)
);

drop policy if exists campaigns_member_insert on public.campaigns;
create policy campaigns_member_insert
on public.campaigns
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
);

drop policy if exists campaigns_member_update on public.campaigns;
create policy campaigns_member_update
on public.campaigns
for update
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']))
with check (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists campaigns_member_delete on public.campaigns;
create policy campaigns_member_delete
on public.campaigns
for delete
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin']));

revoke all on table public.audit_logs from anon, authenticated;

-- Public profile media remains compatible. Add the missing update/select
-- policies needed for safe replacement and metadata inspection by its owner.
drop policy if exists profile_media_select_own on storage.objects;
create policy profile_media_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists profile_media_update_own on storage.objects;
create policy profile_media_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stories-public',
  'stories-public',
  true,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists stories_media_insert_member on storage.objects;
create policy stories_media_insert_member
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'stories-public'
  and private.has_organization_role(
    (
      select member.organization_id
      from public.organization_members as member
      where member.organization_id::text = (storage.foldername(name))[1]
        and member.profile_id = (select auth.uid())
        and member.status = 'active'
      limit 1
    ),
    array['owner', 'admin', 'editor']
  )
);

drop policy if exists stories_media_update_member on storage.objects;
create policy stories_media_update_member
on storage.objects
for update
to authenticated
using (
  bucket_id = 'stories-public'
  and exists (
    select 1
    from public.organization_members as member
    where member.organization_id::text = (storage.foldername(name))[1]
      and member.profile_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin', 'editor')
  )
)
with check (
  bucket_id = 'stories-public'
  and exists (
    select 1
    from public.organization_members as member
    where member.organization_id::text = (storage.foldername(name))[1]
      and member.profile_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin', 'editor')
  )
);

drop policy if exists stories_media_delete_member on storage.objects;
create policy stories_media_delete_member
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'stories-public'
  and exists (
    select 1
    from public.organization_members as member
    where member.organization_id::text = (storage.foldername(name))[1]
      and member.profile_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin', 'editor')
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-private',
  'verification-private',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists verification_storage_select_member on storage.objects;
create policy verification_storage_select_member
on storage.objects
for select
to authenticated
using (
  bucket_id = 'verification-private'
  and exists (
    select 1
    from public.organization_members as member
    where member.organization_id::text = (storage.foldername(name))[1]
      and member.profile_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
);

drop policy if exists verification_storage_insert_member on storage.objects;
create policy verification_storage_insert_member
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'verification-private'
  and exists (
    select 1
    from public.organization_members as member
    where member.organization_id::text = (storage.foldername(name))[1]
      and member.profile_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
);

drop policy if exists verification_storage_update_member on storage.objects;
create policy verification_storage_update_member
on storage.objects
for update
to authenticated
using (
  bucket_id = 'verification-private'
  and exists (
    select 1
    from public.organization_members as member
    where member.organization_id::text = (storage.foldername(name))[1]
      and member.profile_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
)
with check (
  bucket_id = 'verification-private'
  and exists (
    select 1
    from public.organization_members as member
    where member.organization_id::text = (storage.foldername(name))[1]
      and member.profile_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
);

drop policy if exists verification_storage_delete_member on storage.objects;
create policy verification_storage_delete_member
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'verification-private'
  and exists (
    select 1
    from public.organization_members as member
    where member.organization_id::text = (storage.foldername(name))[1]
      and member.profile_id = (select auth.uid())
      and member.status = 'active'
      and member.role in ('owner', 'admin')
  )
);

drop view if exists public.public_organizations;
create view public.public_organizations
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
  organization.updated_at
from public.organizations as organization
left join public.media_assets as avatar on avatar.id = organization.avatar_media_id
left join public.media_assets as cover on cover.id = organization.cover_media_id
where organization.status = 'active';

revoke all on table public.public_organizations from public, anon, authenticated;
grant select on table public.public_organizations to anon, authenticated;

create or replace function public.list_public_ngos()
returns table (
  user_id uuid,
  name text,
  email text,
  avatar_url text,
  description text,
  category text,
  goal text,
  objectives jsonb,
  youtube_url text,
  cover_image_url text,
  instagram text,
  phone text,
  cnpj text,
  address text,
  latitude double precision,
  longitude double precision,
  geocoded_address text,
  status text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    organization.id,
    organization.name,
    organization.public_email,
    organization.avatar_url,
    organization.description,
    organization.primary_category,
    organization.goal,
    organization.objectives,
    organization.youtube_url,
    organization.cover_image_url,
    organization.instagram,
    organization.phone,
    organization.cnpj,
    organization.address,
    organization.latitude,
    organization.longitude,
    organization.geocoded_address,
    'approved'::text
  from public.public_organizations as organization
  where length(trim(organization.name)) >= 2
    and length(trim(organization.description)) > 0
    and length(trim(organization.primary_category)) > 0
    and length(trim(organization.goal)) > 0
  order by organization.updated_at desc;
$$;

revoke all on function public.list_public_ngos() from public;
grant execute on function public.list_public_ngos() to anon, authenticated;

comment on view public.public_organizations is
  'Public-safe organization projection. Internal verification notes, membership, auth metadata and payment identifiers are excluded.';
comment on table public.media_assets is
  'Provider-neutral media metadata. Binary objects remain in external storage.';
comment on table public.stories is
  'Narrative organization content. Media is linked through story_media.';
comment on table public.impact_metrics is
  'Structured organization outcomes. Goals and stories must not be stored as realized impact.';
comment on table public.audit_logs is
  'Append-only server-side ledger for sensitive administrative actions. Never include secrets or document contents.';

-- Backfill audit. These assertions abort the migration if a legacy organization
-- was lost while creating the canonical domain records.
do $$
declare
  legacy_count bigint;
  canonical_count bigint;
  owner_count bigint;
begin
  select count(*) into legacy_count from public.ngo_profiles;
  select count(*) into canonical_count
  from public.organizations
  where legacy_owner_profile_id is not null;
  select count(*) into owner_count
  from public.organization_members
  where role = 'owner' and status = 'active';

  if canonical_count < legacy_count then
    raise exception 'organization backfill incomplete: legacy %, canonical %', legacy_count, canonical_count;
  end if;

  if owner_count < legacy_count then
    raise exception 'organization owner backfill incomplete: legacy %, owners %', legacy_count, owner_count;
  end if;

  raise notice 'organization audit: legacy %, canonical %, active owners %',
    legacy_count,
    canonical_count,
    owner_count;
end
$$;
