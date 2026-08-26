-- Category badges earned from confirmed donations and selected for social cards.
create table if not exists public.badge_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  category_label text not null,
  aliases text[] not null default '{}',
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_badges (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badge_catalog(id) on delete cascade,
  source_donation_id uuid references public.donations(id) on delete set null,
  earned_at timestamptz not null default now(),
  selected boolean not null default true,
  display_order smallint not null default 0 check (display_order between 0 and 20),
  primary key (profile_id, badge_id)
);

insert into public.badge_catalog (code, label, category_label, aliases, description)
values
  ('educacao', 'Selo Educação', 'Educação', array['educação','educacao'], 'Conquistado ao apoiar uma causa de educação.'),
  ('saude', 'Selo Saúde', 'Saúde', array['saúde','saude'], 'Conquistado ao apoiar uma causa de saúde.'),
  ('saude-mental', 'Selo Saúde Mental', 'Saúde Mental', array['saúde mental','saude mental'], 'Conquistado ao apoiar uma causa de saúde mental.'),
  ('social', 'Selo Social', 'Social', array['social','desenvolvimento social'], 'Conquistado ao apoiar uma causa social.'),
  ('pets', 'Selo Pets', 'Pets', array['pets','proteção animal','protecao animal'], 'Conquistado ao apoiar uma causa de proteção animal.'),
  ('ambiente', 'Selo Meio Ambiente', 'Meio Ambiente', array['meio ambiente','ambiente'], 'Conquistado ao apoiar uma causa ambiental.')
on conflict (code) do update set
  label = excluded.label,
  category_label = excluded.category_label,
  aliases = excluded.aliases,
  description = excluded.description,
  active = true;

create or replace function public.award_donation_category_badge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile_id uuid;
  target_category text;
  target_badge_id uuid;
begin
  if new.status <> 'succeeded' or (tg_op = 'UPDATE' and old.status = 'succeeded') then
    return new;
  end if;

  target_profile_id := new.donor_profile_id;
  if target_profile_id is null or new.organization_id is null then return new; end if;

  select organization.primary_category into target_category
  from public.organizations as organization
  where organization.id = new.organization_id;

  select badge.id into target_badge_id
  from public.badge_catalog as badge
  where badge.active
    and (
      lower(trim(badge.category_label)) = lower(trim(target_category))
      or lower(trim(target_category)) = any(badge.aliases)
    )
  limit 1;

  if target_badge_id is not null then
    insert into public.profile_badges (
      profile_id, badge_id, source_donation_id, earned_at, selected, display_order
    ) values (
      target_profile_id, target_badge_id, new.id, coalesce(new.paid_at, now()), true, 0
    ) on conflict (profile_id, badge_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists donations_award_category_badge on public.donations;
create trigger donations_award_category_badge
after insert or update of status on public.donations
for each row execute function public.award_donation_category_badge();

insert into public.profile_badges (profile_id, badge_id, source_donation_id, earned_at)
select donation.donor_profile_id, badge.id, donation.id, coalesce(donation.paid_at, donation.created_at)
from public.donations as donation
join public.organizations as organization on organization.id = donation.organization_id
join public.badge_catalog as badge on badge.active and (
  lower(trim(badge.category_label)) = lower(trim(organization.primary_category))
  or lower(trim(organization.primary_category)) = any(badge.aliases)
)
where donation.status = 'succeeded' and donation.donor_profile_id is not null
on conflict (profile_id, badge_id) do nothing;

alter table public.badge_catalog enable row level security;
alter table public.profile_badges enable row level security;

drop policy if exists badge_catalog_read on public.badge_catalog;
create policy badge_catalog_read on public.badge_catalog for select using (active);

drop policy if exists profile_badges_read_own on public.profile_badges;
create policy profile_badges_read_own on public.profile_badges
for select to authenticated using ((select auth.uid()) = profile_id);

drop policy if exists profile_badges_update_own on public.profile_badges;
create policy profile_badges_update_own on public.profile_badges
for update to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

grant select on public.badge_catalog to anon, authenticated;
grant select on public.profile_badges to authenticated;
grant update (selected, display_order) on public.profile_badges to authenticated;
revoke all on function public.award_donation_category_badge() from public;

comment on table public.profile_badges is
  'Category badges earned from confirmed donations. Clients may only choose visibility and display order.';
