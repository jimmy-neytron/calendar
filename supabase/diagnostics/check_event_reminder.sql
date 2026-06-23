with target as (
  select
    event.*,
    make_timestamptz(
      extract(year from event.date)::integer,
      extract(month from event.date)::integer,
      extract(day from event.date)::integer,
      split_part(event.start_time, ':', 1)::integer,
      split_part(event.start_time, ':', 2)::integer,
      0,
      'Europe/Moscow'
    ) as starts_at
  from public.events as event
  where event.id = '8b7bc8d4-191a-45e8-9e0b-7be1cd5c0abd'
)
select
  target.id,
  target.title,
  target.date,
  target.start_time,
  target.reminder,
  now() as now_at,
  timezone('Europe/Moscow', now()) as moscow_now,
  target.starts_at,
  target.starts_at - interval '1 hour' as reminder_at,
  target.starts_at > now() as event_is_still_upcoming,
  target.starts_at - interval '1 hour' < now() + interval '1 hour' as reminder_is_due,
  (
    select count(*)
    from public.workspace_members as member
    where member.workspace_id = target.workspace_id
      and (
        cardinality(target.member_ids) = 0
        or member.user_id = any(target.member_ids)
        or member.user_id = target.responsible_id
      )
  ) as recipient_count,
  exists (
    select 1
    from public.notifications as notification
    where notification.payload ->> 'type' = 'event_reminder'
      and notification.payload ->> 'eventId' = target.id
      and notification.payload ->> 'eventDate' = target.date::text
  ) as notification_already_exists
from target;
