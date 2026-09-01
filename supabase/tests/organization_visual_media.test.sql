begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'visual@example.com',
  '{"account_type":"ngo","name":"Causa Visual"}'::jsonb
);

select has_column('public', 'organizations', 'visual_profile_status', 'organization records visual setup separately');
select has_column('public', 'organizations', 'media_usage_authorized_at', 'organization records image authorization');

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
set local role authenticated;

select lives_ok(
  $$insert into public.media_assets (
      owner_profile_id, organization_id, purpose, provider, bucket,
      storage_key, media_type, visibility
    ) values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'logo_original', 'supabase', 'organization-media-originals',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc/logos/original.png', 'image', 'private'
    )$$,
  'owner can preserve an original logo privately'
);

select lives_ok(
  $$select public.complete_own_organization_visual_setup(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      true
    )$$,
  'owner can record visual completion and authorization'
);

select results_eq(
  $$select visual_profile_status, media_usage_authorized_by
    from public.organizations
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  $$values ('ready'::text, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid)$$,
  'completion records the authenticated owner as the authorizer'
);

select throws_ok(
  $$update public.organizations
    set media_usage_authorized_by = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  '42501',
  null,
  'the client cannot forge the authorization identity'
);
reset role;

set local role anon;
select results_eq(
  $$select count(*)::bigint from public.media_assets
    where organization_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      and purpose = 'logo_original'$$,
  $$values (0::bigint)$$,
  'visitor cannot inspect the private original logo'
);
reset role;

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);
set local role authenticated;
select throws_ok(
  $$select public.complete_own_organization_visual_setup(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      true
    )$$,
  '42501',
  'organization-access-denied',
  'another account cannot complete the visual setup'
);
reset role;

select * from finish();
rollback;
