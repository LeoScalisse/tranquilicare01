-- Run after 20260902023000_temporary_persisted_donation_simulation.sql.
-- Every row must return ok = true. This script changes no data.

select 'simulation_enabled' as check_name,
       public.donation_simulation_status() as ok

union all

select 'test_donations_are_marked',
       not exists (
         select 1
         from public.donations as donation
         where donation.payment_provider = 'simulation'
           and not donation.is_test
       )

union all

select 'test_relationships_are_marked',
       not exists (
         select 1
         from public.donor_relationships as relationship
         join public.donations as donation on donation.id = relationship.donation_id
         where donation.is_test
           and not relationship.is_test
       )

union all

select 'simulation_function_is_not_anonymous',
       not has_function_privilege(
         'anon',
         'public.create_simulated_donation(uuid,integer)',
         'execute'
       );
