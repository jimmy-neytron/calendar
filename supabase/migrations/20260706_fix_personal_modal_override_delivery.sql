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

grant execute on function public.get_active_admin_modal() to anon, authenticated;
