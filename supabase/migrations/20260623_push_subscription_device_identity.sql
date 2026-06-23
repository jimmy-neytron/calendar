alter table public.push_subscriptions
  add column if not exists device_id text;

update public.push_subscriptions
set device_id = id
where device_id is null or device_id = '';

alter table public.push_subscriptions
  alter column device_id set not null;

create unique index if not exists push_subscriptions_user_device_idx
  on public.push_subscriptions (user_id, device_id);

create or replace function public.register_push_subscription(
  p_device_id text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default ''
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.push_subscriptions (
    user_id,
    device_id,
    endpoint,
    p256dh,
    auth,
    user_agent,
    enabled,
    updated_at
  )
  values (
    auth.uid(),
    p_device_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    p_user_agent,
    true,
    now()
  )
  on conflict (user_id, device_id) do update
  set
    endpoint = excluded.endpoint,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    enabled = true,
    updated_at = now();
end;
$function$;

create or replace function public.remove_push_subscription(p_device_id text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $function$
  delete from public.push_subscriptions
  where user_id = auth.uid()
    and device_id = p_device_id;
$function$;

revoke all on function public.register_push_subscription(text, text, text, text, text) from public;
grant execute on function public.register_push_subscription(text, text, text, text, text) to authenticated;
revoke all on function public.remove_push_subscription(text) from public;
grant execute on function public.remove_push_subscription(text) to authenticated;

drop function if exists public.register_push_subscription(text, text, text, text);
