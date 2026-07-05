alter table public.admin_modals
add column if not exists display_mode text not null default 'always'
check (display_mode in ('always', 'once'));

create or replace function public.admin_save_modal(
  modal_id uuid,
  next_title text,
  next_content_html text,
  next_buttons jsonb,
  next_is_active boolean default false,
  next_display_mode text default 'always'
)
returns public.admin_modals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_modal public.admin_modals;
  normalized_display_mode text := case when next_display_mode = 'once' then 'once' else 'always' end;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  if next_is_active then
    update public.admin_modals
    set is_active = false,
        updated_at = now()
    where is_active = true
      and (modal_id is null or id <> modal_id);
  end if;

  if modal_id is null then
    insert into public.admin_modals (title, content_html, buttons, is_active, display_mode)
    values (
      left(coalesce(next_title, ''), 160),
      coalesce(next_content_html, ''),
      coalesce(next_buttons, '[]'::jsonb),
      coalesce(next_is_active, false),
      normalized_display_mode
    )
    returning * into saved_modal;
  else
    update public.admin_modals
    set title = left(coalesce(next_title, ''), 160),
        content_html = coalesce(next_content_html, ''),
        buttons = coalesce(next_buttons, '[]'::jsonb),
        is_active = coalesce(next_is_active, false),
        display_mode = normalized_display_mode,
        updated_at = now()
    where id = modal_id
    returning * into saved_modal;
  end if;

  return saved_modal;
end;
$$;

grant execute on function public.admin_save_modal(uuid, text, text, jsonb, boolean, text) to authenticated;
