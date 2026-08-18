create table if not exists public.sport_workouts (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null,
  subtitle text not null default '',
  focus text[] not null default '{}',
  color text not null default '#6ee7b7',
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sport_workouts_exercises_array_check check (jsonb_typeof(exercises) = 'array')
);

create index if not exists sport_workouts_workspace_user_idx
  on public.sport_workouts (workspace_id, user_id, updated_at desc);

alter table public.sport_workouts enable row level security;

create policy sport_workouts_select_own
  on public.sport_workouts for select to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy sport_workouts_insert_own
  on public.sport_workouts for insert to authenticated
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy sport_workouts_update_own
  on public.sport_workouts for update to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy sport_workouts_delete_own
  on public.sport_workouts for delete to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
