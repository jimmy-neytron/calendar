alter table public.admin_modals
add column if not exists display_mode text not null default 'always'
check (display_mode in ('always', 'once'));

alter table public.admin_modals
add column if not exists modal_type text not null default 'notice'
check (modal_type in ('notice', 'warning', 'danger', 'success', 'maintenance'));

alter table public.admin_modals
add column if not exists is_blocking boolean not null default false;

alter table public.admin_modals
add column if not exists audience jsonb not null default '{"mode":"all","userIds":[],"emails":[],"roles":[],"tiers":[]}'::jsonb;

create or replace function public.admin_modal_matches_audience(
  modal_audience jsonb,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_audience jsonb := coalesce(modal_audience, '{"mode":"all"}'::jsonb);
  target_profile public.profiles;
begin
  if coalesce(normalized_audience->>'mode', 'all') = 'all' then
    return true;
  end if;

  if target_user_id is null then
    return false;
  end if;

  select *
  into target_profile
  from public.profiles
  where id = target_user_id;

  if target_profile.id is null then
    return false;
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(normalized_audience->'userIds', '[]'::jsonb)) as item(value)
    where item.value = target_user_id::text
  ) then
    return true;
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(normalized_audience->'emails', '[]'::jsonb)) as item(value)
    where lower(item.value) = lower(coalesce(target_profile.email, ''))
  ) then
    return true;
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(normalized_audience->'roles', '[]'::jsonb)) as item(value)
    where item.value = coalesce(target_profile.role, 'user')
  ) then
    return true;
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(normalized_audience->'tiers', '[]'::jsonb)) as item(value)
    where item.value = coalesce(target_profile.subscription_tier, 'pro')
  ) then
    return true;
  end if;

  return false;
end;
$$;

drop function if exists public.admin_save_modal(uuid, text, text, jsonb, boolean);
drop function if exists public.admin_save_modal(uuid, text, text, jsonb, boolean, text);
drop function if exists public.admin_save_modal(uuid, text, text, jsonb, boolean, text, text, boolean);

create or replace function public.admin_save_modal(
  modal_id uuid,
  next_title text,
  next_content_html text,
  next_buttons jsonb,
  next_is_active boolean default false,
  next_display_mode text default 'always',
  next_modal_type text default 'notice',
  next_is_blocking boolean default false,
  next_audience jsonb default '{"mode":"all","userIds":[],"emails":[],"roles":[],"tiers":[]}'::jsonb
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
  normalized_audience jsonb := case
    when coalesce(next_audience->>'mode', 'all') = 'targeted' then jsonb_build_object(
      'mode', 'targeted',
      'userIds', coalesce(next_audience->'userIds', '[]'::jsonb),
      'emails', coalesce(next_audience->'emails', '[]'::jsonb),
      'roles', coalesce(next_audience->'roles', '[]'::jsonb),
      'tiers', coalesce(next_audience->'tiers', '[]'::jsonb)
    )
    else '{"mode":"all","userIds":[],"emails":[],"roles":[],"tiers":[]}'::jsonb
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
    insert into public.admin_modals (title, content_html, buttons, is_active, display_mode, modal_type, is_blocking, audience)
    values (
      left(coalesce(next_title, ''), 160),
      coalesce(next_content_html, ''),
      coalesce(next_buttons, '[]'::jsonb),
      coalesce(next_is_active, false),
      normalized_display_mode,
      normalized_modal_type,
      coalesce(next_is_blocking, false),
      normalized_audience
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
        audience = normalized_audience,
        updated_at = now()
    where id = modal_id
    returning * into saved_modal;
  end if;

  return saved_modal;
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
    and public.admin_modal_matches_audience(audience, auth.uid())
  order by
    case when coalesce(audience->>'mode', 'all') = 'targeted' then 0 else 1 end,
    updated_at desc
  limit 1;
$$;

grant execute on function public.admin_modal_matches_audience(jsonb, uuid) to anon, authenticated;
grant execute on function public.admin_save_modal(uuid, text, text, jsonb, boolean, text, text, boolean, jsonb) to authenticated;
grant execute on function public.get_active_admin_modal() to anon, authenticated;
