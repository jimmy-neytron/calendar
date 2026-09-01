begin;

create table if not exists public.meal_products (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  brand text not null default '' check (char_length(brand) <= 160),
  default_unit text not null default 'g' check (default_unit in ('g', 'ml', 'piece')),
  nutrition_per_100g jsonb not null default
    '{"calories":null,"protein":null,"fat":null,"carbs":null}'::jsonb
    check (jsonb_typeof(nutrition_per_100g) = 'object'),
  archived_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_products_workspace_name_idx
  on public.meal_products (workspace_id, name);

alter table public.meal_products enable row level security;
grant select, insert, update, delete on table public.meal_products to authenticated;

drop policy if exists meal_products_select_members on public.meal_products;
drop policy if exists meal_products_insert_members on public.meal_products;
drop policy if exists meal_products_update_members on public.meal_products;
drop policy if exists meal_products_delete_members on public.meal_products;

create policy meal_products_select_members
  on public.meal_products for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy meal_products_insert_members
  on public.meal_products for insert to authenticated
  with check (public.can_write_workspace(workspace_id) and created_by = auth.uid());
create policy meal_products_update_members
  on public.meal_products for update to authenticated
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));
create policy meal_products_delete_members
  on public.meal_products for delete to authenticated
  using (public.can_write_workspace(workspace_id));

commit;

notify pgrst, 'reload schema';
