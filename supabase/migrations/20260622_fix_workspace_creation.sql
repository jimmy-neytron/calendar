-- Fix PL/pgSQL ambiguity between workspace_id columns and local variables.

create or replace function public.create_workspace(workspace_name text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id text;
  v_workspace_name text := nullif(trim(workspace_name), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_workspace_name is null then
    raise exception 'Workspace name is required';
  end if;

  insert into public.workspaces as workspace (name, owner_id)
  values (v_workspace_name, v_user_id)
  returning workspace.id into v_workspace_id;

  insert into public.workspace_members as member (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner')
  on conflict (workspace_id, user_id) do update
    set role = excluded.role;

  return v_workspace_id;
end;
$$;

create or replace function public.ensure_my_workspace(default_name text default 'Моё пространство')
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select member.workspace_id
    into v_workspace_id
  from public.workspace_members as member
  where member.user_id = v_user_id
  order by member.joined_at asc
  limit 1;

  if v_workspace_id is null then
    v_workspace_id := public.create_workspace(default_name);
  end if;

  return v_workspace_id;
end;
$$;

grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.ensure_my_workspace(text) to authenticated;
