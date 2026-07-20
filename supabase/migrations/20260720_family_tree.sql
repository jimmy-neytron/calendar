-- Выполните этот файл вручную в Supabase SQL Editor.
create table if not exists public.family_trees (
  workspace_id text primary key references public.workspaces(id) on delete cascade,
  document jsonb not null default '{"version":1,"people":[],"relationships":[],"positions":{}}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_trees_document_is_object check (jsonb_typeof(document) = 'object')
);
alter table public.family_trees enable row level security;
create policy "workspace members can read family tree" on public.family_trees for select to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id=family_trees.workspace_id and wm.user_id=auth.uid()));
create policy "workspace editors can create family tree" on public.family_trees for insert to authenticated with check (exists (select 1 from public.workspace_members wm where wm.workspace_id=family_trees.workspace_id and wm.user_id=auth.uid() and wm.role in ('owner','admin','member')));
create policy "workspace editors can update family tree" on public.family_trees for update to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id=family_trees.workspace_id and wm.user_id=auth.uid() and wm.role in ('owner','admin','member'))) with check (exists (select 1 from public.workspace_members wm where wm.workspace_id=family_trees.workspace_id and wm.user_id=auth.uid() and wm.role in ('owner','admin','member')));
create or replace function public.touch_family_tree_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); new.updated_by=auth.uid(); return new; end $$;
drop trigger if exists family_trees_touch_updated_at on public.family_trees;
create trigger family_trees_touch_updated_at before update on public.family_trees for each row execute function public.touch_family_tree_updated_at();