-- Private post-donation relationship workspace for organization teams.
-- Successful donations create one relationship and a 30-day recommended contact plan.

create table if not exists public.donor_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  donation_id uuid not null references public.donations(id) on delete restrict,
  donor_profile_id uuid references public.profiles(id) on delete set null,
  donor_name text not null default 'Apoiador anônimo',
  donor_email text,
  donor_avatar_url text,
  amount_cents integer not null check (amount_cents >= 50),
  donated_at timestamptz not null,
  stage text not null default 'new'
    check (stage in ('new', 'thanks', 'story', 'follow_up', 'impact', 'closed')),
  position integer not null default 0 check (position >= 0),
  last_contact_at timestamptz,
  next_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (donation_id),
  unique (id, organization_id)
);

create table if not exists public.donor_relationship_messages (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id) on delete set null,
  direction text not null
    check (direction in ('organization_to_donor', 'donor_to_organization')),
  message_kind text not null default 'text'
    check (message_kind in ('text', 'story', 'impact', 'media')),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  media_url text,
  status text not null default 'sent'
    check (status in ('draft', 'sent', 'read')),
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (relationship_id, organization_id)
    references public.donor_relationships(id, organization_id) on delete cascade
);

create table if not exists public.donor_contact_schedule (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scheduled_for date not null,
  contact_kind text not null
    check (contact_kind in ('thanks', 'story', 'update', 'impact', 'closing')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  status text not null default 'recommended'
    check (status in ('recommended', 'scheduled', 'completed', 'skipped')),
  notes text,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (relationship_id, organization_id)
    references public.donor_relationships(id, organization_id) on delete cascade,
  unique (relationship_id, scheduled_for, contact_kind)
);

create index if not exists donor_relationships_org_stage_position_idx
on public.donor_relationships (organization_id, stage, position, donated_at desc);

create index if not exists donor_relationships_donor_idx
on public.donor_relationships (donor_profile_id, donated_at desc)
where donor_profile_id is not null;

create index if not exists donor_relationship_messages_thread_idx
on public.donor_relationship_messages (relationship_id, sent_at);

create index if not exists donor_contact_schedule_org_date_idx
on public.donor_contact_schedule (organization_id, scheduled_for, status);

drop trigger if exists donor_relationships_touch_updated_at on public.donor_relationships;
create trigger donor_relationships_touch_updated_at
before update on public.donor_relationships
for each row execute function public.touch_updated_at();

drop trigger if exists donor_contact_schedule_touch_updated_at on public.donor_contact_schedule;
create trigger donor_contact_schedule_touch_updated_at
before update on public.donor_contact_schedule
for each row execute function public.touch_updated_at();

create or replace function private.is_relationship_donor(target_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.donor_relationships as relationship
    where relationship.id = target_relationship_id
      and relationship.donor_profile_id = (select auth.uid())
  );
$$;

revoke all on function private.is_relationship_donor(uuid) from public;
grant execute on function private.is_relationship_donor(uuid) to authenticated, service_role;

create or replace function private.seed_donor_contact_schedule(
  target_relationship_id uuid,
  target_organization_id uuid,
  donation_date timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.donor_contact_schedule (
    relationship_id, organization_id, scheduled_for, contact_kind, title
  )
  values
    (target_relationship_id, target_organization_id, donation_date::date, 'thanks', 'Primeiro agradecimento'),
    (target_relationship_id, target_organization_id, (donation_date + interval '3 days')::date, 'story', 'Uma história para começar'),
    (target_relationship_id, target_organization_id, (donation_date + interval '6 days')::date, 'update', 'Como estamos usando o apoio'),
    (target_relationship_id, target_organization_id, (donation_date + interval '10 days')::date, 'story', 'Bastidores da causa'),
    (target_relationship_id, target_organization_id, (donation_date + interval '13 days')::date, 'update', 'Uma pequena conquista'),
    (target_relationship_id, target_organization_id, (donation_date + interval '17 days')::date, 'impact', 'Impacto em andamento'),
    (target_relationship_id, target_organization_id, (donation_date + interval '20 days')::date, 'story', 'História da comunidade'),
    (target_relationship_id, target_organization_id, (donation_date + interval '24 days')::date, 'update', 'Próximo passo da causa'),
    (target_relationship_id, target_organization_id, (donation_date + interval '27 days')::date, 'impact', 'Resultado do mês'),
    (target_relationship_id, target_organization_id, (donation_date + interval '30 days')::date, 'closing', 'Fechamento desta história')
  on conflict (relationship_id, scheduled_for, contact_kind) do nothing;
end;
$$;

revoke all on function private.seed_donor_contact_schedule(uuid, uuid, timestamptz) from public;

create or replace function private.sync_donation_relationship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  relationship_id uuid;
  donor_record record;
  effective_donated_at timestamptz;
begin
  if new.status <> 'succeeded' or new.organization_id is null then
    return new;
  end if;

  select profile.name, profile.email, profile.avatar_url
  into donor_record
  from public.profiles as profile
  where profile.id = new.donor_profile_id;

  effective_donated_at := coalesce(new.paid_at, new.updated_at, new.created_at, now());

  insert into public.donor_relationships (
    organization_id,
    donation_id,
    donor_profile_id,
    donor_name,
    donor_email,
    donor_avatar_url,
    amount_cents,
    donated_at,
    next_contact_at
  )
  values (
    new.organization_id,
    new.id,
    new.donor_profile_id,
    coalesce(nullif(trim(donor_record.name), ''), 'Apoiador anônimo'),
    donor_record.email,
    donor_record.avatar_url,
    new.amount_cents,
    effective_donated_at,
    effective_donated_at
  )
  on conflict (donation_id) do update set
    donor_profile_id = excluded.donor_profile_id,
    donor_name = excluded.donor_name,
    donor_email = excluded.donor_email,
    donor_avatar_url = excluded.donor_avatar_url,
    amount_cents = excluded.amount_cents,
    donated_at = excluded.donated_at
  returning id into relationship_id;

  perform private.seed_donor_contact_schedule(
    relationship_id,
    new.organization_id,
    effective_donated_at
  );

  return new;
end;
$$;

revoke all on function private.sync_donation_relationship() from public;

drop trigger if exists donations_sync_relationship on public.donations;
create trigger donations_sync_relationship
after insert or update of status, organization_id, donor_profile_id, amount_cents, paid_at
on public.donations
for each row execute function private.sync_donation_relationship();

insert into public.donor_relationships (
  organization_id,
  donation_id,
  donor_profile_id,
  donor_name,
  donor_email,
  donor_avatar_url,
  amount_cents,
  donated_at,
  next_contact_at
)
select
  donation.organization_id,
  donation.id,
  donation.donor_profile_id,
  coalesce(nullif(trim(profile.name), ''), 'Apoiador anônimo'),
  profile.email,
  profile.avatar_url,
  donation.amount_cents,
  coalesce(donation.paid_at, donation.updated_at, donation.created_at),
  coalesce(donation.paid_at, donation.updated_at, donation.created_at)
from public.donations as donation
left join public.profiles as profile on profile.id = donation.donor_profile_id
where donation.status = 'succeeded'
  and donation.organization_id is not null
on conflict (donation_id) do nothing;

do $$
declare
  relationship record;
begin
  for relationship in
    select id, organization_id, donated_at from public.donor_relationships
  loop
    perform private.seed_donor_contact_schedule(
      relationship.id,
      relationship.organization_id,
      relationship.donated_at
    );
  end loop;
end
$$;

alter table public.donor_relationships enable row level security;
alter table public.donor_relationship_messages enable row level security;
alter table public.donor_contact_schedule enable row level security;

drop policy if exists donor_relationships_org_read on public.donor_relationships;
create policy donor_relationships_org_read
on public.donor_relationships for select
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists donor_relationships_org_insert on public.donor_relationships;
create policy donor_relationships_org_insert
on public.donor_relationships for insert
to authenticated
with check (
  private.has_organization_role(organization_id, array['owner', 'admin'])
  and exists (
    select 1 from public.donations as donation
    where donation.id = donor_relationships.donation_id
      and donation.organization_id = donor_relationships.organization_id
      and donation.status = 'succeeded'
  )
);

drop policy if exists donor_relationships_org_update on public.donor_relationships;
create policy donor_relationships_org_update
on public.donor_relationships for update
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']))
with check (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists donor_relationships_org_delete on public.donor_relationships;
create policy donor_relationships_org_delete
on public.donor_relationships for delete
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin']));

drop policy if exists donor_relationship_messages_read on public.donor_relationship_messages;
create policy donor_relationship_messages_read
on public.donor_relationship_messages for select
to authenticated
using (
  private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
  or private.is_relationship_donor(relationship_id)
);

drop policy if exists donor_relationship_messages_insert on public.donor_relationship_messages;
create policy donor_relationship_messages_insert
on public.donor_relationship_messages for insert
to authenticated
with check (
  (
    direction = 'organization_to_donor'
    and sender_profile_id = (select auth.uid())
    and private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
  )
  or (
    direction = 'donor_to_organization'
    and sender_profile_id = (select auth.uid())
    and private.is_relationship_donor(relationship_id)
  )
);

drop policy if exists donor_relationship_messages_update on public.donor_relationship_messages;
create policy donor_relationship_messages_update
on public.donor_relationship_messages for update
to authenticated
using (
  private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
  or private.is_relationship_donor(relationship_id)
)
with check (
  private.has_organization_role(organization_id, array['owner', 'admin', 'editor'])
  or private.is_relationship_donor(relationship_id)
);

drop policy if exists donor_contact_schedule_org_read on public.donor_contact_schedule;
create policy donor_contact_schedule_org_read
on public.donor_contact_schedule for select
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists donor_contact_schedule_org_insert on public.donor_contact_schedule;
create policy donor_contact_schedule_org_insert
on public.donor_contact_schedule for insert
to authenticated
with check (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists donor_contact_schedule_org_update on public.donor_contact_schedule;
create policy donor_contact_schedule_org_update
on public.donor_contact_schedule for update
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']))
with check (private.has_organization_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists donor_contact_schedule_org_delete on public.donor_contact_schedule;
create policy donor_contact_schedule_org_delete
on public.donor_contact_schedule for delete
to authenticated
using (private.has_organization_role(organization_id, array['owner', 'admin']));

revoke all on public.donor_relationships from anon;
revoke all on public.donor_relationship_messages from anon;
revoke all on public.donor_contact_schedule from anon;

grant select, insert, update, delete on public.donor_relationships to authenticated;
grant select, insert, update, delete on public.donor_relationship_messages to authenticated;
grant select, insert, update, delete on public.donor_contact_schedule to authenticated;
