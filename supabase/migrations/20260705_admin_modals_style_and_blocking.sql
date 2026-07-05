alter table public.admin_modals
add column if not exists modal_type text not null default 'notice'
check (modal_type in ('notice', 'warning', 'danger', 'success', 'maintenance'));

alter table public.admin_modals
add column if not exists is_blocking boolean not null default false;

drop function if exists public.admin_save_modal(uuid, text, text, jsonb, boolean);
drop function if exists public.admin_save_modal(uuid, text, text, jsonb, boolean, text);

create or replace function public.admin_save_modal(
  modal_id uuid,
  next_title text,
  next_content_html text,
  next_buttons jsonb,
  next_is_active boolean default false,
  next_display_mode text default 'always',
  next_modal_type text default 'notice',
  next_is_blocking boolean default false
)
returns public.admin_modals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_modal public.admin_modals;
  normalized_display_mode text := case when next_display_mode = 'once' then 'once' else 'always' end;
  normalized_modal_type text := case
    when next_modal_type in ('notice', 'warning', 'danger', 'success', 'maintenance') then next_modal_type
    else 'notice'
  end;
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
    insert into public.admin_modals (title, content_html, buttons, is_active, display_mode, modal_type, is_blocking)
    values (
      left(coalesce(next_title, ''), 160),
      coalesce(next_content_html, ''),
      coalesce(next_buttons, '[]'::jsonb),
      coalesce(next_is_active, false),
      normalized_display_mode,
      normalized_modal_type,
      coalesce(next_is_blocking, false)
    )
    returning * into saved_modal;
  else
    update public.admin_modals
    set title = left(coalesce(next_title, ''), 160),
        content_html = coalesce(next_content_html, ''),
        buttons = coalesce(next_buttons, '[]'::jsonb),
        is_active = coalesce(next_is_active, false),
        display_mode = normalized_display_mode,
        modal_type = normalized_modal_type,
        is_blocking = coalesce(next_is_blocking, false),
        updated_at = now()
    where id = modal_id
    returning * into saved_modal;
  end if;

  return saved_modal;
end;
$$;

grant execute on function public.admin_save_modal(uuid, text, text, jsonb, boolean, text, text, boolean) to authenticated;
