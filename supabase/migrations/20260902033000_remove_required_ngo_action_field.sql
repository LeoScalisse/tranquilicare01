-- "O que vocês fazem?" was removed from cause onboarding. Keep historical
-- objectives, but no longer require a non-empty objectives array for a public
-- profile to be considered ready.

create or replace function public.sync_ngo_preparation_states()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
  has_location boolean;
  is_client_write boolean;
begin
  select profile.ngo_profile
  into payload
  from public.profiles as profile
  where profile.id = new.user_id;

  has_location := coalesce(btrim(payload->>'address'), '') <> ''
    or (
      coalesce(btrim(payload->>'city'), '') <> ''
      and coalesce(btrim(payload->>'state'), '') ~ '^[A-Za-z]{2}$'
    );

  new.profile_status := case
    when coalesce(btrim(payload->>'category'), '') <> ''
      and coalesce(btrim(payload->>'description'), '') <> ''
      and coalesce(btrim(payload->>'goal'), '') <> ''
      and has_location
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
      when old.verification_status = 'verified'
        and old.payout_status = 'configured'
        and old.payment_status = 'enabled'
        then 'enabled'
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
      when new.verification_status = 'verified'
        and new.payout_status = 'configured'
        and new.payment_status = 'enabled'
        then 'enabled'
      else 'disabled'
    end;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_ngo_preparation_states() from public, anon, authenticated;

-- Re-evaluate only incomplete profiles that already contain every remaining
-- required cause field. Existing objectives and every verification/payment
-- state are preserved by the trigger above.
update public.ngo_profiles as ngo
set profile_status = ngo.profile_status
from public.profiles as profile
where profile.id = ngo.user_id
  and ngo.profile_status = 'not_started'
  and coalesce(btrim(profile.ngo_profile->>'category'), '') <> ''
  and coalesce(btrim(profile.ngo_profile->>'description'), '') <> ''
  and coalesce(btrim(profile.ngo_profile->>'goal'), '') <> ''
  and (
    coalesce(btrim(profile.ngo_profile->>'address'), '') <> ''
    or (
      coalesce(btrim(profile.ngo_profile->>'city'), '') <> ''
      and coalesce(btrim(profile.ngo_profile->>'state'), '') ~ '^[A-Za-z]{2}$'
    )
  );

comment on function public.sync_ngo_preparation_states() is
  'Separates public profile readiness from verification and payments. Cause readiness requires category, purpose, current focus and location; objectives are optional historical content.';

