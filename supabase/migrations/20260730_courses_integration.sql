begin;

create table if not exists public.course_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'invalid', 'error', 'disconnected')),
  last_checked_at timestamptz,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_id)
);

create table if not exists public.course_integration_credentials (
  integration_id uuid primary key references public.course_integrations(id) on delete cascade,
  token_ciphertext text not null,
  token_iv text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_study_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  integration_id uuid not null references public.course_integrations(id) on delete cascade,
  external_course_id text not null,
  external_release_id text not null,
  course_title text not null,
  course_cover_url text not null default '',
  course_accent_color text not null default '#60a5fa',
  start_date date not null,
  timezone text not null default 'Europe/Moscow',
  weekday_times jsonb not null default '[]'::jsonb,
  excluded_dates date[] not null default '{}'::date[],
  calendar_id text references public.calendar_collections(id) on delete set null,
  responsible_id uuid references public.profiles(id) on delete set null,
  member_ids uuid[] not null default '{}'::uuid[],
  reminder text not null default '1h',
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, idempotency_key)
);

create table if not exists public.course_study_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.course_study_plans(id) on delete cascade,
  external_lesson_id text not null,
  external_module_id text not null default '',
  module_title text not null default '',
  lesson_title text not null,
  lesson_position integer not null check (lesson_position > 0),
  lesson_url text not null default '',
  scheduled_date date not null,
  start_time text not null,
  end_time text not null,
  duration_minutes integer not null check (duration_minutes between 5 and 720),
  event_id text references public.events(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'skipped', 'unscheduled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, external_lesson_id)
);

create index if not exists course_integrations_workspace_idx
  on public.course_integrations(workspace_id, user_id);
create index if not exists course_study_plans_workspace_idx
  on public.course_study_plans(workspace_id, created_by, created_at desc);
create index if not exists course_study_sessions_plan_idx
  on public.course_study_sessions(plan_id, lesson_position);
create unique index if not exists events_course_lesson_unique_idx
  on public.events(linked_entity_type, linked_entity_id)
  where linked_entity_type = 'course-lesson' and linked_entity_id is not null;

alter table public.course_study_plans alter column reminder set default '1h';
update public.course_study_plans
set reminder = '1h', updated_at = now()
where reminder not in ('none', '1h', '1d');

alter table public.course_integrations enable row level security;
alter table public.course_integration_credentials enable row level security;
alter table public.course_study_plans enable row level security;
alter table public.course_study_sessions enable row level security;

revoke all on public.course_integration_credentials from anon, authenticated;
revoke all on public.course_integrations, public.course_study_plans, public.course_study_sessions from anon;
grant select on public.course_integrations, public.course_study_plans, public.course_study_sessions to authenticated;

drop policy if exists course_integrations_select_own on public.course_integrations;
create policy course_integrations_select_own
  on public.course_integrations for select to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists course_study_plans_select_members on public.course_study_plans;
create policy course_study_plans_select_members
  on public.course_study_plans for select to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists course_study_sessions_select_members on public.course_study_sessions;
create policy course_study_sessions_select_members
  on public.course_study_sessions for select to authenticated
  using (
    exists (
      select 1
      from public.course_study_plans plan
      where plan.id = plan_id
        and public.is_workspace_member(plan.workspace_id)
    )
  );

