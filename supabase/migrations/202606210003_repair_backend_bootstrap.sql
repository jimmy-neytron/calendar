-- Repair accounts/workspaces created while the first RLS version was active.
insert into public.profiles (id, email, name, avatar, color)
select
  account.id,
  coalesce(account.email, ''),
  coalesce(account.raw_user_meta_data ->> 'name', split_part(coalesce(account.email, ''), '@', 1)),
  upper(left(coalesce(account.raw_user_meta_data ->> 'name', account.email, '?'), 1)),
  coalesce(account.raw_user_meta_data ->> 'color', '#60a5fa')
from auth.users account
on conflict (id) do update set
  email = excluded.email,
  name = case when public.profiles.name = '' then excluded.name else public.profiles.name end,
  avatar = case when public.profiles.avatar = '' then excluded.avatar else public.profiles.avatar end;

insert into public.workspace_members (workspace_id, user_id, role)
select workspace.id, workspace.owner_id, 'owner'
from public.workspaces workspace
on conflict (workspace_id, user_id) do update set role = 'owner';

create or replace function public.is_workspace_member(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (
      select 1
      from public.workspace_members
      where workspace_id = target_workspace_id
        and user_id = auth.uid()
    )
    or exists (
      select 1
      from public.workspaces
      where id = target_workspace_id
        and owner_id = auth.uid()
    )
  );
$$;

create or replace function public.shares_workspace_with_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.workspace_members mine
      join public.workspace_members target
        on target.workspace_id = mine.workspace_id
      where mine.user_id = auth.uid()
        and target.user_id = target_user_id
    );
$$;

drop policy if exists "profiles_select_workspace_members" on public.profiles;
create policy "profiles_select_workspace_members"
on public.profiles for select to authenticated
using (public.shares_workspace_with_user(id));

create or replace function public.get_my_workspaces()
returns table (
  id text,
  name text,
  owner_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  members jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    workspace.id,
    workspace.name,
    workspace.owner_id,
    workspace.created_at,
    workspace.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id', member.user_id,
          'role', member.role,
          'joined_at', member.joined_at,
          'profile', jsonb_build_object(
            'id', profile.id,
            'email', profile.email,
            'name', profile.name,
            'avatar', profile.avatar,
            'color', profile.color
          )
        )
        order by member.joined_at
      ) filter (where member.user_id is not null),
      '[]'::jsonb
    )
  from public.workspaces workspace
  join public.workspace_members mine
    on mine.workspace_id = workspace.id
   and mine.user_id = auth.uid()
  left join public.workspace_members member
    on member.workspace_id = workspace.id
  left join public.profiles profile
    on profile.id = member.user_id
  group by workspace.id
  order by workspace.created_at;
$$;

create or replace function public.ensure_my_workspace(default_name text default 'Моё пространство')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_workspace_id text;
  account auth.users;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into account from auth.users where id = current_user_id;

  insert into public.profiles (id, email, name, avatar, color)
  values (
    current_user_id,
    coalesce(account.email, ''),
    coalesce(account.raw_user_meta_data ->> 'name', split_part(coalesce(account.email, ''), '@', 1)),
    upper(left(coalesce(account.raw_user_meta_data ->> 'name', account.email, '?'), 1)),
    coalesce(account.raw_user_meta_data ->> 'color', '#60a5fa')
  )
  on conflict (id) do nothing;

  select member.workspace_id into target_workspace_id
  from public.workspace_members member
  where member.user_id = current_user_id
  order by member.joined_at
  limit 1;

  if target_workspace_id is null then
    select workspace.id into target_workspace_id
    from public.workspaces workspace
    where workspace.owner_id = current_user_id
    order by workspace.created_at
    limit 1;
  end if;

  if target_workspace_id is null then
    insert into public.workspaces (name, owner_id)
    values (coalesce(nullif(trim(default_name), ''), 'Моё пространство'), current_user_id)
    returning id into target_workspace_id;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (target_workspace_id, current_user_id, 'owner')
  on conflict (workspace_id, user_id) do update
    set role = case
      when public.workspace_members.role = 'owner' then 'owner'
      else public.workspace_members.role
    end;

  if not exists (
    select 1
    from public.calendar_collections collection
    where collection.workspace_id = target_workspace_id
  ) then
    insert into public.calendar_collections (workspace_id, name, color, visible)
    values
      (target_workspace_id, 'Основной', '#60a5fa', true),
      (target_workspace_id, 'Личное', '#f472b6', true);
  end if;

  return target_workspace_id;
end;
$$;

create or replace function public.create_workspace(workspace_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  workspace_id text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if nullif(trim(workspace_name), '') is null then
    raise exception 'Workspace name is required';
  end if;

  perform public.ensure_my_workspace('Моё пространство');

  insert into public.workspaces (name, owner_id)
  values (trim(workspace_name), current_user_id)
  returning id into workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, current_user_id, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';

  insert into public.calendar_collections (workspace_id, name, color, visible)
  values
    (workspace_id, 'Основной', '#60a5fa', true),
    (workspace_id, 'Личное', '#f472b6', true);

  return workspace_id;
end;
$$;

create or replace function public.get_backend_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'authenticated', auth.uid() is not null,
    'user_id', auth.uid(),
    'profile_exists', exists (
      select 1 from public.profiles where id = auth.uid()
    ),
    'workspace_count', (
      select count(*)
      from public.workspace_members
      where user_id = auth.uid()
    )
  );
$$;

revoke all on function public.ensure_my_workspace(text) from public;
revoke all on function public.create_workspace(text) from public;
revoke all on function public.get_backend_status() from public;
revoke all on function public.get_my_workspaces() from public;
revoke all on function public.shares_workspace_with_user(uuid) from public;
grant execute on function public.ensure_my_workspace(text) to authenticated;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.get_backend_status() to authenticated;
grant execute on function public.get_my_workspaces() to authenticated;
grant execute on function public.shares_workspace_with_user(uuid) to authenticated;
grant execute on function public.is_workspace_member(text) to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
