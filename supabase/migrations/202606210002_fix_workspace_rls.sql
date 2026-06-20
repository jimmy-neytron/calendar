insert into public.profiles (id, email, name, avatar, color)
select
  user_account.id,
  coalesce(user_account.email, ''),
  coalesce(user_account.raw_user_meta_data ->> 'name', split_part(coalesce(user_account.email, ''), '@', 1)),
  upper(left(coalesce(user_account.raw_user_meta_data ->> 'name', user_account.email, '?'), 1)),
  coalesce(user_account.raw_user_meta_data ->> 'color', '#60a5fa')
from auth.users user_account
on conflict (id) do nothing;

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
    ) as members
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

revoke all on function public.get_my_workspaces() from public;
revoke all on function public.shares_workspace_with_user(uuid) from public;
grant execute on function public.get_my_workspaces() to authenticated;
grant execute on function public.shares_workspace_with_user(uuid) to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
