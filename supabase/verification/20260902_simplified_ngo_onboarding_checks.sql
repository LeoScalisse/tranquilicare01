-- Run after 20260902033000_remove_required_ngo_action_field.sql.
-- Every row must return ok = true. This script changes no data.

select 'ready_profile_does_not_require_objectives' as check_name,
       pg_get_functiondef(
         'public.sync_ngo_preparation_states()'::regprocedure
       ) not like '%jsonb_array_elements_text%' as ok

union all

select 'empty_objectives_remain_valid',
       not exists (
         select 1
         from public.ngo_profiles as ngo
         join public.profiles as profile on profile.id = ngo.user_id
         where ngo.objectives = '[]'::jsonb
           and coalesce(btrim(profile.ngo_profile->>'category'), '') <> ''
           and coalesce(btrim(profile.ngo_profile->>'description'), '') <> ''
           and coalesce(btrim(profile.ngo_profile->>'goal'), '') <> ''
           and (
             coalesce(btrim(profile.ngo_profile->>'address'), '') <> ''
             or (
               coalesce(btrim(profile.ngo_profile->>'city'), '') <> ''
               and coalesce(btrim(profile.ngo_profile->>'state'), '') ~ '^[A-Za-z]{2}$'
             )
           )
           and ngo.profile_status <> 'ready'
       );

