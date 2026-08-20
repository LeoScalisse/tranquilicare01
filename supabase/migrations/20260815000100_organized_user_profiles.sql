create table if not exists public.donor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ngo_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  cnpj text,
  address text not null default '',
  description text not null default '',
  category text not null default '',
  goal text not null default '',
  instagram text,
  phone text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ngo_profiles_cnpj_format check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  constraint ngo_profiles_phone_format check (phone is null or phone ~ '^[0-9]{10,11}$')
);

create unique index if not exists ngo_profiles_cnpj_unique
on public.ngo_profiles (cnpj)
where cnpj is not null;

drop trigger if exists donor_profiles_touch_updated_at on public.donor_profiles;
create trigger donor_profiles_touch_updated_at
before update on public.donor_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists ngo_profiles_touch_updated_at on public.ngo_profiles;
create trigger ngo_profiles_touch_updated_at
before update on public.ngo_profiles
for each row execute function public.touch_updated_at();

create or replace function public.sync_profile_role_tables()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.account_type = 'ngo'::public.account_type then
    insert into public.ngo_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    delete from public.donor_profiles where user_id = new.id;
  else
    insert into public.donor_profiles (user_id, credits)
    values (new.id, new.credits)
    on conflict (user_id) do update set credits = excluded.credits;
    delete from public.ngo_profiles where user_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_profile_role_tables() from public;

drop trigger if exists profiles_sync_role_tables on public.profiles;
create trigger profiles_sync_role_tables
after insert or update of account_type on public.profiles
for each row execute function public.sync_profile_role_tables();

insert into public.donor_profiles (user_id, credits)
select id, credits
from public.profiles
where account_type = 'donor'
on conflict (user_id) do update set credits = excluded.credits;

insert into public.ngo_profiles (
  user_id,
  cnpj,
  address,
  description,
  category,
  goal,
  instagram,
  phone
)
select
  id,
  case
    when length(regexp_replace(coalesce(ngo_profile ->> 'cnpj', ''), '[^0-9]', '', 'g')) = 14
      then regexp_replace(ngo_profile ->> 'cnpj', '[^0-9]', '', 'g')
    else null
  end,
  coalesce(ngo_profile ->> 'address', ''),
  coalesce(ngo_profile ->> 'description', ''),
  coalesce(ngo_profile ->> 'category', ''),
  coalesce(ngo_profile ->> 'goal', ''),
  nullif(ngo_profile ->> 'instagram', ''),
  case
    when length(regexp_replace(coalesce(ngo_profile ->> 'phone', ''), '[^0-9]', '', 'g')) between 10 and 11
      then regexp_replace(ngo_profile ->> 'phone', '[^0-9]', '', 'g')
    else null
  end
from public.profiles
where account_type = 'ngo'
on conflict (user_id) do nothing;

alter table public.donor_profiles enable row level security;
alter table public.ngo_profiles enable row level security;

drop policy if exists donor_profiles_select_own on public.donor_profiles;
create policy donor_profiles_select_own
on public.donor_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists ngo_profiles_select_visible on public.ngo_profiles;
create policy ngo_profiles_select_visible
on public.ngo_profiles
for select
to anon, authenticated
using (status = 'approved' or (select auth.uid()) = user_id);

drop policy if exists ngo_profiles_update_own on public.ngo_profiles;
create policy ngo_profiles_update_own
on public.ngo_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.donor_profiles from anon, authenticated;
grant select on public.donor_profiles to authenticated;

revoke all on public.ngo_profiles from anon, authenticated;
grant select on public.ngo_profiles to anon, authenticated;
grant update (cnpj, address, description, category, goal, instagram, phone)
on public.ngo_profiles
to authenticated;
