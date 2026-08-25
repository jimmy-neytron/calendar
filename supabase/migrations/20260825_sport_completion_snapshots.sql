-- Preserve the performed exercise details even when a weekly program is edited or deleted.
alter table public.sport_completions
  add column if not exists exercise_title text not null default '',
  add column if not exists exercise_sets text not null default '',
  add column if not exists exercise_reps text not null default '',
  add column if not exists exercise_muscle_groups text[] not null default '{}',
  add column if not exists workout_name text not null default '',
  add column if not exists duration_minutes integer;

alter table public.sport_completions
  drop constraint if exists sport_completions_exercise_id_fkey;

alter table public.sport_completions
  alter column exercise_id drop not null;

alter table public.sport_completions
  add constraint sport_completions_exercise_id_fkey
  foreign key (exercise_id) references public.sport_exercises(id) on delete set null;

update public.sport_completions as completion
set
  exercise_title = exercise.title,
  exercise_sets = exercise.sets,
  exercise_reps = exercise.reps,
  exercise_muscle_groups = exercise.muscle_groups,
  workout_name = exercise.workout_name,
  duration_minutes = exercise.duration_minutes
from public.sport_exercises as exercise
where completion.exercise_id = exercise.id
  and completion.exercise_title = '';
