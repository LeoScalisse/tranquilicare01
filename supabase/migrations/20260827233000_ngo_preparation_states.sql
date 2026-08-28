-- Keep cause setup, verification, payout readiness and payment eligibility as
-- separate states. None of these columns expose documents or provider secrets.
alter table public.ngo_profiles
  add column if not exists profile_status text not null default 'not_started'
    check (profile_status in ('not_started', 'ready')),
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending', 'in_review', 'verified', 'needs_review')),
  add column if not exists payout_status text not null default 'not_configured'
    check (payout_status in ('not_configured', 'in_review', 'configured', 'needs_review')),
  add column if not exists payment_status text not null default 'disabled'
    check (payment_status in ('disabled', 'enabled'));

-- `save_own_ngo_profile` writes the compatibility JSON payload before it
-- upserts this canonical row. Browser writes may mark only the public profile
-- as ready; verification, payouts and payment eligibility stay server-owned.
create or replace function public.sync_ngo_preparation_states()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
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
  if tg_op = 'INSERT' then
    new.verification_status := 'pending';
    new.payout_status := 'not_configured';
    new.payment_status := 'disabled';
  else
    new.verification_status := old.verification_status;
    new.payout_status := old.payout_status;
    new.payment_status := case
      when old.verification_status = 'verified' and old.payout_status = 'configured'
        and old.payment_status = 'enabled' then 'enabled'
      else 'disabled'
    end;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_ngo_preparation_states() from public, anon, authenticated;

drop trigger if exists ngo_profiles_sync_preparation_states on public.ngo_profiles;
create trigger ngo_profiles_sync_preparation_states
before insert or update on public.ngo_profiles
for each row execute function public.sync_ngo_preparation_states();

-- Existing rows keep their real content; they simply start in the safest
-- state until verification and recipients are completed.
update public.ngo_profiles
set payment_status = 'disabled'
where payment_status is distinct from 'disabled'
  and (verification_status <> 'verified' or payout_status <> 'configured');
