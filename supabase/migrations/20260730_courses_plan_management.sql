begin;

create or replace function public.delete_course_study_plan(p_plan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id text;
  v_created_by uuid;
  v_event_count integer := 0;
begin
  select workspace_id, created_by
  into v_workspace_id, v_created_by
  from public.course_study_plans
  where id = p_plan_id;

  if v_workspace_id is null then
    raise exception 'План курса не найден' using errcode = 'P0002';
  end if;

  if v_user_id is null
    or not public.can_write_workspace(v_workspace_id)
    or (v_created_by <> v_user_id and not public.can_admin_workspace(v_workspace_id)) then
    raise exception 'Недостаточно прав для удаления плана' using errcode = '42501';
  end if;

  delete from public.events
  where id in (
    select event_id
    from public.course_study_sessions
    where plan_id = p_plan_id and event_id is not null
  );
  get diagnostics v_event_count = row_count;

  delete from public.course_study_plans where id = p_plan_id;

  return jsonb_build_object(
    'planId', p_plan_id,
    'deletedEventCount', v_event_count
  );
end;
$$;

create or replace function public.clear_course_integration_plans(
  p_workspace_id text,
  p_integration_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_count integer := 0;
  v_plan_count integer := 0;
begin
  if v_user_id is null or not public.can_write_workspace(p_workspace_id) then
    raise exception 'Недостаточно прав для изменения пространства' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.course_integrations
    where id = p_integration_id
      and workspace_id = p_workspace_id
      and user_id = v_user_id
  ) then
    raise exception 'Интеграция Courses не найдена' using errcode = 'P0002';
  end if;

  delete from public.events
  where id in (
    select session.event_id
    from public.course_study_sessions session
    join public.course_study_plans plan on plan.id = session.plan_id
    where plan.workspace_id = p_workspace_id
      and plan.integration_id = p_integration_id
      and session.event_id is not null
  );
  get diagnostics v_event_count = row_count;

  delete from public.course_study_plans
  where workspace_id = p_workspace_id
    and integration_id = p_integration_id;
  get diagnostics v_plan_count = row_count;

  return jsonb_build_object(
    'deletedPlanCount', v_plan_count,
    'deletedEventCount', v_event_count
  );
end;
$$;

revoke all on function public.delete_course_study_plan(uuid) from public, anon;
revoke all on function public.clear_course_integration_plans(text, uuid) from public, anon;
grant execute on function public.delete_course_study_plan(uuid) to authenticated;
grant execute on function public.clear_course_integration_plans(text, uuid) to authenticated;

commit;
