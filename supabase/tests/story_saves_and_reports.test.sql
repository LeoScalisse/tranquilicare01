begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select ok(to_regclass('public.story_saves') is not null, 'story_saves exists');
select ok(to_regclass('public.story_reports') is not null, 'story_reports exists');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'story-author@example.com', '{"account_type":"ngo","name":"Causa autora"}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'reporter-1@example.com', '{"account_type":"donor","name":"Pessoa 1"}'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'reporter-2@example.com', '{"account_type":"donor","name":"Pessoa 2"}'::jsonb),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'reporter-3@example.com', '{"account_type":"donor","name":"Pessoa 3"}'::jsonb),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'reporter-4@example.com', '{"account_type":"donor","name":"Pessoa 4"}'::jsonb),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'reporter-5@example.com', '{"account_type":"donor","name":"Pessoa 5"}'::jsonb);

update public.organizations
set status = 'active', published_at = now()
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

insert into public.stories (id, organization_id, author_profile_id, body, status, published_at)
values (
  'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Uma historia real para testar as interacoes.',
  'published',
  now()
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
set local role authenticated;

select lives_ok(
  $$insert into public.story_saves (profile_id, story_id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa')$$,
  'a person can save a published story'
);

select results_eq(
  $$select count(*)::bigint from public.story_saves$$,
  $$values (1::bigint)$$,
  'a person can read their own saved story'
);

insert into public.story_reports (story_id, reporter_profile_id, reason)
values ('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Conteudo que precisa ser revisado');

select results_eq(
  $$select count(*)::bigint from public.story_reports$$,
  $$values (1::bigint)$$,
  'a reporter can read their own report'
);

reset role;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
set local role authenticated;

select results_eq(
  $$select count(*)::bigint from public.story_reports$$,
  $$values (0::bigint)$$,
  'reports from other people stay private'
);

insert into public.story_reports (story_id, reporter_profile_id, reason)
values ('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Conteudo que precisa ser revisado');

reset role;
select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);
set local role authenticated;
insert into public.story_reports (story_id, reporter_profile_id, reason)
values ('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Conteudo que precisa ser revisado');

reset role;
select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', true);
set local role authenticated;
insert into public.story_reports (story_id, reporter_profile_id, reason)
values ('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Conteudo que precisa ser revisado');

reset role;
select results_eq(
  $$select status from public.stories where id = 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa'$$,
  $$values ('published'::text)$$,
  'four distinct reports do not automatically remove a story'
);

select set_config('request.jwt.claim.sub', 'ffffffff-ffff-4fff-8fff-ffffffffffff', true);
set local role authenticated;
insert into public.story_reports (story_id, reporter_profile_id, reason)
values ('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa', 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'Conteudo que precisa ser revisado');

reset role;
select results_eq(
  $$select status from public.stories where id = 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa'$$,
  $$values ('archived'::text)$$,
  'the fifth distinct report archives the story globally'
);

select * from finish();
rollback;
