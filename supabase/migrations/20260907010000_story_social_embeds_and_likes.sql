-- Social story embeds and production story likes.
-- Raw embed HTML is never stored; only validated public HTTPS URLs are accepted.

create or replace function private.validate_story_social_media()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  normalized_url text := trim(coalesce(new.external_url, ''));
begin
  if new.purpose <> 'story' or new.media_type <> 'document' then
    return new;
  end if;

  if new.provider not in ('instagram', 'tiktok', 'threads', 'substack') then
    raise exception 'unsupported-story-social-provider' using errcode = '23514';
  end if;

  if new.bucket is not null or new.storage_key is not null or normalized_url !~ '^https://' then
    raise exception 'invalid-story-social-url' using errcode = '23514';
  end if;

  if (
    (new.provider = 'instagram' and normalized_url !~* '^https://(www\.)?instagram\.com/(p|reel|tv)/[A-Za-z0-9_-]+/?([?#].*)?$')
    or (new.provider = 'tiktok' and normalized_url !~* '^https://(www\.|m\.)?tiktok\.com/@[^/]+/video/[0-9]+/?([?#].*)?$')
    or (new.provider = 'threads' and normalized_url !~* '^https://(www\.)?threads\.(net|com)/@[^/]+/post/[A-Za-z0-9_-]+/?([?#].*)?$')
    or (
      new.provider = 'substack'
      and normalized_url !~* '^https://((www\.)?substack\.com/@[^/]+/(p|note)/|[A-Za-z0-9-]+\.substack\.com/p/)[A-Za-z0-9_-]+/?([?#].*)?$'
    )
  ) then
    raise exception 'invalid-story-social-url' using errcode = '23514';
  end if;

  new.external_url := normalized_url;
  return new;
end;
$$;

revoke all on function private.validate_story_social_media() from public;

drop trigger if exists media_assets_validate_story_social on public.media_assets;
create trigger media_assets_validate_story_social
before insert or update of purpose, provider, media_type, external_url, bucket, storage_key
on public.media_assets
for each row execute function private.validate_story_social_media();

create table if not exists public.story_likes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, story_id)
);

create index if not exists story_likes_story_idx
on public.story_likes (story_id, created_at desc);

alter table public.story_likes enable row level security;

revoke all on table public.story_likes from public, anon, authenticated;
grant select, insert, delete on table public.story_likes to authenticated;

drop policy if exists story_likes_own_read on public.story_likes;
create policy story_likes_own_read
on public.story_likes for select to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists story_likes_own_insert on public.story_likes;
create policy story_likes_own_insert
on public.story_likes for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1 from public.stories as story
    where story.id = story_likes.story_id
      and story.status = 'published'
      and story.published_at <= now()
  )
);

drop policy if exists story_likes_own_delete on public.story_likes;
create policy story_likes_own_delete
on public.story_likes for delete to authenticated
using (profile_id = (select auth.uid()));

create or replace function public.get_story_like_counts(requested_story_ids uuid[])
returns table (story_id uuid, like_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select liked.story_id, count(*)::bigint
  from public.story_likes as liked
  join public.stories as story on story.id = liked.story_id
  where liked.story_id = any(coalesce(requested_story_ids, array[]::uuid[]))
    and story.status = 'published'
    and story.published_at <= now()
  group by liked.story_id;
$$;

revoke all on function public.get_story_like_counts(uuid[]) from public;
grant execute on function public.get_story_like_counts(uuid[]) to anon, authenticated, service_role;

comment on table public.story_likes is
  'One production like per authenticated profile and published story.';
comment on function public.get_story_like_counts(uuid[]) is
  'Returns aggregate counts without exposing the profiles that liked each story.';
