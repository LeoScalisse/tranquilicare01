-- Keep the owner's profile and existing relationships; remove only its public
-- organization listing. The fixed ID was verified against the existing account.
create or replace function private.organization_profile_is_public(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organizations organization
    left join public.ngo_profiles ngo on ngo.user_id = organization.id
    where organization.id = target_organization_id
      and organization.id <> 'a1e70beb-0324-43d5-a806-780252c232c4'::uuid
      and (organization.status = 'active' or (organization.status = 'pending' and ngo.profile_status = 'ready'))
  );
$$;
