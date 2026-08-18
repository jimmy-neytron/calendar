create table if not exists public.notes (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null,
  content text not null default '',
  section text not null default 'Без раздела',
  tags text[] not null default '{}',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_workspace_user_updated_idx
  on public.notes (workspace_id, user_id, pinned desc, updated_at desc);
create index if not exists notes_tags_idx on public.notes using gin (tags);

alter table public.notes enable row level security;

create policy notes_select_own on public.notes for select to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy notes_insert_own on public.notes for insert to authenticated
  with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy notes_update_own on public.notes for update to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy notes_delete_own on public.notes for delete to authenticated
  using (user_id = auth.uid() and public.can_write_workspace(workspace_id));

grant select, insert, update, delete on table public.notes to authenticated;
