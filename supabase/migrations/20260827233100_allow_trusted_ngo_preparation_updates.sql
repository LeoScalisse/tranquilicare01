-- Browser writes can save the cause but cannot elevate verification, payout or
-- payment readiness. A backend worker (without an authenticated end user) can
-- move those provider-neutral states after completing its own checks.
create or replace function public.sync_ngo_preparation_states()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
  is_client_write boolean;
begin
  select ngo_profile into payload from public.profiles where id = new.user_id;

  new.profile_status := case
    when coalesce(btrim(payload->>'category'), '') <> ''
      and coalesce(btrim(payload->>'description'), '') <> ''
      and coalesce(btrim(payload->>'goal'), '') <> ''
      and coalesce(btrim(payload->>'address'), '') <> ''
      and exists (
        select 1
        from jsonb_array_elements_text(coalesce(payload->'objectives', '[]'::jsonb)) as objective(value)
        where btrim(objective.value) <> ''
      )
      then 'ready'
    else 'not_started'
  end;

  is_client_write := auth.uid() is not null;
  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    new.payout_status := 'not_configured';
    new.payment_status := 'disabled';
  elsif is_client_write then
    new.verification_status := old.verification_status;
    new.payout_status := old.payout_status;
    new.payment_status := case
      when old.verification_status = 'verified' and old.payout_status = 'configured'
        and old.payment_status = 'enabled' then 'enabled'
      else 'disabled'
    end;
  else
    new.verification_status := case new.verification_status
      when 'in_review' then 'in_review'
      when 'verified' then 'verified'
      when 'needs_review' then 'needs_review'
      else 'pending'
    end;
    new.payout_status := case new.payout_status
      when 'in_review' then 'in_review'
      when 'configured' then 'configured'
      when 'needs_review' then 'needs_review'
      else 'not_configured'
    end;
    new.payment_status := case
      when new.verification_status = 'verified' and new.payout_status = 'configured'
        and new.payment_status = 'enabled' then 'enabled'
      else 'disabled'
    end;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_ngo_preparation_states() from public, anon, authenticated;
