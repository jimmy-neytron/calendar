select
  to_regclass('public.profiles') is not null as profiles_ready,
  to_regclass('public.workspaces') is not null as workspaces_ready,
  to_regclass('public.workspace_members') is not null as members_ready,
  to_regclass('public.events') is not null as events_ready,
  to_regprocedure('public.get_my_workspaces()') is not null as workspace_rpc_ready,
  to_regprocedure('public.accept_workspace_invite(text)') is not null as invite_rpc_ready;

select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 'workspaces', 'workspace_members', 'workspace_invites',
    'calendar_collections', 'events', 'ideas', 'birthdays',
    'sport_exercises', 'sport_completions', 'notifications', 'activity_entries'
  )
order by tablename;

select
  tablename,
  count(*) as policy_count
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;
