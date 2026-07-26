-- Realtime donation impact without exposing donor identities.
-- The webhook updates public.donations; this trigger maintains one public,
-- aggregate-only row that every visitor can safely subscribe to.

create table if not exists public.platform_impact_stats (
  singleton boolean primary key default true check (singleton),
  donated_amount_cents bigint not null default 0 check (donated_amount_cents >= 0),
  donation_count bigint not null default 0 check (donation_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.platform_impact_stats enable row level security;

revoke all on public.platform_impact_stats from anon, authenticated;
grant select on public.platform_impact_stats to anon, authenticated;

drop policy if exists "platform_impact_stats_public_read" on public.platform_impact_stats;
create policy "platform_impact_stats_public_read"
on public.platform_impact_stats
for select
to anon, authenticated
using (true);

insert into public.platform_impact_stats (
  singleton,
  donated_amount_cents,
  donation_count,
  updated_at
)
select
  true,
  coalesce(sum(amount_cents), 0)::bigint,
  count(*)::bigint,
  now()
from public.donations
where status = 'succeeded'
on conflict (singleton) do update
set donated_amount_cents = excluded.donated_amount_cents,
    donation_count = excluded.donation_count,
    updated_at = excluded.updated_at;

create or replace function public.update_platform_impact_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  amount_delta bigint := 0;
  count_delta bigint := 0;
begin
  if tg_op = 'INSERT' then
    if new.status = 'succeeded' then
      amount_delta := new.amount_cents;
      count_delta := 1;
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'succeeded' then
      amount_delta := -old.amount_cents;
      count_delta := -1;
    end if;
  else
    if old.status = 'succeeded' then
      amount_delta := amount_delta - old.amount_cents;
      count_delta := count_delta - 1;
    end if;
    if new.status = 'succeeded' then
      amount_delta := amount_delta + new.amount_cents;
      count_delta := count_delta + 1;
    end if;
  end if;

  if amount_delta <> 0 or count_delta <> 0 then
    insert into public.platform_impact_stats (
      singleton,
      donated_amount_cents,
      donation_count,
      updated_at
    )
    values (
      true,
      greatest(amount_delta, 0),
      greatest(count_delta, 0),
      now()
    )
    on conflict (singleton) do update
    set donated_amount_cents = greatest(
          0,
          public.platform_impact_stats.donated_amount_cents + amount_delta
        ),
        donation_count = greatest(
          0,
          public.platform_impact_stats.donation_count + count_delta
        ),
        updated_at = now();
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists donations_update_platform_impact on public.donations;
create trigger donations_update_platform_impact
after insert or update or delete on public.donations
for each row execute function public.update_platform_impact_stats();

-- Postgres Changes only emits rows from tables included in this publication.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'platform_impact_stats'
  ) then
    alter publication supabase_realtime add table public.platform_impact_stats;
  end if;

  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'donations'
  ) then
    alter publication supabase_realtime add table public.donations;
  end if;
end
$$;
