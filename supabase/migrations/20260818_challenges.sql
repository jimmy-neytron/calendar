create table if not exists public.challenges (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null, description text not null default '', activity text not null default '',
  target_days integer not null check (target_days between 1 and 1000),
  start_date date not null default current_date, color text not null default '#a78bfa',
  final_reward text not null default '', completed_dates date[] not null default '{}', active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists challenges_workspace_user_idx on public.challenges (workspace_id, user_id, active, updated_at desc);
alter table public.challenges enable row level security;
create policy challenges_select_own on public.challenges for select to authenticated using (user_id=auth.uid() and public.is_workspace_member(workspace_id));
create policy challenges_insert_own on public.challenges for insert to authenticated with check (user_id=auth.uid() and public.can_write_workspace(workspace_id));
create policy challenges_update_own on public.challenges for update to authenticated using (user_id=auth.uid() and public.is_workspace_member(workspace_id)) with check (user_id=auth.uid() and public.can_write_workspace(workspace_id));
create policy challenges_delete_own on public.challenges for delete to authenticated using (user_id=auth.uid() and public.can_write_workspace(workspace_id));
grant select, insert, update, delete on table public.challenges to authenticated;
