-- Optional details for richer weekly training plans.
-- Existing rows remain valid and continue to repeat by weekday.
alter table public.sport_exercises
  add column if not exists muscle_groups text[] not null default '{}',
  add column if not exists exercise_type text not null default '',
  add column if not exists difficulty text not null default '',
  add column if not exists equipment text not null default '',
  add column if not exists duration_minutes integer,
  add column if not exists rest_seconds integer,
  add column if not exists tempo text not null default '',
  add column if not exists instructions text not null default '',
  add column if not exists common_mistakes text not null default '',
  add column if not exists easier_variant text not null default '',
  add column if not exists harder_variant text not null default '';

alter table public.sport_exercises
  add column if not exists workout_id text not null default '',
  add column if not exists workout_name text not null default '',
  add column if not exists workout_focus text[] not null default '{}',
  add column if not exists workout_color text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sport_exercises_duration_minutes_check'
  ) then
    alter table public.sport_exercises
      add constraint sport_exercises_duration_minutes_check
      check (duration_minutes is null or duration_minutes between 1 and 300);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sport_exercises_rest_seconds_check'
  ) then
    alter table public.sport_exercises
      add constraint sport_exercises_rest_seconds_check
      check (rest_seconds is null or rest_seconds between 0 and 3600);
  end if;
end $$;
