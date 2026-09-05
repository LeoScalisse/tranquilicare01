-- Expose the most recent public processed logo separately from the original
-- profile/avatar image. The original remains the profile identity; the
-- transparent variant is only a presentation asset for marketplace cards.
do $migration$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_organizations'
      and column_name = 'donations_enabled'
  ) then
    execute $view$
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
  marketplace_logo.external_url as marketplace_logo_url
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
where organization.status = 'active';
$view$;
  end if;
end
$migration$;

revoke all on table public.public_organizations from public, anon, authenticated;
grant select on table public.public_organizations to anon, authenticated;

comment on view public.public_organizations is
  'Safe public organization projection. avatar_url is the original profile identity; marketplace_logo_url is the processed card-only logo.';
