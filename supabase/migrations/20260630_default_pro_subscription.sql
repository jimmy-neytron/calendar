alter table public.profiles
  alter column subscription_tier set default 'pro',
  alter column workspace_limit set default 10;

create or replace function public.subscription_workspace_limit(plan text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(plan, 'pro'))
    when 'pro' then 10
    when 'plus' then 3
    else 1
  end;
$$;

create or replace function public.sync_profile_subscription_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.subscription_tier := lower(coalesce(new.subscription_tier, 'pro'));
  if new.subscription_tier not in ('free', 'plus', 'pro') then
    new.subscription_tier := 'pro';
  end if;
  new.workspace_limit := public.subscription_workspace_limit(new.subscription_tier);
  return new;
end;
$$;

update public.profiles
set
  subscription_tier = 'pro',
  workspace_limit = public.subscription_workspace_limit('pro')
where subscription_tier is null or subscription_tier = 'free';
