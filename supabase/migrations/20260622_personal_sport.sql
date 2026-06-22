alter table public.sport_exercises
  add column if not exists user_id uuid references public.profiles(id);

insert into public.sport_exercises (
  id, workspace_id, user_id, weekday, title, sets, reps, note, "order", created_at, updated_at
)
select
  exercise.id || ':' || member.user_id::text,
  exercise.workspace_id,
  member.user_id,
  exercise.weekday,
  exercise.title,
  exercise.sets,
  exercise.reps,
  exercise.note,
  exercise."order",
  exercise.created_at,
  exercise.updated_at
from public.sport_exercises as exercise
join public.workspaces as workspace on workspace.id = exercise.workspace_id
join public.workspace_members as member on member.workspace_id = exercise.workspace_id
where exercise.user_id is null
  and member.user_id <> workspace.owner_id
on conflict (id) do nothing;

update public.sport_completions as completion
set exercise_id = completion.exercise_id || ':' || completion.user_id::text
from public.workspaces as workspace
where completion.workspace_id = workspace.id
  and completion.user_id <> workspace.owner_id
  and exists (
    select 1 from public.sport_exercises as personal_exercise
    where personal_exercise.id = completion.exercise_id || ':' || completion.user_id::text
  );

update public.sport_exercises as exercise
set user_id = workspace.owner_id
from public.workspaces as workspace
where exercise.workspace_id = workspace.id
  and exercise.user_id is null;

alter table public.sport_exercises
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

create index if not exists sport_exercises_workspace_user_idx
  on public.sport_exercises (workspace_id, user_id, weekday, "order");

do $$
declare policy_record record;
begin
  for policy_record in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'sport_exercises'
  loop
    execute format('drop policy if exists %I on public.sport_exercises', policy_record.policyname);
  end loop;
end $$;

alter table public.sport_exercises enable row level security;

create policy "sport_exercises_select_own"
on public.sport_exercises for select
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = sport_exercises.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

create policy "sport_exercises_insert_own"
on public.sport_exercises for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = sport_exercises.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

create policy "sport_exercises_update_own"
on public.sport_exercises for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "sport_exercises_delete_own"
on public.sport_exercises for delete
using (user_id = auth.uid());

do $$
declare policy_record record;
begin
  for policy_record in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'sport_completions'
  loop
    execute format('drop policy if exists %I on public.sport_completions', policy_record.policyname);
  end loop;
end $$;

alter table public.sport_completions enable row level security;

create policy "sport_completions_select_own"
on public.sport_completions for select
using (user_id = auth.uid());

create policy "sport_completions_insert_own"
on public.sport_completions for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.sport_exercises
    where sport_exercises.id = sport_completions.exercise_id
      and sport_exercises.user_id = auth.uid()
  )
);

create policy "sport_completions_update_own"
on public.sport_completions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "sport_completions_delete_own"
on public.sport_completions for delete
using (user_id = auth.uid());
