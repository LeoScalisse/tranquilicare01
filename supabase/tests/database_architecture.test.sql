begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

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
