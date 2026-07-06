begin;

create table if not exists public.telegram_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  telegram_chat_id bigint not null unique,
  telegram_username text not null default '',
  telegram_first_name text not null default '',
  is_connected boolean not null default true,
  daily_digest_enabled boolean not null default true,
  include_calendar boolean not null default true,
  include_sport boolean not null default true,
  connected_at timestamptz not null default now(),
  last_digest_sent_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_connections_digest_idx
  on public.telegram_connections (daily_digest_enabled, is_connected, last_digest_sent_on);

create index if not exists telegram_link_codes_user_idx
  on public.telegram_link_codes (user_id, expires_at)
  where used_at is null;

alter table public.telegram_connections enable row level security;
alter table public.telegram_link_codes enable row level security;

revoke all on table public.telegram_connections from anon, authenticated;
revoke all on table public.telegram_link_codes from anon, authenticated;

create or replace function public.user_has_pro(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and subscription_tier = 'pro'
      and coalesce(is_active, true) = true
  );
$$;

create or replace function public.telegram_integration_payload(target_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'available', public.user_has_pro(target_user_id),
    'connected', coalesce(connection.is_connected, false),
    'telegramUsername', coalesce(connection.telegram_username, ''),
    'dailyDigestEnabled', coalesce(connection.daily_digest_enabled, false),
    'includeCalendar', coalesce(connection.include_calendar, true),
    'includeSport', coalesce(connection.include_sport, true),
    'connectedAt', connection.connected_at,
    'sendTime', '08:00',
    'timezone', 'Europe/Moscow'
  )
  from (select target_user_id as user_id) as target
  left join public.telegram_connections as connection
    on connection.user_id = target.user_id
   and connection.is_connected = true;
$$;

create or replace function public.get_my_telegram_integration()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return public.telegram_integration_payload(current_user_id);
end;
$$;

create or replace function public.create_telegram_link_code()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_code text;
  next_expires_at timestamptz := now() + interval '15 minutes';
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.user_has_pro(current_user_id) then
    raise exception 'Telegram integration is available on Pro only';
  end if;

  delete from public.telegram_link_codes
  where user_id = current_user_id
    and used_at is null;

  loop
    next_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.telegram_link_codes (code, user_id, expires_at)
      values (next_code, current_user_id, next_expires_at);
      exit;
    exception when unique_violation then
      next_code := null;
    end;
  end loop;

  return jsonb_build_object('code', next_code, 'expiresAt', next_expires_at);
end;
$$;

create or replace function public.set_telegram_digest_enabled(next_enabled boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.user_has_pro(current_user_id) then
    raise exception 'Telegram integration is available on Pro only';
  end if;

  update public.telegram_connections
  set daily_digest_enabled = coalesce(next_enabled, false),
      updated_at = now()
  where user_id = current_user_id
    and is_connected = true;

  return public.telegram_integration_payload(current_user_id);
end;
$$;

create or replace function public.disconnect_telegram()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.telegram_link_codes
  where user_id = current_user_id;

  delete from public.telegram_connections
  where user_id = current_user_id;

  return public.telegram_integration_payload(current_user_id);
end;
$$;

revoke all on function public.user_has_pro(uuid) from public, anon, authenticated;
revoke all on function public.telegram_integration_payload(uuid) from public, anon, authenticated;
revoke all on function public.get_my_telegram_integration() from public, anon, authenticated;
revoke all on function public.create_telegram_link_code() from public, anon, authenticated;
revoke all on function public.set_telegram_digest_enabled(boolean) from public, anon, authenticated;
revoke all on function public.disconnect_telegram() from public, anon, authenticated;

grant execute on function public.get_my_telegram_integration() to authenticated;
grant execute on function public.create_telegram_link_code() to authenticated;
grant execute on function public.set_telegram_digest_enabled(boolean) to authenticated;
grant execute on function public.disconnect_telegram() to authenticated;

commit;
