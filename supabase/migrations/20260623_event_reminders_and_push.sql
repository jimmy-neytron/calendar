-- Event reminders: events.reminder -> notifications -> Realtime/Web Push.
-- Event times are currently stored without a timezone, so Europe/Moscow is used.

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.push_subscriptions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  enabled boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id)
  where enabled = true;

create unique index if not exists push_subscriptions_user_device_idx
  on public.push_subscriptions (user_id, device_id);

alter table public.push_subscriptions enable row level security;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

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

create unique index if not exists notifications_event_reminder_dedupe_idx
  on public.notifications ((payload ->> 'dedupeKey'))
  where payload ->> 'type' = 'event_reminder';

create index if not exists events_reminder_lookup_idx
  on public.events (date, reminder, repeat)
  where reminder <> 'none' and completed_at is null;

create or replace function public.enqueue_hourly_event_reminders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  inserted_count integer := 0;
begin
  with settings as (
    select
      timezone('Europe/Moscow', now())::date as local_date,
      now() as now_at
  ),
  candidate_dates as (
    select generate_series(
      (select local_date from settings),
      (select local_date + 2 from settings),
      interval '1 day'
    )::date as occurrence_date
  ),
  occurrences as (
    select
      event.*,
      candidate.occurrence_date,
      case
        when event.all_day then '09:00'
        else event.start_time
      end as occurrence_time
    from public.events as event
    cross join candidate_dates as candidate
    where event.reminder in ('1h', '1d')
      and event.completed_at is null
      and (event.all_day or event.start_time ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$')
      and candidate.occurrence_date >= event.date
      and (event.repeat_until is null or candidate.occurrence_date <= event.repeat_until)
      and (
        (coalesce(event.repeat, 'none') = 'none' and candidate.occurrence_date = event.date)
        or (event.repeat = 'daily')
        or (
          event.repeat = 'weekly'
          and (candidate.occurrence_date - event.date) % 7 = 0
        )
        or (
          event.repeat = 'biweekly'
          and (candidate.occurrence_date - event.date) % 14 = 0
        )
        or (
          event.repeat = 'workdays'
          and extract(isodow from candidate.occurrence_date) between 1 and 5
        )
        or (
          event.repeat = 'monthly'
          and extract(day from candidate.occurrence_date) = extract(day from event.date)
        )
        or (
          event.repeat = 'monthly-nth-weekday'
          and extract(dow from candidate.occurrence_date) = extract(dow from event.date)
          and (
            ceil(extract(day from candidate.occurrence_date) / 7.0)
              = ceil(extract(day from event.date) / 7.0)
            or (
              ceil(extract(day from event.date) / 7.0) = 5
              and candidate.occurrence_date + 7
                > (date_trunc('month', candidate.occurrence_date) + interval '1 month - 1 day')::date
            )
          )
        )
        or (
          event.repeat = 'monthly-last-weekday'
          and extract(dow from candidate.occurrence_date) = extract(dow from event.date)
          and candidate.occurrence_date + 7
            > (date_trunc('month', candidate.occurrence_date) + interval '1 month - 1 day')::date
        )
        or (
          event.repeat = 'yearly'
          and extract(month from candidate.occurrence_date) = extract(month from event.date)
          and extract(day from candidate.occurrence_date) = extract(day from event.date)
        )
        or (
          event.repeat = 'custom'
          and event.repeat_unit = 'day'
          and (candidate.occurrence_date - event.date) % greatest(event.repeat_interval, 1) = 0
        )
        or (
          event.repeat = 'custom'
          and event.repeat_unit = 'week'
          and extract(dow from candidate.occurrence_date)::integer = any(event.repeat_weekdays)
          and ((candidate.occurrence_date - event.date) / 7) % greatest(event.repeat_interval, 1) = 0
        )
        or (
          event.repeat = 'custom'
          and event.repeat_unit = 'month'
          and extract(day from candidate.occurrence_date) = extract(day from event.date)
          and (
            (
              extract(year from candidate.occurrence_date)::integer * 12
              + extract(month from candidate.occurrence_date)::integer
              - extract(year from event.date)::integer * 12
              - extract(month from event.date)::integer
            ) % greatest(event.repeat_interval, 1) = 0
          )
        )
      )
  ),
  timed_occurrences as (
    select
      occurrence.*,
      make_timestamptz(
        extract(year from occurrence.occurrence_date)::integer,
        extract(month from occurrence.occurrence_date)::integer,
        extract(day from occurrence.occurrence_date)::integer,
        split_part(occurrence.occurrence_time, ':', 1)::integer,
        split_part(occurrence.occurrence_time, ':', 2)::integer,
        0,
        'Europe/Moscow'
      ) as starts_at
    from occurrences as occurrence
  ),
  due_reminders as (
    select
      occurrence.*,
      occurrence.starts_at - case occurrence.reminder
        when '1h' then interval '1 hour'
        when '1d' then interval '1 day'
      end as reminder_at
    from timed_occurrences as occurrence
  ),
  recipients as (
    select
      reminder.*,
      member.user_id
    from due_reminders as reminder
    join public.workspace_members as member
      on member.workspace_id = reminder.workspace_id
     and (
       cardinality(reminder.member_ids) = 0
       or member.user_id = any(reminder.member_ids)
       or member.user_id = reminder.responsible_id
     )
    where reminder.starts_at > (select now_at from settings)
      and reminder.reminder_at < (select now_at + interval '1 hour' from settings)
  ),
  inserted as (
    insert into public.notifications (
      id,
      workspace_id,
      user_id,
      payload,
      read_at,
      created_at,
      updated_at
    )
    select
      gen_random_uuid()::text,
      reminder.workspace_id,
      reminder.user_id,
      jsonb_build_object(
        'dedupeKey', concat(
          reminder.workspace_id, ':', reminder.user_id, ':event-reminder:',
          reminder.id, ':', reminder.occurrence_date, ':', reminder.occurrence_time,
          ':', reminder.reminder
        ),
        'userId', reminder.user_id,
        'workspaceId', reminder.workspace_id,
        'eventId', reminder.id,
        'eventDate', reminder.occurrence_date,
        'eventTime', reminder.occurrence_time,
        'eventTitle', reminder.title,
        'title', 'Скоро событие',
        'message', concat(
          '«', reminder.title, '» — ',
          to_char(reminder.occurrence_date, 'DD.MM.YYYY'),
          case when reminder.all_day then '' else concat(' в ', reminder.occurrence_time) end,
          case when reminder.location <> '' then concat(' · ', reminder.location) else '' end
        ),
        'type', 'event_reminder',
        'action', 'reminder',
        'severity', case
          when reminder.importance = 'urgent' then 'danger'
          when reminder.importance = 'important' then 'warning'
          else 'info'
        end,
        'reminder', reminder.reminder,
        'reminderAt', reminder.reminder_at,
        'updateCount', 1
      ),
      null,
      now(),
      now()
    from recipients as reminder
    on conflict do nothing
    returning 1
  )
  select count(*) into inserted_count from inserted;

  delete from public.notifications
  where payload ->> 'type' = 'event_reminder'
    and created_at < now() - interval '60 days';

  return inserted_count;
end;
$function$;

revoke all on function public.enqueue_hourly_event_reminders() from public;
grant execute on function public.enqueue_hourly_event_reminders() to postgres;

do $publication$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$publication$;

do $schedule$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'enqueue-hourly-event-reminders'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'enqueue-hourly-event-reminders',
    '0 * * * *',
    $cron$select public.enqueue_hourly_event_reminders();$cron$
  );
end;
$schedule$;
