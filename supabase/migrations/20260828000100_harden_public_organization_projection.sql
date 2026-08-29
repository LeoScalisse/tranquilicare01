-- Keep physical location and the contact channels chosen by the organization
-- public for its profile, while preventing the Data API from exposing its
-- institutional identifier through the canonical organizations table.
--
-- This is deliberately non-destructive: the columns and existing values stay
-- private for the organization and its verification workflow.

-- Some earlier production databases were created before the founder feature.
-- The public profile only needs the boolean flag, so add it defensively before
-- using it in the public projection. The fuller founder-invitation migration
-- can still run later without conflict.
alter table public.organizations
  add column if not exists is_founder boolean not null default false;

revoke select on table public.organizations from public, anon, authenticated;

-- Column privileges let the public profile use its map and contact channels
-- without granting access to CNPJ. This also protects against a client
-- querying the canonical table directly instead of using the public view.
grant select (
  id,
  slug,
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
  address,
  city,
  state,
  postal_code,
  latitude,
  longitude,
  geocoded_address,
  youtube_url,
  status,
  published_at,
  is_founder,
  avatar_media_id,
  cover_media_id,
  created_at,
  updated_at
) on table public.organizations to anon, authenticated;

-- ngo_profiles is a legacy compatibility table and stores CNPJ. It remains
-- readable only by its owner; public marketplace reads use the safe view.
drop policy if exists ngo_profiles_select_visible on public.ngo_profiles;
drop policy if exists ngo_profiles_select_own on public.ngo_profiles;
create policy ngo_profiles_select_own
on public.ngo_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.ngo_profiles from public, anon, authenticated;
grant select on table public.ngo_profiles to authenticated;

-- The public view is intentionally a fixed, safe projection. It obeys RLS and
-- uses the column allowlist above; it is not a privileged bypass of security.
--
-- CNPJ remains temporarily as NULL only for older clients that still request
-- that column. It cannot disclose real data and should be removed in a later
-- API-major cleanup.
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
  -- Appended for compatibility with existing production views. PostgreSQL can
  -- add a view column at the end, but cannot insert one before existing ones.
  organization.is_founder
from public.organizations as organization
left join public.media_assets as avatar on avatar.id = organization.avatar_media_id
left join public.media_assets as cover on cover.id = organization.cover_media_id
where organization.status = 'active';

revoke all on table public.public_organizations from public, anon, authenticated;
grant select on table public.public_organizations to anon, authenticated;

comment on view public.public_organizations is
  'Public organization projection. Location, website, social networks and contact channels are public; CNPJ remains private.';
