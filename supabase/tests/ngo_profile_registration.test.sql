begin;

create extension if not exists pgtap with schema extensions;
select plan(2);

-- Exercise the same existing-row path used when a newly confirmed NGO reaches
-- step 3: Auth creates the profile first, then the onboarding RPC updates it.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000043'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'rpc-registration-test@tranquilicare.invalid',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Instituto Teste RPC","account_type":"ngo"}'::jsonb,
  now(),
  now()
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000043',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

set local role authenticated;

select lives_ok(
  $$
    select *
    from public.save_own_ngo_profile(
      'Instituto Teste RPC',
      '',
      jsonb_build_object(
        'publicEmail', 'rpc-registration-test@tranquilicare.invalid',
        'description', 'A causa ganhou forma.',
        'category', 'Educação',
        'goal', 'Abrir uma nova turma.',
        'objectives', jsonb_build_array('Atender jovens.'),
        'address', '',
        'city', 'São Paulo',
        'state', 'SP'
      ),
      'rpc-registration-test@tranquilicare.invalid',
      'A causa ganhou forma.',
      'Educação',
      'Abrir uma nova turma.',
      jsonb_build_array('Atender jovens.'),
      '',
      '',
      '',
      '',
      '',
      '',
      'São Paulo',
      'SP',
      null,
      null,
      '',
      ''
    )
  $$,
  'an authenticated NGO can save step 3 over its existing profile row'
);

reset role;

select is(
  (
    select organization.city || '/' || organization.state
    from public.organizations as organization
    where organization.id = '00000000-0000-4000-8000-000000000043'::uuid
  ),
  'São Paulo/SP',
  'step 3 persists the public organization location'
);

select * from finish();
rollback;
