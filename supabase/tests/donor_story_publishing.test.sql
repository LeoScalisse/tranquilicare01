begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'donor-story-author@example.com', '{"account_type":"donor","name":"Pessoa autora"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'donor-story-reader@example.com', '{"account_type":"donor","name":"Pessoa leitora"}'::jsonb);

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;

select lives_ok(
  $$insert into public.stories (id, organization_id, author_profile_id, body, status, published_at)
    values ('33333333-3333-4333-8333-333333333333', null, '11111111-1111-4111-8111-111111111111', 'Uma história pessoal real.', 'published', now())$$,
  'a donor can publish a personal story'
);

select results_eq(
  $$select name from public.get_public_story_authors(array['11111111-1111-4111-8111-111111111111'::uuid])$$,
  $$values ('Pessoa autora'::text)$$,
  'the safe author projection exposes only the public display name'
);

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;

select results_eq(
  $$select count(*)::bigint from public.stories where id = '33333333-3333-4333-8333-333333333333'$$,
  $$values (1::bigint)$$,
  'another signed-in person can read a published donor story'
);

select throws_ok(
  $$insert into public.stories (organization_id, author_profile_id, body, status, published_at)
    values (null, '11111111-1111-4111-8111-111111111111', 'Tentativa de personificação.', 'published', now())$$,
  '42501',
  null,
  'a donor cannot publish as another profile'
);

select * from finish();
rollback;
