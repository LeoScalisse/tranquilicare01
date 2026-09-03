-- Run after 20260902040000_founder_code_catalog_and_feedback.sql.
-- Every result should be true. Remaining activations are included for diagnosis.

with expected(code_name, code_hash, is_test) as (
  values
    ('CADES'::text, '08966b7f3b40ec32e47e95c136b86d51bae1a9261974115e1ed33f382781bcf3'::text, false),
    ('MONTEAZUL'::text, 'c816cafb0bec57fbdf9f72a3e3fc5c83ded66aabe99ac015e1455ebede4a3aa8'::text, false),
    ('CARE'::text, '5ed9cca6255e6e0ab7d664335bf2f7720f7e748b938d40eb37f2e7aba81666e4'::text, true)
), catalog as (
  select
    expected.code_name,
    code.redemption_count,
    code.max_redemptions,
    code.max_redemptions - code.redemption_count as remaining_activations,
    code.revoked_at,
    code.expires_at,
    code.is_test = expected.is_test as correct_kind
  from expected
  left join private.founder_ngo_codes as code
    on code.code_hash = expected.code_hash
)
select
  code_name,
  redemption_count,
  max_redemptions,
  remaining_activations,
  coalesce(remaining_activations > 0, false) as available,
  revoked_at is null as not_revoked,
  expires_at is null or expires_at > now() as not_expired,
  coalesce(correct_kind, false) as correct_kind
from catalog
order by code_name;

select count(*) = 3 as only_three_active_founder_codes
from private.founder_ngo_codes
where revoked_at is null
  and (expires_at is null or expires_at > now());

select
  pg_get_functiondef(
    'public.save_own_ngo_profile(text,text,jsonb,text,text,text,text,jsonb,text,text,text,text,text,text,text,text,double precision,double precision,text,text)'::regprocedure
  ) like '%founder-code-not-found%' as precise_not_found_error,
  pg_get_functiondef(
    'public.save_own_ngo_profile(text,text,jsonb,text,text,text,text,jsonb,text,text,text,text,text,text,text,text,double precision,double precision,text,text)'::regprocedure
  ) like '%founder-code-already-used%' as precise_already_used_error,
  pg_get_functiondef(
    'public.save_own_ngo_profile(text,text,jsonb,text,text,text,text,jsonb,text,text,text,text,text,text,text,text,double precision,double precision,text,text)'::regprocedure
  ) like '%private.founder_code_sha256%' as schema_safe_hash_lookup;

select
  private.founder_code_sha256('TCCADES') = '08966b7f3b40ec32e47e95c136b86d51bae1a9261974115e1ed33f382781bcf3' as cades_hash_matches,
  private.founder_code_sha256('TCMONTEAZUL') = 'c816cafb0bec57fbdf9f72a3e3fc5c83ded66aabe99ac015e1455ebede4a3aa8' as monte_azul_hash_matches,
  private.founder_code_sha256('TCCARE') = '5ed9cca6255e6e0ab7d664335bf2f7720f7e748b938d40eb37f2e7aba81666e4' as care_hash_matches;
