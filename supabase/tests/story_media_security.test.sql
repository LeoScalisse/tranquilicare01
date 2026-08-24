begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'cause-a@example.com', '{"account_type":"ngo","name":"Causa A"}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cause-b@example.com', '{"account_type":"ngo","name":"Causa B"}'::jsonb);

update public.organizations
set status = 'active', published_at = now()
where id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);

insert into public.media_assets (
  id, owner_profile_id, organization_id, purpose, provider, bucket,
  storage_key, media_type, mime_type
)
values
  (
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'story', 'supabase', 'stories-public',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/story-a.webp', 'image', 'image/webp'
  ),
  (
    'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'story', 'supabase', 'stories-public',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/story-b.webp', 'image', 'image/webp'
  );

insert into public.stories (id, organization_id, author_profile_id, title, body)
values (
  'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Historia em rascunho',
  'Conteudo protegido'
);

select lives_ok(
  $$insert into public.story_media (story_id, media_asset_id) values ('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa', 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa')$$,
  'story accepts media from its organization'
);

select throws_ok(
  $$insert into public.story_media (story_id, media_asset_id, sort_order) values ('aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa', 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb', 1)$$,
  '23514',
  'story media must belong to the same organization',
  'story rejects media from another organization'
);

select results_eq(
  $$select visibility from public.media_assets where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'$$,
  $$values ('private'::text)$$,
  'draft story media stays private'
);

set local role anon;
select results_eq(
  $$select count(*)::bigint from public.media_assets where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'$$,
  $$values (0::bigint)$$,
  'visitor cannot inspect draft story media'
);
reset role;

update public.stories
set status = 'published', published_at = now()
where id = 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa';

select results_eq(
  $$select visibility from public.media_assets where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'$$,
  $$values ('public'::text)$$,
  'publishing a story exposes its media atomically'
);

set local role anon;
select results_eq(
  $$select count(*)::bigint from public.media_assets where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'$$,
  $$values (1::bigint)$$,
  'visitor can inspect published story media'
);
reset role;

update public.stories
set status = 'archived'
where id = 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa';

select results_eq(
  $$select visibility from public.media_assets where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'$$,
  $$values ('private'::text)$$,
  'archiving a story makes its media private again'
);

select ok(
  (select public = false from storage.buckets where id = 'stories-public'),
  'story bytes live in a private bucket'
);

select * from finish();
rollback;
