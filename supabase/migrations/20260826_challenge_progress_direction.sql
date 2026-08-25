alter table public.challenges
  add column if not exists progress_direction text not null default 'increase'
    check (progress_direction in ('increase', 'decrease')),
  add column if not exists start_value numeric not null default 0;
