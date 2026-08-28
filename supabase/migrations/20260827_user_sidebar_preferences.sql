create table if not exists public.user_sidebar_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade default auth.uid(),
  visible_section_ids text[] not null default '{}',
  section_order text[] not null default '{}',
  mobile_favorite_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_sidebar_preferences enable row level security;

create policy user_sidebar_preferences_select_own
  on public.user_sidebar_preferences for select to authenticated
  using (user_id = auth.uid());

create policy user_sidebar_preferences_insert_own
  on public.user_sidebar_preferences for insert to authenticated
  with check (user_id = auth.uid());

create policy user_sidebar_preferences_update_own
  on public.user_sidebar_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_sidebar_preferences_delete_own
  on public.user_sidebar_preferences for delete to authenticated
  using (user_id = auth.uid());
