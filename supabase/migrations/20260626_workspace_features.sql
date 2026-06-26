create table if not exists public.workspace_features (
  workspace_id text primary key references public.workspaces(id) on delete cascade,
  budget_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspace_features enable row level security;

create policy "workspace_features_select_members"
on public.workspace_features for select
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = workspace_features.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

create policy "workspace_features_insert_admins"
on public.workspace_features for insert
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = workspace_features.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin')
  )
);

create policy "workspace_features_update_admins"
on public.workspace_features for update
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = workspace_features.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = workspace_features.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin')
  )
);

insert into public.workspace_features (workspace_id, budget_enabled)
select workspaces.id, true
from public.workspaces
on conflict (workspace_id) do nothing;

create or replace function public.ensure_workspace_features()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_features (workspace_id, budget_enabled)
  values (new.id, true)
  on conflict (workspace_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ensure_workspace_features_on_insert on public.workspaces;

create trigger ensure_workspace_features_on_insert
after insert on public.workspaces
for each row
execute function public.ensure_workspace_features();
