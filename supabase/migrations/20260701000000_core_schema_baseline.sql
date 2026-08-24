-- Core schema baseline.
--
-- This file records the foundational objects that originally lived only in
-- supabase/schema.sql. Existing environments already contain these objects and
-- should mark this version as applied instead of executing it a second time.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'account_type'
  ) then
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

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
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
set search_path = ''
as $$
declare
  metadata_account_type public.account_type;
begin
  metadata_account_type := case
    when new.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
      then (new.raw_user_meta_data ->> 'account_type')::public.account_type
    else 'donor'::public.account_type
  end;

  insert into public.profiles (
    id,
    email,
    name,
    avatar_url,
    account_type,
    account_type_locked
  )
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

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (
  id,
  email,
  name,
  avatar_url,
  account_type,
  account_type_locked
)
select
  users.id,
  coalesce(users.email, ''),
  coalesce(users.raw_user_meta_data ->> 'name', users.raw_user_meta_data ->> 'full_name', ''),
  coalesce(users.raw_user_meta_data ->> 'avatar', users.raw_user_meta_data ->> 'avatar_url'),
  case
    when users.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
      then (users.raw_user_meta_data ->> 'account_type')::public.account_type
    else 'donor'::public.account_type
  end,
  users.raw_user_meta_data ->> 'account_type' in ('donor', 'ngo')
from auth.users as users
on conflict (id) do nothing;

create or replace function public.set_initial_account_type(
  next_account_type public.account_type
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile public.profiles;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
  set account_type = next_account_type,
      account_type_locked = true
  where id = (select auth.uid())
    and account_type_locked = false
  returning * into profile;

  if profile.id is null then
    select * into profile
    from public.profiles
    where id = (select auth.uid());
  end if;

  return profile;
end;
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (name, avatar_url) on table public.profiles to authenticated;

revoke all on function public.set_initial_account_type(public.account_type) from public;
grant execute on function public.set_initial_account_type(public.account_type) to authenticated;

