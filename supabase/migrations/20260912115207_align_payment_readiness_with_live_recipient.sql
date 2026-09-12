begin;

-- Payment availability comes from the real, server-only recipient state. The
-- public projection exposes only the resulting boolean, never credentials.
create or replace function private.organization_has_active_payment_connection(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.payment_recipients as recipient
    join public.payment_recipient_credentials as credential
      on credential.recipient_id = recipient.id
    where (
      recipient.organization_uuid = target_organization_id
      or recipient.organization_id = target_organization_id::text
    )
      and recipient.provider = 'mercado_pago'
      and recipient.status = 'active'
      and recipient.livemode = true
      and credential.provider = 'mercado_pago'
      and credential.live_mode = true
      and credential.disconnected_at is null
      and credential.expires_at > now()
  );
$$;

revoke all on function private.organization_has_active_payment_connection(uuid) from public;
grant execute on function private.organization_has_active_payment_connection(uuid)
to anon, authenticated, service_role;

create or replace function private.organization_can_receive_donations(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations as organization
    join public.ngo_profiles as ngo on ngo.user_id = organization.id
    where organization.id = target_organization_id
      and organization.status = 'active'
      and ngo.verification_status = 'verified'
      and private.organization_has_active_payment_connection(organization.id)
  );
$$;

revoke all on function private.organization_can_receive_donations(uuid) from public;
grant execute on function private.organization_can_receive_donations(uuid)
to anon, authenticated, service_role;

comment on function private.organization_has_active_payment_connection(uuid) is
  'Returns only whether an organization has a usable live Mercado Pago recipient; credentials remain server-only.';
comment on function private.organization_can_receive_donations(uuid) is
  'Authoritative donation eligibility: active organization, verified profile and usable live recipient connection.';

-- Keep legacy preparation fields synchronized for the authenticated owner
-- experience. They remain server-controlled and cannot be elevated by clients.
create or replace function private.sync_mercado_pago_payment_readiness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_recipient_id uuid;
  target_organization_id uuid;
  connection_ready boolean := false;
begin
  if tg_table_name = 'payment_recipient_credentials' then
    target_recipient_id := case when tg_op = 'DELETE' then old.recipient_id else new.recipient_id end;
    select coalesce(
      recipient.organization_uuid,
      case
        when recipient.organization_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then recipient.organization_id::uuid
        else null
      end
    )
    into target_organization_id
    from public.payment_recipients as recipient
    where recipient.id = target_recipient_id
      and recipient.provider = 'mercado_pago';
  else
    target_organization_id := case
      when tg_op = 'DELETE' then coalesce(
        old.organization_uuid,
        case
          when old.organization_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            then old.organization_id::uuid
          else null
        end
      )
      else coalesce(
        new.organization_uuid,
        case
          when new.organization_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            then new.organization_id::uuid
          else null
        end
      )
    end;
  end if;

  if target_organization_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  connection_ready := private.organization_has_active_payment_connection(target_organization_id);

  update public.ngo_profiles as ngo
  set payout_status = case when connection_ready then 'configured' else 'not_configured' end,
      payment_status = case
        when connection_ready
          and ngo.verification_status = 'verified'
          and exists (
            select 1
            from public.organizations as organization
            where organization.id = target_organization_id
              and organization.status = 'active'
          )
          then 'enabled'
        else 'disabled'
      end,
      updated_at = now()
  where ngo.user_id = target_organization_id;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.sync_mercado_pago_payment_readiness()
from public, anon, authenticated;

drop trigger if exists payment_recipients_sync_mercado_pago_readiness
on public.payment_recipients;
create trigger payment_recipients_sync_mercado_pago_readiness
after insert or update of status, livemode, organization_id, organization_uuid or delete
on public.payment_recipients
for each row execute function private.sync_mercado_pago_payment_readiness();

drop trigger if exists payment_recipient_credentials_sync_mercado_pago_readiness
on public.payment_recipient_credentials;
create trigger payment_recipient_credentials_sync_mercado_pago_readiness
after insert or update of live_mode, expires_at, disconnected_at or delete
on public.payment_recipient_credentials
for each row execute function private.sync_mercado_pago_payment_readiness();

-- Older OAuth rows predate the canonical UUID column.
update public.payment_recipients as recipient
set organization_uuid = organization.id
from public.organizations as organization
where recipient.organization_uuid is null
  and recipient.organization_id = organization.id::text;

update public.ngo_profiles as ngo
set payout_status = case
      when private.organization_has_active_payment_connection(ngo.user_id)
        then 'configured'
      else 'not_configured'
    end,
    payment_status = case
      when private.organization_can_receive_donations(ngo.user_id)
        then 'enabled'
      else 'disabled'
    end,
    updated_at = now()
where exists (
  select 1
  from public.payment_recipients as recipient
  where recipient.provider = 'mercado_pago'
    and (
      recipient.organization_uuid = ngo.user_id
      or recipient.organization_id = ngo.user_id::text
    )
);

commit;
