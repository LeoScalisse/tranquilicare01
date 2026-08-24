begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.com', '{"account_type":"ngo","name":"Causa A"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'other@example.com', '{"account_type":"donor","name":"Outro"}'::jsonb);

update public.ngo_profiles
set description = 'Descricao publica suficiente',
    category = 'Social',
    goal = 'Objetivo real',
    address = 'Rua de Teste, 100, Sao Paulo - SP',
    status = 'approved'
where user_id = '11111111-1111-4111-8111-111111111111';

set local role anon;
select results_eq(
  $$select count(*)::bigint from public.organizations$$,
  $$values (1::bigint)$$,
  'visitor reads the active organization'
);
select throws_ok(
  $$update public.organizations set name = 'Blocked' where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'visitor cannot update organizations'
);
select throws_ok(
  $$select * from public.verification_documents$$,
  '42501',
  null,
  'visitor cannot read verification documents'
);
reset role;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;
select lives_ok(
  $$update public.organizations set short_description = 'Atualizada pelo membro' where id = '11111111-1111-4111-8111-111111111111'$$,
  'owner updates their organization'
);
select lives_ok(
  $$insert into public.stories (organization_id, author_profile_id, title, body) values ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Historia', 'Conteudo')$$,
  'owner creates a draft story'
);
reset role;

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;
select results_eq(
  $$update public.organizations set name = 'Blocked' where id = '11111111-1111-4111-8111-111111111111' returning id$$,
  $$select null::uuid where false$$,
  'another user cannot update the organization'
);
select throws_ok(
  $$insert into public.stories (organization_id, author_profile_id, title, body) values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Blocked', 'Blocked')$$,
  '42501',
  null,
  'another user cannot create a story for the organization'
);
reset role;

select * from finish();
rollback;

