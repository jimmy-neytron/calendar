create table if not exists public.admin_modals (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content_html text not null default '',
  buttons jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_modals enable row level security;

create or replace function public.admin_list_modals()
returns setof public.admin_modals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  return query
  select *
  from public.admin_modals
  order by is_active desc, updated_at desc;
end;
$$;

create or replace function public.admin_save_modal(
  modal_id uuid,
  next_title text,
  next_content_html text,
  next_buttons jsonb,
  next_is_active boolean default false
)
returns public.admin_modals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_modal public.admin_modals;
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
    insert into public.admin_modals (title, content_html, buttons, is_active)
    values (
      left(coalesce(next_title, ''), 160),
      coalesce(next_content_html, ''),
      coalesce(next_buttons, '[]'::jsonb),
      coalesce(next_is_active, false)
    )
    returning * into saved_modal;
  else
    update public.admin_modals
    set title = left(coalesce(next_title, ''), 160),
        content_html = coalesce(next_content_html, ''),
        buttons = coalesce(next_buttons, '[]'::jsonb),
        is_active = coalesce(next_is_active, false),
        updated_at = now()
    where id = modal_id
    returning * into saved_modal;
  end if;

  return saved_modal;
end;
$$;

create or replace function public.admin_set_modal_active(
  modal_id uuid,
  next_is_active boolean
)
returns public.admin_modals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_modal public.admin_modals;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  if next_is_active then
    update public.admin_modals
    set is_active = false,
        updated_at = now()
    where id <> modal_id
      and is_active = true;
  end if;

  update public.admin_modals
  set is_active = coalesce(next_is_active, false),
      updated_at = now()
  where id = modal_id
  returning * into updated_modal;

  return updated_modal;
end;
$$;

create or replace function public.admin_delete_modal(modal_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;

  delete from public.admin_modals
  where id = modal_id;
end;
$$;

create or replace function public.get_active_admin_modal()
returns public.admin_modals
language sql
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.admin_modals
  where is_active = true
  order by updated_at desc
  limit 1;
$$;

grant execute on function public.admin_list_modals() to authenticated;
grant execute on function public.admin_save_modal(uuid, text, text, jsonb, boolean) to authenticated;
grant execute on function public.admin_set_modal_active(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_modal(uuid) to authenticated;
grant execute on function public.get_active_admin_modal() to anon, authenticated;
