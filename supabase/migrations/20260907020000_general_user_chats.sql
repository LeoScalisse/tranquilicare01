-- Private, realtime, one-to-one chat between authenticated TranquiliCare profiles.

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind = 'direct'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_participants (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  sent_at timestamptz not null default now()
);

create index if not exists chat_participants_profile_idx
  on public.chat_participants (profile_id, conversation_id);
create index if not exists chat_messages_conversation_sent_idx
  on public.chat_messages (conversation_id, sent_at desc);
create index if not exists chat_conversations_updated_idx
  on public.chat_conversations (updated_at desc);

create or replace function private.is_chat_participant(
  target_conversation_id uuid,
  target_profile_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_profile_id is not null and exists (
    select 1
    from public.chat_participants participant
    where participant.conversation_id = target_conversation_id
      and participant.profile_id = target_profile_id
  );
$$;

revoke all on function private.is_chat_participant(uuid, uuid) from public;

create or replace function private.touch_chat_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_conversations
  set updated_at = new.sent_at
  where id = new.conversation_id;
  return new;
end;
$$;

revoke all on function private.touch_chat_conversation() from public;

drop trigger if exists chat_messages_touch_conversation on public.chat_messages;
create trigger chat_messages_touch_conversation
after insert on public.chat_messages
for each row execute function private.touch_chat_conversation();

alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

create policy chat_conversations_select_participant
on public.chat_conversations
for select
to authenticated
using (private.is_chat_participant(id));

create policy chat_participants_select_participant
on public.chat_participants
for select
to authenticated
using (private.is_chat_participant(conversation_id));

create policy chat_messages_select_participant
on public.chat_messages
for select
to authenticated
using (private.is_chat_participant(conversation_id));

create policy chat_messages_insert_own
on public.chat_messages
for insert
to authenticated
with check (
  sender_profile_id = (select auth.uid())
  and private.is_chat_participant(conversation_id)
  and (select count(*) from public.chat_participants p where p.conversation_id = chat_messages.conversation_id) = 2
);

revoke all on table public.chat_conversations from anon, authenticated;
revoke all on table public.chat_participants from anon, authenticated;
revoke all on table public.chat_messages from anon, authenticated;
grant select on table public.chat_conversations to authenticated;
grant select on table public.chat_participants to authenticated;
grant select, insert on table public.chat_messages to authenticated;

create or replace function public.start_direct_chat(other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  existing_id uuid;
  created_id uuid;
begin
  if caller_id is null then
    raise exception using message = 'not_authenticated', errcode = 'P0001';
  end if;
  if other_profile_id is null or other_profile_id = caller_id then
    raise exception using message = 'invalid_recipient', errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = other_profile_id) then
    raise exception using message = 'recipient_not_found', errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    least(caller_id::text, other_profile_id::text) || ':' || greatest(caller_id::text, other_profile_id::text),
    0
  ));

  select first_participant.conversation_id into existing_id
  from public.chat_participants first_participant
  join public.chat_participants second_participant
    on second_participant.conversation_id = first_participant.conversation_id
   and second_participant.profile_id = other_profile_id
  join public.chat_conversations conversation
    on conversation.id = first_participant.conversation_id
   and conversation.kind = 'direct'
  where first_participant.profile_id = caller_id
    and (select count(*) from public.chat_participants count_participant where count_participant.conversation_id = conversation.id) = 2
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  if (
    select count(*)
    from public.chat_conversations
    where created_by = caller_id
      and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception using message = 'chat_creation_rate_limit', errcode = 'P0001';
  end if;

  insert into public.chat_conversations (created_by)
  values (caller_id)
  returning id into created_id;

  insert into public.chat_participants (conversation_id, profile_id, last_read_at)
  values
    (created_id, caller_id, now()),
    (created_id, other_profile_id, null);

  return created_id;
end;
$$;

create or replace function public.start_organization_chat(target_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception using message = 'not_authenticated', errcode = 'P0001';
  end if;

  select coalesce(
    organization.legacy_owner_profile_id,
    (
      select member.profile_id
      from public.organization_members member
      where member.organization_id = organization.id
        and member.status = 'active'
        and member.role in ('owner', 'admin')
      order by case member.role when 'owner' then 0 else 1 end, member.created_at
      limit 1
    )
  )
  into recipient_profile_id
  from public.organizations organization
  where organization.id = target_organization_id
    and organization.status = 'active';

  if recipient_profile_id is null then
    raise exception using message = 'recipient_not_found', errcode = 'P0001';
  end if;

  return public.start_direct_chat(recipient_profile_id);
end;
$$;
create or replace function public.search_chat_users(search_term text default '')
returns table (
  profile_id uuid,
  display_name text,
  avatar_url text,
  account_type text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    coalesce(nullif(btrim(profile.name), ''), 'Pessoa TranquiliCare'),
    profile.avatar_url,
    profile.account_type::text
  from public.profiles profile
  where auth.uid() is not null
    and profile.id <> auth.uid()
    and (
      btrim(coalesce(search_term, '')) = ''
      or profile.name ilike '%' || replace(replace(btrim(search_term), '%', '\%'), '_', '\_') || '%' escape '\'
    )
  order by profile.name asc
  limit 20;
$$;

create or replace function public.list_my_chat_conversations()
returns table (
  conversation_id uuid,
  other_profile_id uuid,
  display_name text,
  avatar_url text,
  account_type text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint,
  donor_tier text,
  approved_donation_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    conversation.id,
    other_profile.id,
    coalesce(nullif(btrim(other_profile.name), ''), 'Pessoa TranquiliCare'),
    other_profile.avatar_url,
    other_profile.account_type::text,
    latest.body,
    latest.sent_at,
    coalesce(unread.total, 0),
    case
      when viewer.account_type <> 'ngo' or other_profile.account_type <> 'donor' then null
      when coalesce(donation_stats.total, 0) = 0 then 'not_donor'
      when donation_stats.total = 1 then 'new_donor'
      when donation_stats.total between 2 and 4 then 'recurring_donor'
      else 'loyal_donor'
    end,
    case
      when viewer.account_type = 'ngo' and other_profile.account_type = 'donor' then coalesce(donation_stats.total, 0)
      else null
    end
  from public.chat_participants mine
  join public.profiles viewer on viewer.id = mine.profile_id
  join public.chat_conversations conversation on conversation.id = mine.conversation_id
  join public.chat_participants theirs
    on theirs.conversation_id = conversation.id
   and theirs.profile_id <> mine.profile_id
  join public.profiles other_profile on other_profile.id = theirs.profile_id
  left join lateral (
    select message.body, message.sent_at
    from public.chat_messages message
    where message.conversation_id = conversation.id
    order by message.sent_at desc
    limit 1
  ) latest on true
  left join lateral (
    select count(*) as total
    from public.chat_messages message
    where message.conversation_id = conversation.id
      and message.sender_profile_id <> mine.profile_id
      and message.sent_at > coalesce(mine.last_read_at, mine.joined_at)
  ) unread on true
  left join lateral (
    select count(*) as total
    from public.donations donation
    join public.organization_members membership
      on membership.organization_id = donation.organization_id
     and membership.profile_id = mine.profile_id
    where donation.donor_profile_id = other_profile.id
      and donation.status = 'succeeded'
  ) donation_stats on true
  where mine.profile_id = auth.uid()
  order by coalesce(latest.sent_at, conversation.created_at) desc;
$$;

create or replace function public.mark_chat_read(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using message = 'not_authenticated', errcode = 'P0001';
  end if;

  update public.chat_participants
  set last_read_at = now()
  where conversation_id = target_conversation_id
    and profile_id = auth.uid();

  if not found then
    raise exception using message = 'conversation_not_found', errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.start_direct_chat(uuid) from public;
revoke all on function public.start_organization_chat(uuid) from public;
revoke all on function public.search_chat_users(text) from public;
revoke all on function public.list_my_chat_conversations() from public;
revoke all on function public.mark_chat_read(uuid) from public;
grant execute on function public.start_direct_chat(uuid) to authenticated;
grant execute on function public.start_organization_chat(uuid) to authenticated;
grant execute on function public.search_chat_users(text) to authenticated;
grant execute on function public.list_my_chat_conversations() to authenticated;
grant execute on function public.mark_chat_read(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'chat_messages'
     ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end
$$;