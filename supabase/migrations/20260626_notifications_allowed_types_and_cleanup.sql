delete from public.notifications
where coalesce(payload ->> 'type', '') not in ('event_reminder', 'event_comment')
   or coalesce(updated_at, created_at) < now() - interval '30 days';

alter table public.notifications
  drop constraint if exists notifications_allowed_payload_type;

alter table public.notifications
  add constraint notifications_allowed_payload_type
  check (payload ->> 'type' in ('event_reminder', 'event_comment'));

create or replace function public.cleanup_old_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where coalesce(updated_at, created_at) < now() - interval '30 days';

  return null;
end;
$$;

drop trigger if exists cleanup_old_notifications_after_change on public.notifications;

create trigger cleanup_old_notifications_after_change
after insert or update on public.notifications
for each statement
execute function public.cleanup_old_notifications();
