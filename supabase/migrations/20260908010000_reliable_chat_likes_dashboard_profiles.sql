-- Atomic user actions and authoritative dashboard/public-profile projections.

create or replace function public.send_chat_message(
  target_conversation_id uuid,
  message_body text
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_profile_id uuid,
  body text,
  sent_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_message public.chat_messages;
  normalized_body text := btrim(coalesce(message_body, ''));
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using message = 'not_authenticated', errcode = 'P0001';
  end if;
  if char_length(normalized_body) not between 1 and 4000 then
    raise exception using message = 'invalid_message', errcode = 'P0001';
  end if;
  if not private.is_chat_participant(target_conversation_id, caller_id) then
    raise exception using message = 'conversation_not_found', errcode = 'P0001';
  end if;
  if (select count(*) from public.chat_participants p where p.conversation_id = target_conversation_id) <> 2 then
    raise exception using message = 'invalid_conversation', errcode = 'P0001';
  end if;

  insert into public.chat_messages (conversation_id, sender_profile_id, body)
  values (target_conversation_id, caller_id, normalized_body)
  returning * into created_message;

  return query
  select created_message.id, created_message.conversation_id,
         created_message.sender_profile_id, created_message.body,
         created_message.sent_at;
end;
$$;

revoke all on function public.send_chat_message(uuid, text) from public;
grant execute on function public.send_chat_message(uuid, text) to authenticated;

create or replace function public.set_story_like(
  target_story_id uuid,
  should_like boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using message = 'not_authenticated', errcode = 'P0001';
  end if;
  if not exists (
    select 1
    from public.stories story
    where story.id = target_story_id
      and (
        (story.status = 'published' and story.published_at <= now())
        or story.author_profile_id = caller_id
      )
  ) then
    raise exception using message = 'story_not_found', errcode = 'P0001';
  end if;

  if should_like then
    insert into public.story_likes (profile_id, story_id)
    values (caller_id, target_story_id)
    on conflict (profile_id, story_id) do nothing;
  else
    delete from public.story_likes
    where profile_id = caller_id and story_id = target_story_id;
  end if;
  return should_like;
end;
$$;

revoke all on function public.set_story_like(uuid, boolean) from public;
grant execute on function public.set_story_like(uuid, boolean) to authenticated;

create or replace function public.get_home_dashboard_stats()
returns table (
  community_amount_cents bigint,
  community_donation_count bigint,
  personal_amount_cents bigint,
  personal_donation_count bigint,
  received_amount_cents bigint,
  received_donation_count bigint,
  verified_organization_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer_organizations as (
    select member.organization_id
    from public.organization_members member
    where member.profile_id = auth.uid()
      and member.status = 'active'
    union
    select organization.id
    from public.organizations organization
    where organization.legacy_owner_profile_id = auth.uid()
  ),
  platform as (
    select coalesce(stats.donated_amount_cents, 0)::bigint as amount,
           coalesce(stats.donation_count, 0)::bigint as total
    from public.platform_impact_stats stats
    where stats.singleton = true
  ),
  personal as (
    select coalesce(sum(donation.amount_cents), 0)::bigint as amount,
           count(*)::bigint as total
    from public.donations donation
    where donation.status = 'succeeded'
      and not donation.is_test
      and (
        donation.donor_profile_id = auth.uid()
        or donation.donor_id = auth.uid()
      )
  ),
  received as (
    select coalesce(sum(donation.amount_cents), 0)::bigint as amount,
           count(*)::bigint as total
    from public.donations donation
    where donation.status = 'succeeded'
      and not donation.is_test
      and donation.organization_id in (select organization_id from viewer_organizations)
  ),
  verified as (
    select count(*)::bigint as total
    from public.organizations organization
    where organization.status = 'active'
      and exists (
        select 1 from public.organization_verifications verification
        where verification.organization_id = organization.id
          and verification.status = 'approved'
      )
  )
  select
    coalesce((select amount from platform), 0),
    coalesce((select total from platform), 0),
    (select amount from personal),
    (select total from personal),
    (select amount from received),
    (select total from received),
    (select total from verified);
$$;

revoke all on function public.get_home_dashboard_stats() from public;
grant execute on function public.get_home_dashboard_stats() to anon, authenticated;

drop function if exists public.get_public_story_authors(uuid[]);

create function public.get_public_story_authors(requested_profile_ids uuid[])
returns table (id uuid, name text, avatar_url text, bio text)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.name, profile.avatar_url, coalesce(donor.bio, '')
  from public.profiles profile
  left join public.donor_profiles donor on donor.user_id = profile.id
  where profile.id = any(coalesce(requested_profile_ids, array[]::uuid[]))
    and profile.account_type = 'donor'
    and exists (
      select 1
      from public.stories story
      where story.author_profile_id = profile.id
        and story.organization_id is null
        and story.status = 'published'
        and story.published_at <= now()
    );
$$;

revoke all on function public.get_public_story_authors(uuid[]) from public;
grant execute on function public.get_public_story_authors(uuid[]) to anon, authenticated;