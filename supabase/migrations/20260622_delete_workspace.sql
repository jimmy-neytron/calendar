create or replace function public.delete_workspace(p_workspace_id text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = p_workspace_id
      and workspace.owner_id = v_user_id
  ) then
    raise exception 'Only the workspace owner can delete it';
  end if;

  delete from public.activity_entries as entry where entry.workspace_id = p_workspace_id;
  delete from public.notifications as notification where notification.workspace_id = p_workspace_id;
  delete from public.sport_completions as completion where completion.workspace_id = p_workspace_id;
  delete from public.sport_exercises as exercise where exercise.workspace_id = p_workspace_id;
  delete from public.movie_watchlist as movie where movie.workspace_id = p_workspace_id;
  delete from public.birthdays as birthday where birthday.workspace_id = p_workspace_id;
  delete from public.ideas as idea where idea.workspace_id = p_workspace_id;
  delete from public.events as event where event.workspace_id = p_workspace_id;
  delete from public.calendar_collections as calendar where calendar.workspace_id = p_workspace_id;
  delete from public.workspace_invites as invite where invite.workspace_id = p_workspace_id;
  delete from public.workspace_members as member where member.workspace_id = p_workspace_id;
  delete from public.workspaces as workspace where workspace.id = p_workspace_id;

  return true;
end;
$$;

grant execute on function public.delete_workspace(text) to authenticated;
