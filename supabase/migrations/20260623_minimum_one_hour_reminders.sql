update public.events
set
  reminder = '1h',
  updated_at = now()
where reminder in ('5m', '15m');

delete from public.notifications
where payload ->> 'type' = 'event_reminder'
  and payload ->> 'reminder' in ('5m', '15m');

alter table public.events
  drop constraint if exists events_reminder_allowed_values;

alter table public.events
  add constraint events_reminder_allowed_values
  check (reminder in ('none', '1h', '1d'));
