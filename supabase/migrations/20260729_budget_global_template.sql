create table if not exists public.budget_settings (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null unique references public.workspaces(id) on delete cascade,
  default_income numeric(14, 2) not null default 0 check (default_income >= 0),
  currency text not null default 'RUB',
  setup_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_category_templates (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  default_amount numeric(14, 2) not null default 0 check (default_amount >= 0),
  color text not null default '#60a5fa',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budget_categories
  add column if not exists actual_amount numeric(14, 2)
    check (actual_amount is null or actual_amount >= 0),
  add column if not exists template_id text
    references public.budget_category_templates(id) on delete set null;

create unique index if not exists budget_category_templates_workspace_name_idx
  on public.budget_category_templates (workspace_id, lower(name));

create index if not exists budget_categories_template_id_idx
  on public.budget_categories (template_id)
  where template_id is not null;

alter table public.budget_settings enable row level security;
alter table public.budget_category_templates enable row level security;

create policy budget_settings_select_members
  on public.budget_settings for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = budget_settings.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy budget_settings_insert_members
  on public.budget_settings for insert to authenticated
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = budget_settings.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin', 'member')
    )
  );

create policy budget_settings_update_members
  on public.budget_settings for update to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = budget_settings.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = budget_settings.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin', 'member')
    )
  );

create policy budget_settings_delete_members
  on public.budget_settings for delete to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = budget_settings.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin', 'member')
    )
  );

create policy budget_category_templates_select_members
  on public.budget_category_templates for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = budget_category_templates.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy budget_category_templates_insert_members
  on public.budget_category_templates for insert to authenticated
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = budget_category_templates.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin', 'member')
    )
  );

create policy budget_category_templates_update_members
  on public.budget_category_templates for update to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = budget_category_templates.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = budget_category_templates.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin', 'member')
    )
  );

create policy budget_category_templates_delete_members
  on public.budget_category_templates for delete to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = budget_category_templates.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role in ('owner', 'admin', 'member')
    )
  );
