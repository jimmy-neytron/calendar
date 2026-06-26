create table if not exists public.time_projects (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text not null default '#60a5fa',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  project_id text not null references public.time_projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id),
  date date not null,
  minutes integer not null check (minutes between 5 and 1440),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists time_projects_workspace_name_idx
  on public.time_projects (workspace_id, lower(name));
create index if not exists time_projects_workspace_active_idx
  on public.time_projects (workspace_id, archived, name);
create index if not exists time_entries_workspace_date_idx
  on public.time_entries (workspace_id, date desc, created_at desc);
create index if not exists time_entries_project_date_idx
  on public.time_entries (project_id, date desc);
create index if not exists time_entries_user_date_idx
  on public.time_entries (user_id, date desc);

alter table public.time_projects enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "time_projects_select_members" on public.time_projects;
create policy "time_projects_select_members"
on public.time_projects for select
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = time_projects.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

drop policy if exists "time_projects_write_members" on public.time_projects;
create policy "time_projects_write_members"
on public.time_projects for all
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = time_projects.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = time_projects.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

drop policy if exists "time_entries_select_members" on public.time_entries;
create policy "time_entries_select_members"
on public.time_entries for select
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = time_entries.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

drop policy if exists "time_entries_write_members" on public.time_entries;
create policy "time_entries_write_members"
on public.time_entries for all
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = time_entries.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = time_entries.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);
