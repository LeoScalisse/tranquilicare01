-- Optional story categories and public donor curiosities. No private contact fields exposed.
begin;
alter table public.stories add column if not exists category text;
alter table public.stories add constraint stories_category_allowed check (
  category is null or category in ('educacao','saude','saude-mental','social','pets','ambiente')
);
create or replace function public.valid_profile_answers(answers jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(answers) <> 'object' then false else not exists (
    select 1 from jsonb_each(answers) entry
    where entry.key not in ('motivation','joy','talent','learning','weekend','music','connection','curiosity')
       or jsonb_typeof(entry.value) <> 'string'
       or char_length(entry.value #>> '{}') > 240
  ) end;
$$;
alter table public.donor_profiles add column if not exists profile_answers jsonb not null default '{}'::jsonb;
alter table public.donor_profiles add constraint donor_profile_answers_valid check (public.valid_profile_answers(profile_answers));
drop function public.save_own_donor_profile(text,text,text,text,text,text,text,text[]);
create or replace function public.save_own_donor_profile(
  profile_name text,
  profile_avatar_url text,
  profile_bio text,
  profile_location text,
  profile_instagram text,
  profile_phone text,
  profile_cover_image_url text,
  profile_interests text[],
  profile_answers jsonb default null
)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_phone text := nullif(regexp_replace(coalesce(profile_phone, ''), '[^0-9]', '', 'g'), '');
begin
  if current_user_id is null then
    raise exception 'authentication-required' using errcode = '42501';
  end if;

  if normalized_phone is not null and normalized_phone !~ '^[0-9]{10,11}$' then
    raise exception 'invalid-donor-phone' using errcode = '22023';
  end if;

  if profile_answers is not null and not public.valid_profile_answers(profile_answers) then
    raise exception 'invalid-profile-answers' using errcode = '22023';
  end if;

  update public.profiles as donor_identity
  set name = trim(coalesce(profile_name, '')),
      avatar_url = nullif(trim(coalesce(profile_avatar_url, '')), '')
  where donor_identity.id = current_user_id
    and donor_identity.account_type::text = 'donor';

  if not found then
    raise exception 'donor-account-not-found' using errcode = 'P0002';
  end if;

  update public.donor_profiles as donor
  set bio = trim(coalesce(profile_bio, '')),
      location = trim(coalesce(profile_location, '')),
      instagram = nullif(trim(coalesce(profile_instagram, '')), ''),
      phone = normalized_phone,
      cover_image_url = nullif(trim(coalesce(profile_cover_image_url, '')), ''),
      interests = coalesce(profile_interests, array[]::text[]),
      profile_answers = coalesce(save_own_donor_profile.profile_answers, donor.profile_answers)
  where donor.user_id = current_user_id;

  if not found then
    insert into public.donor_profiles (
      user_id,
      bio,
      location,
      instagram,
      phone,
      cover_image_url,
      interests,
      profile_answers
    ) values (
      current_user_id,
      trim(coalesce(profile_bio, '')),
      trim(coalesce(profile_location, '')),
      nullif(trim(coalesce(profile_instagram, '')), ''),
      normalized_phone,
      nullif(trim(coalesce(profile_cover_image_url, '')), ''),
      coalesce(profile_interests, array[]::text[]),
      coalesce(profile_answers, '{}'::jsonb)
    );
  end if;

  return query select current_user_id;
end;
$$;

revoke all on function public.save_own_donor_profile(
  text, text, text, text, text, text, text, text[], jsonb
) from public, anon;

grant execute on function public.save_own_donor_profile(
  text, text, text, text, text, text, text, text[], jsonb
) to authenticated;

notify pgrst, 'reload schema';

create or replace function public.get_public_donor_profile(requested_profile_id uuid)
returns table (id uuid, name text, avatar_url text, bio text, profile_answers jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.avatar_url, coalesce(d.bio, ''), coalesce(d.profile_answers, '{}'::jsonb)
  from public.profiles p
  left join public.donor_profiles d on d.user_id = p.id
  where p.id = requested_profile_id and p.account_type = 'donor';
$$;
revoke all on function public.get_public_donor_profile(uuid) from public;
grant execute on function public.get_public_donor_profile(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
