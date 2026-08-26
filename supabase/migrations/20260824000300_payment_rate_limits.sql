create table if not exists public.payment_rate_limits (
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  scope text not null check (char_length(scope) between 1 and 80),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (key_hash, scope, window_started_at)
);

alter table public.payment_rate_limits enable row level security;
revoke all on public.payment_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.payment_rate_limits to service_role;

create or replace function public.consume_payment_rate_limit(
  p_key_hash text,
  p_scope text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or char_length(p_scope) not between 1 and 80
    or p_window_seconds not between 60 and 86400
    or p_limit not between 1 and 1000 then
    raise exception 'invalid payment rate limit input';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.payment_rate_limits (
    key_hash,
    scope,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_key_hash,
    p_scope,
    v_window_started_at,
    1,
    clock_timestamp()
  )
  on conflict (key_hash, scope, window_started_at)
  do update set
    request_count = public.payment_rate_limits.request_count + 1,
    updated_at = clock_timestamp()
  where public.payment_rate_limits.request_count < p_limit
  returning request_count into v_request_count;

  return v_request_count is not null and v_request_count <= p_limit;
end;
$$;

revoke all on function public.consume_payment_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_payment_rate_limit(text, text, integer, integer)
  to service_role;

create or replace function public.cleanup_payment_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from public.payment_rate_limits
  where window_started_at < clock_timestamp() - interval '2 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.cleanup_payment_rate_limits()
  from public, anon, authenticated;
grant execute on function public.cleanup_payment_rate_limits() to service_role;

comment on table public.payment_rate_limits is
  'Atomic abuse protection for payment creation. Keys are salted SHA-256 hashes; raw IP and e-mail values are never stored.';
