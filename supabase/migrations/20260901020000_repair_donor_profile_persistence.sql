-- Databases provisioned before donor personalization may not contain all
-- optional profile columns. Keep this migration idempotent so those databases
-- converge before the final RPC definition is installed.

alter table public.donor_profiles
  add column if not exists bio text not null default '',
  add column if not exists location text not null default '',
  add column if not exists instagram text,
  add column if not exists phone text,
  add column if not exists cover_image_url text,
  add column if not exists interests text[] not null default '{}'::text[];

notify pgrst, 'reload schema';
