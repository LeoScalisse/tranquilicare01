-- Public, deliberately minimal projection used by the community sphere on the
-- logged-out home page. No e-mail, contact, donation or private profile fields
-- are exposed.

create or replace function public.list_public_community_sphere_profiles(
  profile_limit integer default 36
)
returns table (
  profile_key text,
  display_name text,
  avatar_url text,
  profile_type text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with community_profiles as (
    select
      'organization-' || md5(organization.id::text) as profile_key,
      organization.name as display_name,
      organization.avatar_url,
      'organization'::text as profile_type,
      organization.updated_at
    from public.public_organizations as organization
    where nullif(trim(organization.avatar_url), '') is not null
      and nullif(trim(organization.name), '') is not null

    union all

    select
      'donor-' || md5(profile.id::text) as profile_key,
      profile.name as display_name,
      profile.avatar_url,
      'donor'::text as profile_type,
      profile.updated_at
    from public.profiles as profile
    join public.donor_profiles as donor on donor.user_id = profile.id
    where profile.account_type::text = 'donor'
      and nullif(trim(profile.avatar_url), '') is not null
      and nullif(trim(profile.name), '') is not null
  )
  select
    community.profile_key,
    community.display_name,
    community.avatar_url,
    community.profile_type,
    community.updated_at
  from community_profiles as community
  order by community.updated_at desc
  limit greatest(1, least(coalesce(profile_limit, 36), 60));
$$;

revoke all on function public.list_public_community_sphere_profiles(integer)
from public;

grant execute on function public.list_public_community_sphere_profiles(integer)
to anon, authenticated;

comment on function public.list_public_community_sphere_profiles(integer) is
  'Minimal public community sphere projection: opaque key, display name, avatar and account kind only.';

notify pgrst, 'reload schema';
