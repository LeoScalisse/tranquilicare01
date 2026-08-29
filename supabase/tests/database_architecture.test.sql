begin;

create extension if not exists pgtap with schema extensions;
select plan(28);

select ok(to_regclass('public.organizations') is not null, 'organizations exists');
select ok(to_regclass('public.organization_members') is not null, 'organization_members exists');
select ok(to_regclass('public.organization_verifications') is not null, 'organization_verifications exists');
select ok(to_regclass('public.verification_documents') is not null, 'verification_documents exists');
select ok(to_regclass('public.media_assets') is not null, 'media_assets exists');
select ok(to_regclass('public.stories') is not null, 'stories exists');
select ok(to_regclass('public.story_media') is not null, 'story_media exists');
select ok(to_regclass('public.impact_metrics') is not null, 'impact_metrics exists');
select ok(to_regclass('public.campaigns') is not null, 'campaigns exists');
select ok(to_regclass('public.public_organizations') is not null, 'public organization view exists');

select ok((select relrowsecurity from pg_class where oid = 'public.organizations'::regclass), 'organizations uses RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.stories'::regclass), 'stories uses RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.verification_documents'::regclass), 'verification documents use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.payment_events'::regclass), 'payment events use RLS');

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and contype = 'u'
  ),
  'organization membership is unique'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.payment_events'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%provider%provider_event_id%'
  ),
  'payment events are idempotent per provider'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.donations'::regclass
      and conname = 'donations_organization_id_fkey'
  ),
  'donations have a domain organization foreign key'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_organizations'
      and column_name in ('internal_notes', 'provider_recipient_id', 'reviewed_by')
  ),
  'public organization view excludes private fields'
);

select ok(
  not has_table_privilege('anon', 'public.organizations', 'SELECT')
  and not has_table_privilege('authenticated', 'public.organizations', 'SELECT'),
  'canonical organizations table is not directly readable by client roles'
);

select ok(
  position('organization.cnpj' in pg_get_viewdef('public.public_organizations'::regclass)) = 0
  and not has_column_privilege('anon', 'public.organizations', 'cnpj', 'SELECT')
  and not has_column_privilege('authenticated', 'public.organizations', 'cnpj', 'SELECT'),
  'CNPJ is not exposed through the public view or canonical table'
);

select ok(
  position('organization.address' in pg_get_viewdef('public.public_organizations'::regclass)) > 0
  and position('organization.latitude' in pg_get_viewdef('public.public_organizations'::regclass)) > 0
  and position('organization.longitude' in pg_get_viewdef('public.public_organizations'::regclass)) > 0,
  'public organization view keeps location data for the profile map'
);

select ok(
  position('organization.public_email' in pg_get_viewdef('public.public_organizations'::regclass)) > 0
  and position('organization.website' in pg_get_viewdef('public.public_organizations'::regclass)) > 0
  and position('organization.instagram' in pg_get_viewdef('public.public_organizations'::regclass)) > 0
  and position('organization.phone' in pg_get_viewdef('public.public_organizations'::regclass)) > 0,
  'public organization view keeps contact channels and social networks public'
);

select ok(
  coalesce(
    (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.public_organizations'::regclass),
    false
  ),
  'public organization view obeys caller RLS policies'
);

select ok(
  (select public = false from storage.buckets where id = 'verification-private'),
  'verification bucket is private'
);

select ok(
  not has_table_privilege('authenticated', 'public.audit_logs', 'SELECT'),
  'audit logs are not client-readable'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payments'
      and column_name = 'confirmation_token_hash'
  ),
  'payments store only a confirmation token hash'
);

select ok(
  (select public = false from storage.buckets where id = 'stories-public'),
  'story media bucket is private'
);

select col_default_is(
  'public',
  'media_assets',
  'visibility',
  'private',
  'new media assets are private by default'
);

select * from finish();
rollback;
