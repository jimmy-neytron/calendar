-- Keeps all domain entities and calendar events connected in both directions.
-- Safe to run multiple times.

alter table public.events
  add column if not exists linked_entity_type text,
  add column if not exists linked_entity_id text,
  add column if not exists completed_at timestamptz;

-- Deleting a calendar event should not be blocked by domain rows that point to it.
-- The frontend will also clear local links, but the database must stay consistent too.
alter table public.ideas
  drop constraint if exists ideas_planned_event_id_fkey,
  add constraint ideas_planned_event_id_fkey
    foreign key (planned_event_id) references public.events(id) on delete set null;

alter table public.birthdays
  drop constraint if exists birthdays_event_id_fkey,
  add constraint birthdays_event_id_fkey
    foreign key (event_id) references public.events(id) on delete set null,
  drop constraint if exists birthdays_reminder_event_id_fkey,
  add constraint birthdays_reminder_event_id_fkey
    foreign key (reminder_event_id) references public.events(id) on delete set null;

alter table public.budget_payments
  drop constraint if exists budget_payments_calendar_event_id_fkey,
  add constraint budget_payments_calendar_event_id_fkey
    foreign key (calendar_event_id) references public.events(id) on delete set null;

alter table public.movie_watchlist
  drop constraint if exists movie_watchlist_planned_event_id_fkey,
  add constraint movie_watchlist_planned_event_id_fkey
    foreign key (planned_event_id) references public.events(id) on delete set null;

-- Normalize legacy empty strings to null on nullable link fields.
update public.events
set
  linked_entity_type = nullif(linked_entity_type, ''),
  linked_entity_id = nullif(linked_entity_id, ''),
  updated_at = now()
where linked_entity_type = '' or linked_entity_id = '';

update public.ideas
set planned_event_id = null, updated_at = now()
where planned_event_id = '';

update public.birthdays
set
  event_id = nullif(event_id, ''),
  reminder_event_id = nullif(reminder_event_id, ''),
  updated_at = now()
where event_id = '' or reminder_event_id = '';

update public.budget_payments
set calendar_event_id = null, updated_at = now()
where calendar_event_id = '';

update public.movie_watchlist
set planned_event_id = null, updated_at = now()
where planned_event_id = '';

-- Backfill reverse links for existing planned/synced entities.
update public.events as event
set
  linked_entity_type = 'budget-payment',
  linked_entity_id = payment.id,
  updated_at = now()
from public.budget_payments as payment
where event.id = payment.calendar_event_id
  and (
    event.linked_entity_type is distinct from 'budget-payment'
    or event.linked_entity_id is distinct from payment.id
  );

update public.events as event
set
  linked_entity_type = 'birthday',
  linked_entity_id = birthday.id,
  updated_at = now()
from public.birthdays as birthday
where event.id = birthday.event_id
  and (
    event.linked_entity_type is distinct from 'birthday'
    or event.linked_entity_id is distinct from birthday.id
  );

update public.events as event
set
  linked_entity_type = 'birthday-reminder',
  linked_entity_id = birthday.id,
  updated_at = now()
from public.birthdays as birthday
where event.id = birthday.reminder_event_id
  and (
    event.linked_entity_type is distinct from 'birthday-reminder'
    or event.linked_entity_id is distinct from birthday.id
  );

update public.events as event
set
  linked_entity_type = 'idea',
  linked_entity_id = idea.id,
  updated_at = now()
from public.ideas as idea
where event.id = idea.planned_event_id
  and (
    event.linked_entity_type is distinct from 'idea'
    or event.linked_entity_id is distinct from idea.id
  );

update public.events as event
set
  linked_entity_type = 'movie-watchlist',
  linked_entity_id = movie.id,
  updated_at = now()
from public.movie_watchlist as movie
where event.id = movie.planned_event_id
  and (
    event.linked_entity_type is distinct from 'movie-watchlist'
    or event.linked_entity_id is distinct from movie.id
  );

create index if not exists events_linked_entity_idx
  on public.events (linked_entity_type, linked_entity_id)
  where linked_entity_id is not null;

create index if not exists ideas_planned_event_idx
  on public.ideas (planned_event_id)
  where planned_event_id is not null;

create index if not exists birthdays_event_idx
  on public.birthdays (event_id)
  where event_id is not null;

create index if not exists birthdays_reminder_event_idx
  on public.birthdays (reminder_event_id)
  where reminder_event_id is not null;

create index if not exists budget_payments_event_idx
  on public.budget_payments (calendar_event_id)
  where calendar_event_id is not null;

create index if not exists movie_watchlist_planned_event_idx
  on public.movie_watchlist (planned_event_id)
  where planned_event_id is not null;
