-- Secure platform-admin review workflow for organization verification.

alter table public.organization_verifications
  drop constraint if exists organization_verifications_internal_notes_length;

alter table public.organization_verifications
  add constraint organization_verifications_internal_notes_length
  check (internal_notes is null or char_length(internal_notes) <= 2000);

drop policy if exists organizations_platform_admin_read on public.organizations;
create policy organizations_platform_admin_read
on public.organizations
for select
to authenticated
using ((select public.get_platform_admin_access()));

drop policy if exists ngo_profiles_platform_admin_read on public.ngo_profiles;
create policy ngo_profiles_platform_admin_read
on public.ngo_profiles
for select
to authenticated
using ((select public.get_platform_admin_access()));

drop policy if exists organization_verifications_platform_admin_read on public.organization_verifications;
create policy organization_verifications_platform_admin_read
on public.organization_verifications
for select
to authenticated
using ((select public.get_platform_admin_access()));

drop policy if exists organization_verifications_platform_admin_update on public.organization_verifications;
create policy organization_verifications_platform_admin_update
on public.organization_verifications
for update
to authenticated
using ((select public.get_platform_admin_access()))
with check (
  (select public.get_platform_admin_access())
  and status in ('pending', 'in_review', 'approved', 'rejected')
);

drop policy if exists verification_documents_platform_admin_read on public.verification_documents;
create policy verification_documents_platform_admin_read
on public.verification_documents
for select
to authenticated
using ((select public.get_platform_admin_access()));

create or replace function private.prepare_organization_verification_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer_id uuid := (select auth.uid());
  reviewer_is_admin boolean := false;
begin
  if reviewer_id is not null then
    select exists (
      select 1
      from private.platform_administrators as administrator
      where administrator.profile_id = reviewer_id
    ) into reviewer_is_admin;
  end if;

  if new.status in ('approved', 'rejected') then
    if not reviewer_is_admin then
      raise exception 'platform_admin_access_required' using errcode = '42501';
    end if;

    new.reviewed_at := now();
    new.reviewed_by := reviewer_id;
  elsif reviewer_is_admin then
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;

  return new;
end;
$$;

revoke all on function private.prepare_organization_verification_review() from public, anon, authenticated;

drop trigger if exists organization_verifications_prepare_review on public.organization_verifications;
create trigger organization_verifications_prepare_review
before update of status, internal_notes on public.organization_verifications
for each row execute function private.prepare_organization_verification_review();

-- The legacy profile synchronizer must only react to owner-editable content.
-- Server-controlled verification/payment updates must not write back into the
-- canonical verification record.
drop trigger if exists ngo_profiles_sync_domain on public.ngo_profiles;
create trigger ngo_profiles_sync_domain
after insert or update of
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
  geocoded_address
on public.ngo_profiles
for each row execute function private.sync_legacy_organization();

create or replace function private.sync_organization_verification_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_connection_ready boolean := false;
begin
  if new.status = 'approved' then
    payment_connection_ready := private.organization_has_active_payment_connection(new.organization_id);

    update public.organizations
    set status = 'active',
        published_at = coalesce(published_at, now())
    where id = new.organization_id;

    update public.ngo_profiles
    set status = 'approved',
        verification_status = 'verified',
        payment_status = case when payment_connection_ready then 'enabled' else 'disabled' end
    where user_id = new.organization_id;
  elsif new.status = 'rejected' then
    update public.organizations
    set status = 'rejected',
        published_at = null
    where id = new.organization_id;

    update public.ngo_profiles
    set status = 'rejected',
        verification_status = 'needs_review',
        payment_status = 'disabled'
    where user_id = new.organization_id;
  elsif new.status in ('pending', 'in_review') then
    update public.organizations
    set status = 'pending',
        published_at = null
    where id = new.organization_id;

    update public.ngo_profiles
    set status = 'pending',
        verification_status = new.status,
        payment_status = 'disabled'
    where user_id = new.organization_id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_organization_verification_state() from public, anon, authenticated;

drop trigger if exists organization_verifications_sync_state on public.organization_verifications;
create trigger organization_verifications_sync_state
after insert or update of status on public.organization_verifications
for each row execute function private.sync_organization_verification_state();

drop view if exists public.admin_organization_verifications;
create view public.admin_organization_verifications
with (security_invoker = true)
as
select
  organization.id as organization_id,
  organization.name,
  organization.public_email,
  organization.cnpj,
  organization.address,
  organization.city,
  organization.state,
  organization.status as organization_status,
  verification.status as verification_status,
  verification.submitted_at,
  verification.reviewed_at,
  verification.reviewed_by,
  verification.internal_notes,
  verification.updated_at,
  coalesce(document_totals.document_count, 0)::integer as document_count,
  coalesce(document_totals.accepted_document_count, 0)::integer as accepted_document_count,
  private.organization_has_active_payment_connection(organization.id) as mercado_pago_connected,
  ngo.payout_status,
  ngo.payment_status
from public.organizations as organization
join public.organization_verifications as verification
  on verification.organization_id = organization.id
left join public.ngo_profiles as ngo
  on ngo.user_id = organization.id
left join lateral (
  select
    count(*) as document_count,
    count(*) filter (where document.status = 'accepted') as accepted_document_count
  from public.verification_documents as document
  where document.verification_id = verification.id
) as document_totals on true
where public.get_platform_admin_access();

revoke all on table public.admin_organization_verifications from public, anon, authenticated;
grant select on table public.admin_organization_verifications to authenticated;

comment on view public.admin_organization_verifications is
  'Organization verification queue exposed only to authenticated platform administrators through RLS.';
