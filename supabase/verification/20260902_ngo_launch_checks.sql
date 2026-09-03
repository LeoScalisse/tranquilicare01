-- Run in the Supabase SQL Editor after
-- 20260902010000_restore_founder_codes_and_public_ready_ngos.sql.
-- Every row should return ok = true. This script changes no data.

select 'founder_codes_provisioned' as check_name,
       count(*) = 2 as ok
from private.founder_ngo_codes
where code_hash in (
  '08966b7f3b40ec32e47e95c136b86d51bae1a9261974115e1ed33f382781bcf3',
  'c816cafb0bec57fbdf9f72a3e3fc5c83ded66aabe99ac015e1455ebede4a3aa8'
)

union all

select 'founder_flags_are_synchronized',
       not exists (
         select 1
         from public.organizations as organization
         join public.ngo_profiles as ngo on ngo.user_id = organization.id
         where organization.is_founder is distinct from ngo.is_founder
       )

union all

select 'ready_ngos_are_discoverable',
       not exists (
         select 1
         from public.organizations as organization
         join public.ngo_profiles as ngo on ngo.user_id = organization.id
         where ngo.profile_status = 'ready'
           and organization.status = 'pending'
           and not exists (
             select 1
             from public.public_organizations as visible
             where visible.id = organization.id
           )
       )

union all

select 'donations_require_all_readiness_states',
       not exists (
         select 1
         from public.public_organizations as organization
         join public.ngo_profiles as ngo on ngo.user_id = organization.id
         where organization.donations_enabled
           and (
             ngo.verification_status <> 'verified'
             or ngo.payout_status <> 'configured'
             or ngo.payment_status <> 'enabled'
           )
       )

union all

select 'published_stories_are_consistent',
       not exists (
         select 1
         from public.stories as story
         where story.status = 'published'
           and (story.published_at is null or char_length(trim(story.body)) = 0)
       )

union all

select 'published_story_media_is_readable',
       not exists (
         select 1
         from public.story_media as link
         join public.stories as story on story.id = link.story_id
         join public.media_assets as media on media.id = link.media_asset_id
         where story.status = 'published'
           and story.published_at <= now()
           and private.media_asset_has_public_reference(media.id)
           and media.visibility <> 'public'
       )

union all

select 'sensitive_tables_have_rls',
       bool_and(table_info.relrowsecurity)
from pg_class as table_info
join pg_namespace as schema_info on schema_info.oid = table_info.relnamespace
where schema_info.nspname = 'public'
  and table_info.relname in (
    'organizations',
    'organization_members',
    'ngo_profiles',
    'media_assets',
    'stories',
    'story_media',
    'story_reports'
  );
