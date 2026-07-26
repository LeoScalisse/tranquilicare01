-- TranquiliCare Supabase foundation
-- Run this in the Supabase SQL editor before moving app data out of demo files.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_type') then
    create type public.account_type as enum ('donor', 'ngo');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  avatar_url text,
  credits integer not null default 0 check (credits >= 0),
  account_type public.account_type not null default 'donor',
  account_type_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists account_type_locked boolean not null default false;

alter table public.profiles enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_account_type public.account_type;
begin
  metadata_account_type := case
    when new.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
      then (new.raw_user_meta_data ->> 'account_type')::public.account_type
    else 'donor'::public.account_type
  end;

  insert into public.profiles (id, email, name, avatar_url, account_type, account_type_locked)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar', new.raw_user_meta_data ->> 'avatar_url'),
    metadata_account_type,
    new.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this schema was installed.
insert into public.profiles (id, email, name, avatar_url, account_type, account_type_locked)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name', ''),
  coalesce(u.raw_user_meta_data ->> 'avatar', u.raw_user_meta_data ->> 'avatar_url'),
  case
    when u.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
      then (u.raw_user_meta_data ->> 'account_type')::public.account_type
    else 'donor'::public.account_type
  end,
  u.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
from auth.users u
on conflict (id) do nothing;

-- OAuth cannot pass the chosen role before redirect. This one-time RPC lets a
-- signed-in user lock the role selected on the login screen, without granting
-- direct UPDATE permission on account_type.
create or replace function public.set_initial_account_type(next_account_type public.account_type)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
  set account_type = next_account_type,
      account_type_locked = true
  where id = auth.uid()
    and account_type_locked = false
  returning * into profile;

  if profile.id is null then
    select * into profile from public.profiles where id = auth.uid();
  end if;

  return profile;
end;
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Authenticated users can read their full row, but only edit public profile
-- fields. Credits, account_type and verification-like fields should be changed
-- only by trusted SQL functions, webhooks or server-side code.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;

revoke all on function public.set_initial_account_type(public.account_type) from public;
grant execute on function public.set_initial_account_type(public.account_type) to authenticated;
