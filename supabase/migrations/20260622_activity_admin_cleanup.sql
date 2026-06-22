create or replace function public.delete_workspace_activity(
  p_workspace_id text,
  p_entry_ids text[] default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  if not exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  ) then
    raise exception 'Недостаточно прав для очистки активности'
      using errcode = '42501';
  end if;

  delete from public.activity_entries
  where workspace_id = p_workspace_id
    and (p_entry_ids is null or id = any(p_entry_ids));

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_workspace_activity(text, text[]) from public;
grant execute on function public.delete_workspace_activity(text, text[]) to authenticated;
