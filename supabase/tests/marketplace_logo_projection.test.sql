begin;

create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (id, email, raw_user_meta_data)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'marketplace-logo@example.com',
  '{"account_type":"ngo","name":"Causa com Logo"}'::jsonb
);

insert into public.media_assets (
  id, owner_profile_id, organization_id, purpose, provider, bucket,
  storage_key, external_url, media_type, visibility, created_at
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'avatar', 'supabase', 'profile-media',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/logos/profile/original.jpg',
    'https://cdn.example/profile-original.jpg', 'image', 'public', now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'logo_processed', 'supabase', 'profile-media',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/logos/processed/transparent.png',
    'https://cdn.example/card-transparent.png', 'image', 'public', now()
  );

update public.organizations
set status = 'active',
    avatar_media_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

select has_column(
  'public',
  'public_organizations',
  'marketplace_logo_url',
  'public marketplace projection has a separate processed logo'
);

set local role anon;
select results_eq(
  $$select avatar_url, marketplace_logo_url
    from public.public_organizations
    where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'$$,
  $$values (
    'https://cdn.example/profile-original.jpg'::text,
    'https://cdn.example/card-transparent.png'::text
  )$$,
  'the avatar stays original while the marketplace receives the processed logo'
);
reset role;

select * from finish();
rollback;
