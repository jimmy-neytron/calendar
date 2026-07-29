begin;

-- Plus becomes Pro so existing paid users keep every feature.
update public.profiles
set subscription_tier = 'pro'
where lower(subscription_tier) = 'plus';

alter table public.profiles
  drop constraint if exists profiles_subscription_tier_check;

alter table public.profiles
  alter column subscription_tier set default 'free',
  alter column workspace_limit set default 1;

alter table public.workspace_features
  alter column budget_enabled set default true;

alter table public.profiles
  add constraint profiles_subscription_tier_check
  check (subscription_tier in ('free', 'pro'));

create or replace function public.subscription_workspace_limit(plan text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(plan, 'free'))
    when 'pro' then 10
    else 1
  end;
$$;

create or replace function public.sync_profile_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.subscription_tier := lower(coalesce(new.subscription_tier, 'free'));
  if new.subscription_tier = 'plus' then
    new.subscription_tier := 'pro';
  elsif new.subscription_tier not in ('free', 'pro') then
    new.subscription_tier := 'free';
  end if;
  new.workspace_limit := public.subscription_workspace_limit(new.subscription_tier);
  return new;
end;
$$;

create or replace function public.sync_profile_subscription_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.subscription_tier := lower(coalesce(new.subscription_tier, 'free'));
  if new.subscription_tier = 'plus' then
    new.subscription_tier := 'pro';
  elsif new.subscription_tier not in ('free', 'pro') then
    new.subscription_tier := 'free';
  end if;
  new.workspace_limit := public.subscription_workspace_limit(new.subscription_tier);
  return new;
end;
$$;

update public.profiles
set
  workspace_limit = public.subscription_workspace_limit(subscription_tier),
  updated_at = now();

create or replace function public.user_has_subscription_feature(
  user_id uuid,
  feature text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case lower(coalesce($2, ''))
      when 'calendar' then true
      when 'budget' then true
      when 'birthdays' then true
      when 'ideas' then true
      when 'workspace' then profile.subscription_tier = 'pro'
      when 'analytics' then profile.subscription_tier = 'pro'
      when 'activity' then profile.subscription_tier = 'pro'
      when 'integrations' then profile.subscription_tier = 'pro'
      when 'extrasections' then profile.subscription_tier = 'pro'
      when 'timetracking' then profile.subscription_tier = 'pro'
      when 'sport' then profile.subscription_tier = 'pro'
      when 'movies' then profile.subscription_tier = 'pro'
      else false
    end
    from public.profiles as profile
    where profile.id = $1
  ), false);
$$;

grant execute on function public.subscription_workspace_limit(text) to authenticated;
grant execute on function public.user_has_subscription_feature(uuid, text) to authenticated;

commit;
