begin;

create table if not exists public.meal_recipes (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  meal_type text not null default 'dinner'
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  servings integer not null default 1 check (servings between 1 and 100),
  image_url text not null default '' check (char_length(image_url) <= 2048),
  instructions text not null default '' check (char_length(instructions) <= 10000),
  ingredients jsonb not null default '[]'::jsonb
    check (jsonb_typeof(ingredients) = 'array'),
  nutrition_per_serving jsonb not null default
    '{"calories":null,"protein":null,"fat":null,"carbs":null}'::jsonb
    check (jsonb_typeof(nutrition_per_serving) = 'object'),
  archived_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meal_weeks (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  plan jsonb not null default '{}'::jsonb check (jsonb_typeof(plan) = 'object'),
  calorie_target numeric(7, 1) check (calorie_target is null or calorie_target between 0 and 20000),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, week_start)
);

alter table public.meal_recipes add column if not exists archived_at timestamptz;

create index if not exists meal_recipes_workspace_type_title_idx
  on public.meal_recipes (workspace_id, meal_type, title);
create index if not exists meal_weeks_workspace_week_idx
  on public.meal_weeks (workspace_id, week_start desc);

alter table public.meal_recipes enable row level security;
alter table public.meal_weeks enable row level security;

grant select, insert, update, delete on table public.meal_recipes to authenticated;
grant select, insert, update, delete on table public.meal_weeks to authenticated;

-- Some historical schema exports referenced this helper without defining it.
-- Keeping it here makes the module migration self-contained on clean projects.
create or replace function public.is_workspace_member(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_workspace_member(text) from public, anon;
grant execute on function public.is_workspace_member(text) to authenticated;

drop policy if exists meal_recipes_select_members on public.meal_recipes;
drop policy if exists meal_recipes_insert_members on public.meal_recipes;
drop policy if exists meal_recipes_update_members on public.meal_recipes;
drop policy if exists meal_recipes_delete_members on public.meal_recipes;
drop policy if exists meal_weeks_select_members on public.meal_weeks;
drop policy if exists meal_weeks_insert_members on public.meal_weeks;
drop policy if exists meal_weeks_update_members on public.meal_weeks;
drop policy if exists meal_weeks_delete_members on public.meal_weeks;

create policy meal_recipes_select_members
  on public.meal_recipes for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy meal_recipes_insert_members
  on public.meal_recipes for insert to authenticated
  with check (public.can_write_workspace(workspace_id) and created_by = auth.uid());
create policy meal_recipes_update_members
  on public.meal_recipes for update to authenticated
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
create policy meal_recipes_delete_members
  on public.meal_recipes for delete to authenticated
  using (public.can_write_workspace(workspace_id));

create policy meal_weeks_select_members
  on public.meal_weeks for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy meal_weeks_insert_members
  on public.meal_weeks for insert to authenticated
  with check (public.can_write_workspace(workspace_id) and created_by = auth.uid());
create policy meal_weeks_update_members
  on public.meal_weeks for update to authenticated
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
create policy meal_weeks_delete_members
  on public.meal_weeks for delete to authenticated
  using (public.can_write_workspace(workspace_id));

commit;

notify pgrst, 'reload schema';
