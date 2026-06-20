create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default '',
  avatar text not null default '',
  color text not null default '#60a5fa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(trim(name)) > 0),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  code text not null unique,
  invited_email text not null default '',
  created_by uuid not null references public.profiles(id) on delete cascade,
  accepted_by uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table if not exists public.calendar_collections (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#60a5fa',
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  title text not null,
  date date not null,
  start_time text not null default '',
  end_time text not null default '',
  member_ids uuid[] not null default '{}',
  calendar_id text references public.calendar_collections(id) on delete set null,
  responsible_id uuid references public.profiles(id) on delete set null,
  attendee_responses jsonb not null default '{}'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  category text not null default 'other',
  location text not null default '',
  notes text not null default '',
  all_day boolean not null default false,
  repeat text not null default 'none',
  repeat_until date,
  repeat_end_type text not null default 'never',
  repeat_count integer not null default 0,
  repeat_interval integer not null default 1,
  repeat_unit text not null default 'week',
  repeat_weekdays integer[] not null default '{}',
  importance text not null default 'normal',
  reminder text not null default 'none',
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ideas (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null default auth.uid(),
  title text not null,
  type text not null default 'other',
  note text not null default '',
  planned_event_id text references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.birthdays (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null,
  birth_date date not null,
  reminder_days integer not null default 0,
  note text not null default '',
  gift_ideas jsonb not null default '[]'::jsonb,
  event_id text references public.events(id) on delete set null,
  reminder_event_id text references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sport_exercises (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  title text not null,
  sets text not null default '',
  reps text not null default '',
  note text not null default '',
  "order" bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sport_completions (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  exercise_id text not null references public.sport_exercises(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  date date not null,
  completed_at timestamptz not null default now(),
  unique (exercise_id, user_id, date)
);

create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_entries (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  action text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspace_members_user_idx on public.workspace_members(user_id);
create index if not exists events_workspace_date_idx on public.events(workspace_id, date);
create index if not exists ideas_workspace_idx on public.ideas(workspace_id);
create index if not exists birthdays_workspace_idx on public.birthdays(workspace_id);
create index if not exists sport_exercises_workspace_idx on public.sport_exercises(workspace_id);
create index if not exists sport_completions_workspace_date_idx on public.sport_completions(workspace_id, date);
create index if not exists notifications_user_workspace_idx on public.notifications(user_id, workspace_id, updated_at desc);
create index if not exists activity_workspace_idx on public.activity_entries(workspace_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, avatar, color)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data ->> 'name', new.email, '?'), 1)),
    coalesce(new.raw_user_meta_data ->> 'color', '#60a5fa')
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.add_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute procedure public.add_workspace_owner();

create or replace function public.is_workspace_member(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_workspace(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.accept_workspace_invite(invite_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_invite public.workspace_invites;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into target_invite
  from public.workspace_invites
  where upper(code) = upper(trim(invite_code))
    and status = 'active'
  for update;

  if target_invite.id is null then
    raise exception 'Invite not found or already used';
  end if;

  select email into current_email from public.profiles where id = auth.uid();
  if target_invite.invited_email <> ''
    and lower(target_invite.invited_email) <> lower(coalesce(current_email, '')) then
    raise exception 'Invite belongs to another email';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (target_invite.workspace_id, auth.uid(), 'member')
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invites
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = target_invite.id;

  return target_invite.workspace_id;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'workspaces', 'workspace_members', 'workspace_invites',
    'calendar_collections', 'events', 'ideas', 'birthdays',
    'sport_exercises', 'sport_completions', 'notifications', 'activity_entries'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy "profiles_select_workspace_members"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);

create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "workspaces_select_members"
on public.workspaces for select to authenticated
using (public.is_workspace_member(id));

create policy "workspaces_insert_owner"
on public.workspaces for insert to authenticated
with check (owner_id = auth.uid());

create policy "workspaces_update_managers"
on public.workspaces for update to authenticated
using (public.can_manage_workspace(id))
with check (public.can_manage_workspace(id));

create policy "workspaces_delete_owner"
on public.workspaces for delete to authenticated
using (owner_id = auth.uid());

create policy "workspace_members_select_members"
on public.workspace_members for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_members_manage"
on public.workspace_members for all to authenticated
using (public.can_manage_workspace(workspace_id) or user_id = auth.uid())
with check (public.can_manage_workspace(workspace_id));

create policy "workspace_invites_select_managers"
on public.workspace_invites for select to authenticated
using (public.can_manage_workspace(workspace_id));

create policy "workspace_invites_manage"
on public.workspace_invites for all to authenticated
using (public.can_manage_workspace(workspace_id))
with check (public.can_manage_workspace(workspace_id) and created_by = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'calendar_collections', 'events', 'ideas', 'birthdays',
    'sport_exercises', 'sport_completions', 'activity_entries'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))',
      table_name || '_select_members',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_workspace_member(workspace_id))',
      table_name || '_insert_members',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))',
      table_name || '_update_members',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_workspace_member(workspace_id))',
      table_name || '_delete_members',
      table_name
    );
  end loop;
end $$;

create policy "notifications_select_own"
on public.notifications for select to authenticated
using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "notifications_insert_members"
on public.notifications for insert to authenticated
with check (public.is_workspace_member(workspace_id));

create policy "notifications_update_own"
on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "notifications_delete_own"
on public.notifications for delete to authenticated
using (user_id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'workspaces', 'calendar_collections', 'events',
    'ideas', 'birthdays', 'sport_exercises', 'notifications'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.accept_workspace_invite(text) to authenticated;
