create table if not exists public.budget_months (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  planned_income numeric(14, 2) not null default 0 check (planned_income >= 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, month)
);

create table if not exists public.budget_categories (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  budget_month_id text not null references public.budget_months(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  planned_amount numeric(14, 2) not null default 0 check (planned_amount >= 0),
  color text not null default '#60a5fa',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_recurring_rules (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  category_name text not null default 'Обязательные платежи',
  default_amount numeric(14, 2) not null default 0 check (default_amount >= 0),
  due_day integer not null check (due_day between 1 and 31),
  reminder text not null default '1d' check (reminder in ('none', '1h', '1d')),
  calendar_enabled boolean not null default true,
  active boolean not null default true,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_payments (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  budget_month_id text not null references public.budget_months(id) on delete cascade,
  category_id text references public.budget_categories(id) on delete set null,
  recurring_rule_id text references public.budget_recurring_rules(id) on delete set null,
  title text not null check (char_length(trim(title)) > 0),
  planned_amount numeric(14, 2) not null default 0 check (planned_amount >= 0),
  actual_amount numeric(14, 2) check (actual_amount >= 0),
  due_date date not null,
  status text not null default 'planned' check (status in ('planned', 'paid', 'skipped')),
  paid_at timestamptz,
  reminder text not null default '1d' check (reminder in ('none', '1h', '1d')),
  calendar_enabled boolean not null default true,
  calendar_event_id text references public.events(id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (budget_month_id, recurring_rule_id)
);

alter table public.events
  add column if not exists linked_entity_type text,
  add column if not exists linked_entity_id text,
  add column if not exists completed_at timestamptz;

create index if not exists budget_months_workspace_month_idx
  on public.budget_months (workspace_id, month desc);
create index if not exists budget_categories_month_order_idx
  on public.budget_categories (budget_month_id, sort_order, created_at);
create index if not exists budget_rules_workspace_active_idx
  on public.budget_recurring_rules (workspace_id, active, due_day);
create index if not exists budget_payments_month_due_idx
  on public.budget_payments (budget_month_id, due_date, status);
create index if not exists budget_payments_event_idx
  on public.budget_payments (calendar_event_id)
  where calendar_event_id is not null;
create index if not exists events_linked_entity_idx
  on public.events (linked_entity_type, linked_entity_id)
  where linked_entity_id is not null;

alter table public.budget_months enable row level security;
alter table public.budget_categories enable row level security;
alter table public.budget_recurring_rules enable row level security;
alter table public.budget_payments enable row level security;

create policy "budget_months_select_members"
on public.budget_months for select
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_months.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

create policy "budget_months_write_members"
on public.budget_months for all
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_months.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_months.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

create policy "budget_categories_select_members"
on public.budget_categories for select
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_categories.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

create policy "budget_categories_write_members"
on public.budget_categories for all
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_categories.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_categories.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

create policy "budget_rules_select_members"
on public.budget_recurring_rules for select
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_recurring_rules.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

create policy "budget_rules_write_members"
on public.budget_recurring_rules for all
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_recurring_rules.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_recurring_rules.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

create policy "budget_payments_select_members"
on public.budget_payments for select
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_payments.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

create policy "budget_payments_write_members"
on public.budget_payments for all
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_payments.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = budget_payments.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);
