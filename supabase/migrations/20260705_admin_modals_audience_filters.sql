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
  has_role_filter boolean := jsonb_array_length(coalesce(normalized_audience->'roles', '[]'::jsonb)) > 0;
  has_tier_filter boolean := jsonb_array_length(coalesce(normalized_audience->'tiers', '[]'::jsonb)) > 0;
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

  if not has_role_filter and not has_tier_filter then
    return false;
  end if;

  if has_role_filter and not exists (
    select 1
    from jsonb_array_elements_text(coalesce(normalized_audience->'roles', '[]'::jsonb)) as item(value)
    where lower(item.value) = lower(coalesce(target_profile.role, 'user'))
  ) then
    return false;
  end if;

  if has_tier_filter and not exists (
    select 1
    from jsonb_array_elements_text(coalesce(normalized_audience->'tiers', '[]'::jsonb)) as item(value)
    where lower(item.value) = lower(coalesce(target_profile.subscription_tier, 'pro'))
  ) then
    return false;
  end if;

  return true;
end;
$$;

grant execute on function public.admin_modal_matches_audience(jsonb, uuid) to anon, authenticated;
