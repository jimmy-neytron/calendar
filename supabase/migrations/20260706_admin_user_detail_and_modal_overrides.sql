alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists is_active boolean not null default true;

create table if not exists public.admin_user_modal_overrides (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  modal_id uuid not null references public.admin_modals(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.admin_user_modal_overrides enable row level security;

create index if not exists admin_user_modal_overrides_modal_id_idx
  on public.admin_user_modal_overrides (modal_id);

create or replace function public.admin_get_user_detail(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_profile public.profiles;
  override_modal public.admin_modals;
  owned_workspaces_count integer := 0;
  member_workspaces_count integer := 0;
  events_created_count integer := 0;
  activity_count integer := 0;
  last_activity_at timestamp with time zone;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = target_user_id;

  if target_profile.id is null then
    raise exception 'User not found';
  end if;

  select count(*)
  into owned_workspaces_count
  from public.workspaces
  where owner_id = target_user_id;

  select count(*)
  into member_workspaces_count
  from public.workspace_members
  where user_id = target_user_id;

  select count(*)
  into events_created_count
  from public.events
  where created_by = target_user_id;

  select count(*), max(created_at)
  into activity_count, last_activity_at
  from public.activity_entries
  where actor_id = target_user_id;

  select modal.*
  into override_modal
  from public.admin_user_modal_overrides as override
  join public.admin_modals as modal on modal.id = override.modal_id
  where override.user_id = target_user_id;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', target_profile.id,
      'email', target_profile.email,
      'name', target_profile.name,
      'avatar', target_profile.avatar,
      'color', target_profile.color,
      'subscription_tier', coalesce(target_profile.subscription_tier, 'free'),
      'workspace_limit', coalesce(target_profile.workspace_limit, public.subscription_workspace_limit(target_profile.subscription_tier)),
      'role', coalesce(target_profile.role, 'user'),
      'is_active', coalesce(target_profile.is_active, true),
      'created_at', target_profile.created_at,
      'updated_at', target_profile.updated_at
    ),
    'stats', jsonb_build_object(
      'ownedWorkspacesCount', coalesce(owned_workspaces_count, 0),
      'memberWorkspacesCount', coalesce(member_workspaces_count, 0),
      'eventsCreatedCount', coalesce(events_created_count, 0),
      'activityCount', coalesce(activity_count, 0),
      'lastActivityAt', last_activity_at
    ),
    'modalOverride', case
      when override_modal.id is null then null
      else jsonb_build_object(
        'id', override_modal.id,
        'title', override_modal.title,
        'is_active', override_modal.is_active
      )
    end
  );
end;
$$;

create or replace function public.admin_set_user_modal_override(
  target_user_id uuid,
  next_modal_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_override public.admin_user_modal_overrides;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'User not found';
  end if;

  if next_modal_id is null then
    delete from public.admin_user_modal_overrides
    where user_id = target_user_id;

    return jsonb_build_object('userId', target_user_id, 'modalId', null);
  end if;

  if not exists (select 1 from public.admin_modals where id = next_modal_id) then
    raise exception 'Modal not found';
  end if;

  insert into public.admin_user_modal_overrides as override (user_id, modal_id)
  values (target_user_id, next_modal_id)
  on conflict (user_id) do update
    set modal_id = excluded.modal_id,
        updated_at = now()
  returning * into saved_override;

  return jsonb_build_object(
    'userId', saved_override.user_id,
    'modalId', saved_override.modal_id,
    'updatedAt', saved_override.updated_at
  );
end;
$$;

create or replace function public.get_active_admin_modal()
returns public.admin_modals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_modal public.admin_modals;
begin
  select modal.*
  into selected_modal
  from public.admin_user_modal_overrides as override
  join public.admin_modals as modal on modal.id = override.modal_id
  where override.user_id = auth.uid()
  order by override.updated_at desc
  limit 1;

  if selected_modal.id is not null then
    selected_modal.audience := '{"mode":"all","userIds":[],"emails":[],"roles":[],"tiers":[]}'::jsonb;
    selected_modal.display_mode := 'always';
    return selected_modal;
  end if;

  select *
  into selected_modal
  from public.admin_modals
  where is_active = true
    and public.admin_modal_matches_audience(audience, auth.uid())
  order by
    case when coalesce(audience->>'mode', 'all') = 'targeted' then 0 else 1 end,
    updated_at desc
  limit 1;

  return selected_modal;
end;
$$;

grant execute on function public.admin_get_user_detail(uuid) to authenticated;
grant execute on function public.admin_set_user_modal_override(uuid, uuid) to authenticated;
grant execute on function public.get_active_admin_modal() to anon, authenticated;
