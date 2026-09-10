-- No account is granted admin access by this migration. Provisioning is a
-- separate, explicitly approved operation. Browser roles cannot edit this list.
create table if not exists private.platform_administrators (
  profile_id uuid primary key references public.profiles(id) on delete cascade
);
revoke all on private.platform_administrators from public, anon, authenticated;
alter table private.platform_administrators enable row level security;

create or replace function public.get_platform_admin_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from private.platform_administrators where profile_id = auth.uid()
  );
$$;
revoke all on function public.get_platform_admin_access() from public, anon;
grant execute on function public.get_platform_admin_access() to authenticated;

create or replace function public.admin_list_users(
  search_term text default '', account_filter text default 'all', page_number integer default 0
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.get_platform_admin_access() then
    raise exception using message = 'admin_access_denied', errcode = '42501';
  end if;
  if account_filter not in ('all', 'donor', 'ngo') or page_number < 0 then
    raise exception using message = 'invalid_admin_filter', errcode = '22023';
  end if;
  with filtered as (
    select p.id, p.name, p.email, p.account_type::text as account_type, p.created_at
    from public.profiles p
    where (account_filter = 'all' or p.account_type::text = account_filter)
      and (btrim(search_term) = '' or p.name ilike '%' || replace(replace(left(btrim(search_term), 120), '%', '\%'), '_', '\_') || '%'
        or p.email ilike '%' || replace(replace(left(btrim(search_term), 120), '%', '\%'), '_', '\_') || '%')
  ), paged as (
    select * from filtered order by created_at desc, id limit 25 offset (page_number::bigint * 25)
  ), enriched as (
    select p.*,
      (select count(*) from public.donations d where coalesce(d.donor_profile_id,d.donor_id)=p.id and d.status='succeeded' and not d.is_test) as donation_count,
      (select coalesce(sum(d.amount_cents),0) from public.donations d where coalesce(d.donor_profile_id,d.donor_id)=p.id and d.status='succeeded' and not d.is_test) as donated_cents,
      (select coalesce(sum(d.amount_cents),0) from public.donations d where d.status='succeeded' and not d.is_test and exists (
        select 1 from public.organizations o where o.id=d.organization_id and (o.legacy_owner_profile_id=p.id or exists (
          select 1 from public.organization_members m where m.organization_id=o.id and m.profile_id=p.id and m.status='active'
        ))
      )) as received_cents,
      (select count(*) from public.stories s where s.author_profile_id=p.id and s.status='published' and s.published_at<=now()) as story_count,
      (select count(*) from public.chat_participants cp where cp.profile_id=p.id) as conversation_count,
      (select count(*) from public.chat_messages cm where cm.sender_profile_id=p.id) as sent_message_count,
      (select count(*) from public.chat_messages cm where cm.sender_profile_id<>p.id and exists (
        select 1 from public.chat_participants cp where cp.profile_id=p.id and cp.conversation_id=cm.conversation_id
      )) as received_message_count
    from paged p
  )
  select jsonb_build_object('total',(select count(*) from filtered),'users',
    coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc,e.id) from enriched e),'[]'::jsonb)) into result;
  return result;
end;
$$;
revoke all on function public.admin_list_users(text,text,integer) from public, anon;
grant execute on function public.admin_list_users(text,text,integer) to authenticated;

create or replace function public.admin_user_donations(target_profile_id uuid, page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.get_platform_admin_access() then
    raise exception using message = 'admin_access_denied', errcode = '42501';
  end if;
  if target_profile_id is null or page_number < 0 then
    raise exception using message = 'invalid_admin_filter', errcode = '22023';
  end if;
  with related as (
    select d.id,d.amount_cents,d.status,d.created_at,o.name as organization_name,
      case when coalesce(d.donor_profile_id,d.donor_id)=target_profile_id then 'sent' else 'received' end as direction
    from public.donations d
    left join public.organizations o on o.id=d.organization_id
    where not d.is_test and (
      coalesce(d.donor_profile_id,d.donor_id)=target_profile_id
      or o.legacy_owner_profile_id=target_profile_id
      or exists (select 1 from public.organization_members m where m.organization_id=o.id and m.profile_id=target_profile_id and m.status='active')
    )
  ), paged as (select * from related order by created_at desc,id limit 25 offset (page_number::bigint*25))
  select jsonb_build_object('total',(select count(*) from related),'donations',
    coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id) from paged p),'[]'::jsonb)) into result;
  return result;
end;
$$;
revoke all on function public.admin_user_donations(uuid,integer) from public, anon;
grant execute on function public.admin_user_donations(uuid,integer) to authenticated;
