begin;

create table if not exists public.personal_parameters (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  category text not null default 'other' check (category in ('clothes', 'personal', 'other')),
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  note text not null default '' check (char_length(note) <= 2000),
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array' and jsonb_array_length(fields) <= 20),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personal_parameters enable row level security;

grant select, insert, update, delete on table public.personal_parameters to authenticated;

drop policy if exists personal_parameters_select_visible on public.personal_parameters;
create policy personal_parameters_select_visible
  on public.personal_parameters for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    and public.user_has_subscription_feature(auth.uid(), 'extrasections')
    and (owner_id = auth.uid() or visibility = 'shared')
  );

drop policy if exists personal_parameters_insert_owner on public.personal_parameters;
create policy personal_parameters_insert_owner
  on public.personal_parameters for insert to authenticated
  with check (
    public.can_write_workspace(workspace_id)
    and owner_id = auth.uid()
    and public.user_has_subscription_feature(auth.uid(), 'extrasections')
  );

drop policy if exists personal_parameters_update_owner on public.personal_parameters;
create policy personal_parameters_update_owner
  on public.personal_parameters for update to authenticated
  using (
    owner_id = auth.uid()
    and public.can_write_workspace(workspace_id)
    and public.user_has_subscription_feature(auth.uid(), 'extrasections')
  )
  with check (
    owner_id = auth.uid()
    and public.can_write_workspace(workspace_id)
    and public.user_has_subscription_feature(auth.uid(), 'extrasections')
  );

drop policy if exists personal_parameters_delete_owner on public.personal_parameters;
create policy personal_parameters_delete_owner
  on public.personal_parameters for delete to authenticated
  using (
    owner_id = auth.uid()
    and public.can_write_workspace(workspace_id)
    and public.user_has_subscription_feature(auth.uid(), 'extrasections')
  );

create index if not exists personal_parameters_workspace_owner_idx
  on public.personal_parameters (workspace_id, owner_id, favorite desc, updated_at desc);

commit;
