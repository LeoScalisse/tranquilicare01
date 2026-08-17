alter table public.profiles
  add column if not exists ngo_profile jsonb;

revoke update on public.profiles from authenticated;
grant update (name, avatar_url, ngo_profile) on public.profiles to authenticated;