create or replace function public.create_course_study_plan(
  p_workspace_id text,
  p_integration_id uuid,
  p_course jsonb,
  p_schedule jsonb,
  p_sessions jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_existing_id uuid;
  v_session jsonb;
  v_session_id uuid;
  v_event_id text;
  v_calendar_id text := nullif(p_schedule->>'calendarId', '');
  v_responsible_id uuid := nullif(p_schedule->>'responsibleId', '')::uuid;
  v_member_ids uuid[];
  v_count integer;
  v_date date;
  v_start_time text;
  v_end_time text;
  v_duration integer;
  v_reminder text := case
    when p_schedule->>'reminder' in ('none', '1h', '1d') then p_schedule->>'reminder'
    else '1h'
  end;
begin
  if v_user_id is null or not public.can_write_workspace(p_workspace_id) then
    raise exception 'Недостаточно прав для изменения пространства' using errcode = '42501';
  end if;

  if nullif(trim(p_idempotency_key), '') is null then
    raise exception 'Не указан ключ операции' using errcode = '22023';
  end if;

  select id into v_existing_id
  from public.course_study_plans
  where created_by = v_user_id and idempotency_key = p_idempotency_key;
  if v_existing_id is not null then
    select count(*) into v_count from public.course_study_sessions where plan_id = v_existing_id;
    return jsonb_build_object('planId', v_existing_id, 'eventCount', v_count, 'reused', true);
  end if;

  if not exists (
    select 1 from public.course_integrations
    where id = p_integration_id
      and user_id = v_user_id
      and workspace_id = p_workspace_id
      and status = 'active'
  ) then
    raise exception 'Интеграция курсов не подключена' using errcode = '22023';
  end if;

  if v_calendar_id is not null and not exists (
    select 1 from public.calendar_collections
    where id = v_calendar_id and workspace_id = p_workspace_id
  ) then
    raise exception 'Календарь не найден' using errcode = '22023';
  end if;

  if jsonb_typeof(p_sessions) <> 'array' then
    raise exception 'Некорректное расписание' using errcode = '22023';
  end if;
  v_count := jsonb_array_length(p_sessions);
  if v_count < 1 or v_count > 500 then
    raise exception 'Количество занятий должно быть от 1 до 500' using errcode = '22023';
  end if;

  select coalesce(array_agg(value::uuid), '{}'::uuid[])
  into v_member_ids
  from jsonb_array_elements_text(coalesce(p_schedule->'memberIds', '[]'::jsonb));

  insert into public.course_study_plans (
    workspace_id, created_by, integration_id, external_course_id, external_release_id,
    course_title, course_cover_url, course_accent_color, start_date, timezone,
    weekday_times, excluded_dates, calendar_id, responsible_id, member_ids, reminder,
    idempotency_key
  ) values (
    p_workspace_id, v_user_id, p_integration_id,
    p_course->>'id', p_course->>'releaseId', p_course->>'title',
    coalesce(p_course->>'coverUrl', ''), coalesce(p_course->>'accentColor', '#60a5fa'),
    (p_schedule->>'startDate')::date, coalesce(nullif(p_schedule->>'timezone', ''), 'Europe/Moscow'),
    coalesce(p_schedule->'weekdayTimes', '[]'::jsonb),
    coalesce(array(select value::date from jsonb_array_elements_text(coalesce(p_schedule->'excludedDates', '[]'::jsonb))), '{}'::date[]),
    v_calendar_id, v_responsible_id, v_member_ids, v_reminder,
    p_idempotency_key
  )
  returning id into v_plan_id;

  for v_session in select value from jsonb_array_elements(p_sessions)
  loop
    v_date := (v_session->>'scheduledDate')::date;
    v_start_time := v_session->>'startTime';
    v_end_time := v_session->>'endTime';
    v_duration := (v_session->>'durationMinutes')::integer;

    if nullif(v_session->>'lessonId', '') is null
      or nullif(v_session->>'lessonTitle', '') is null
      or v_start_time !~ '^[0-2][0-9]:[0-5][0-9]$'
      or v_end_time !~ '^[0-2][0-9]:[0-5][0-9]$'
      or v_duration not between 5 and 720 then
      raise exception 'Некорректные данные занятия' using errcode = '22023';
    end if;

    insert into public.course_study_sessions (
      plan_id, external_lesson_id, external_module_id, module_title, lesson_title,
      lesson_position, lesson_url, scheduled_date, start_time, end_time, duration_minutes
    ) values (
      v_plan_id, v_session->>'lessonId', coalesce(v_session->>'moduleId', ''),
      coalesce(v_session->>'moduleTitle', ''), v_session->>'lessonTitle',
      (v_session->>'lessonPosition')::integer, coalesce(v_session->>'lessonUrl', ''),
      v_date, v_start_time, v_end_time, v_duration
    )
    returning id into v_session_id;

    v_event_id := gen_random_uuid()::text;
    insert into public.events (
      id, workspace_id, title, date, start_time, end_time, member_ids, calendar_id,
      responsible_id, category, notes, all_day, repeat, importance, reminder,
      linked_entity_type, linked_entity_id, created_by
    ) values (
      v_event_id, p_workspace_id,
      concat(p_course->>'title', ' · ', v_session->>'lessonTitle'),
      v_date, v_start_time, v_end_time, v_member_ids, v_calendar_id,
      v_responsible_id, 'education', coalesce(v_session->>'moduleTitle', ''),
      false, 'none', 'normal', v_reminder,
      'course-lesson', v_session_id::text, v_user_id
    );

    update public.course_study_sessions set event_id = v_event_id where id = v_session_id;
  end loop;

  return jsonb_build_object('planId', v_plan_id, 'eventCount', v_count, 'reused', false);
end;
$$;

revoke all on function public.create_course_study_plan(text, uuid, jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.create_course_study_plan(text, uuid, jsonb, jsonb, jsonb, text) to authenticated;

create or replace function public.sync_course_session_from_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.linked_entity_type = 'course-lesson' and new.linked_entity_id is not null then
    update public.course_study_sessions
    set scheduled_date = new.date,
        start_time = new.start_time,
        end_time = new.end_time,
        status = case when new.completed_at is null then 'scheduled' else 'completed' end,
        completed_at = new.completed_at,
        updated_at = now()
    where id::text = new.linked_entity_id;
  end if;
  return new;
end;
$$;

drop trigger if exists events_sync_course_session on public.events;
create trigger events_sync_course_session
after update of date, start_time, end_time, completed_at on public.events
for each row execute function public.sync_course_session_from_event();

create or replace function public.unschedule_course_session_from_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.linked_entity_type = 'course-lesson' and old.linked_entity_id is not null then
    update public.course_study_sessions
    set event_id = null, status = 'unscheduled', updated_at = now()
    where id::text = old.linked_entity_id;
  end if;
  return old;
end;
$$;

drop trigger if exists events_unschedule_course_session on public.events;
create trigger events_unschedule_course_session
after delete on public.events
for each row execute function public.unschedule_course_session_from_event();

commit;
