-- The legacy organization identity trigger runs for every profile update.
-- Its previous implementation attempted to create organization media using
-- the profile id even when the profile belonged to a donor. That violates the
-- media_assets.organization_id foreign key whenever a donor changes avatar.

create or replace function private.sync_legacy_organization_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  media_id uuid;
begin
  select organization.id
  into target_organization_id
  from public.organizations as organization
  where organization.legacy_owner_profile_id = new.id
  limit 1;

  -- Donor profiles do not own an organization. Their identity update is
  -- complete in public.profiles and must not enter the NGO media pipeline.
  if target_organization_id is null then
    return new;
  end if;

  update public.organizations
  set name = new.name,
      public_email = case
        when public.organizations.public_email = old.email then nullif(new.email, '')
        else public.organizations.public_email
      end
  where id = target_organization_id;

  if new.avatar_url is distinct from old.avatar_url
    and nullif(trim(new.avatar_url), '') is not null then
    media_id := private.upsert_public_media(
      target_organization_id,
      new.id,
      'avatar',
      new.avatar_url
    );

    update public.organizations
    set avatar_media_id = media_id
    where id = target_organization_id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_legacy_organization_identity() from public;

-- Recreate the trigger explicitly so databases assembled manually converge on
-- the same corrected function.
drop trigger if exists profiles_sync_organization_identity on public.profiles;
create trigger profiles_sync_organization_identity
after update of name, email, avatar_url on public.profiles
for each row execute function private.sync_legacy_organization_identity();

notify pgrst, 'reload schema';
