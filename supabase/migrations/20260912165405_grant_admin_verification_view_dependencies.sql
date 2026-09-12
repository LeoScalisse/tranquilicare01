-- Keep base organization tables ungranted. This narrowly scoped RPC performs
-- an explicit server-side platform-admin check before returning review data.
drop view if exists public.admin_organization_verifications;

create or replace function public.admin_list_organization_verifications(
  status_filter text default 'queue',
  page_number integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.get_platform_admin_access() then
    raise exception 'admin_access_denied' using errcode = '42501';
  end if;

  if status_filter not in ('queue', 'pending', 'in_review', 'approved', 'rejected', 'all')
    or page_number < 0 then
    raise exception 'invalid_admin_verification_filter' using errcode = '22023';
  end if;

  with records as (
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
  ), filtered as (
    select *
    from records
    where status_filter = 'all'
      or (status_filter = 'queue' and verification_status in ('pending', 'in_review'))
      or verification_status = status_filter
  ), paged as (
    select *
    from filtered
    order by submitted_at asc nulls last, updated_at desc
    limit 20 offset (page_number::bigint * 20)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'verifications', coalesce((select jsonb_agg(to_jsonb(paged)) from paged), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.admin_list_organization_verifications(text, integer) from public, anon;
grant execute on function public.admin_list_organization_verifications(text, integer) to authenticated;
