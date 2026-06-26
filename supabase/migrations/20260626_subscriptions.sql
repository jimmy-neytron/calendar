alter table public.profiles
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists workspace_limit integer not null default 1;

alter table public.profiles
  add constraint profiles_subscription_tier_check
  check (subscription_tier in ('free', 'plus', 'pro'));

create or replace function public.subscription_workspace_limit(plan text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(plan, 'free'))
    when 'pro' then 10
    when 'plus' then 3
    else 1
  end;
$$;

create or replace function public.sync_profile_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.subscription_tier := lower(coalesce(new.subscription_tier, 'free'));
  if new.subscription_tier not in ('free', 'plus', 'pro') then
    new.subscription_tier := 'free';
  end if;
  new.workspace_limit := public.subscription_workspace_limit(new.subscription_tier);
  return new;
end;
$$;

drop trigger if exists sync_profile_subscription_fields_on_profiles on public.profiles;

create trigger sync_profile_subscription_fields_on_profiles
before insert or update on public.profiles
for each row
execute function public.sync_profile_subscription_fields();

update public.profiles
set
  subscription_tier = lower(coalesce(subscription_tier, 'free')),
  workspace_limit = public.subscription_workspace_limit(subscription_tier),
  updated_at = now();

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
  v_workspace_count integer;
  v_workspace_limit integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_workspace_name is null then
    raise exception 'Workspace name is required';
  end if;

  select coalesce(profile.workspace_limit, 1)
    into v_workspace_limit
  from public.profiles as profile
  where profile.id = v_user_id;

  select count(*)
    into v_workspace_count
  from public.workspace_members as member
  where member.user_id = v_user_id;

  if v_workspace_count >= v_workspace_limit then
    raise exception 'Workspace limit reached';
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

grant execute on function public.subscription_workspace_limit(text) to authenticated;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.ensure_my_workspace(text) to authenticated;
