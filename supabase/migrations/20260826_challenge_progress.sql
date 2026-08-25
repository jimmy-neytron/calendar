alter table public.challenges
  add column if not exists goal_type text not null default 'consistency'
    check (goal_type in ('consistency', 'total', 'best')),
  add column if not exists target_value numeric,
  add column if not exists unit text not null default 'дней',
  add column if not exists daily_values jsonb not null default '{}'::jsonb;

update public.challenges
set target_value = target_days
where target_value is null;

alter table public.challenges
  alter column target_value set not null;
