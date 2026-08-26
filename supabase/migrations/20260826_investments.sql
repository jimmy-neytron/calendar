create table if not exists public.investment_sources (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null,
  type text not null check (type in ('wallet', 'exchange', 'cash', 'bank', 'broker', 'other')),
  color text not null default '#7c8cf8',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investment_holdings (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  source_id text not null references public.investment_sources(id) on delete cascade,
  asset_type text not null check (asset_type in ('crypto', 'fiat')),
  asset_id text not null,
  name text not null,
  symbol text not null,
  network text not null default '',
  contract_address text not null default '',
  quantity numeric not null default 0 check (quantity >= 0),
  cost_amount numeric not null default 0 check (cost_amount >= 0),
  cost_currency text not null default 'RUB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investment_snapshots (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  captured_on date not null,
  total_rub numeric not null default 0,
  total_usd numeric not null default 0,
  positions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, captured_on)
);

create table if not exists public.investment_transactions (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  holding_id text not null,
  source_id text not null,
  asset_id text not null,
  asset_type text not null check (asset_type in ('crypto', 'fiat')),
  name text not null,
  symbol text not null,
  quantity numeric not null check (quantity > 0),
  category text not null check (category in ('purchase', 'transfer', 'fee', 'other')),
  spent_on date not null default current_date,
  note text not null default '',
  value_rub numeric not null default 0,
  value_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investment_sources_workspace_user_idx on public.investment_sources (workspace_id, user_id, updated_at desc);
create index if not exists investment_holdings_workspace_user_idx on public.investment_holdings (workspace_id, user_id, source_id);
create index if not exists investment_snapshots_workspace_user_idx on public.investment_snapshots (workspace_id, user_id, captured_on desc);
create index if not exists investment_transactions_workspace_user_idx on public.investment_transactions (workspace_id, user_id, spent_on desc);

alter table public.investment_sources enable row level security;
alter table public.investment_holdings enable row level security;
alter table public.investment_snapshots enable row level security;
alter table public.investment_transactions enable row level security;

drop policy if exists investment_sources_select_own on public.investment_sources;
drop policy if exists investment_sources_insert_own on public.investment_sources;
drop policy if exists investment_sources_update_own on public.investment_sources;
drop policy if exists investment_sources_delete_own on public.investment_sources;
create policy investment_sources_select_own on public.investment_sources for select to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy investment_sources_insert_own on public.investment_sources for insert to authenticated with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy investment_sources_update_own on public.investment_sources for update to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id)) with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy investment_sources_delete_own on public.investment_sources for delete to authenticated using (user_id = auth.uid() and public.can_write_workspace(workspace_id));

drop policy if exists investment_holdings_select_own on public.investment_holdings;
drop policy if exists investment_holdings_insert_own on public.investment_holdings;
drop policy if exists investment_holdings_update_own on public.investment_holdings;
drop policy if exists investment_holdings_delete_own on public.investment_holdings;
create policy investment_holdings_select_own on public.investment_holdings for select to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy investment_holdings_insert_own on public.investment_holdings for insert to authenticated with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy investment_holdings_update_own on public.investment_holdings for update to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id)) with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy investment_holdings_delete_own on public.investment_holdings for delete to authenticated using (user_id = auth.uid() and public.can_write_workspace(workspace_id));

drop policy if exists investment_snapshots_select_own on public.investment_snapshots;
drop policy if exists investment_snapshots_insert_own on public.investment_snapshots;
drop policy if exists investment_snapshots_update_own on public.investment_snapshots;
drop policy if exists investment_snapshots_delete_own on public.investment_snapshots;
create policy investment_snapshots_select_own on public.investment_snapshots for select to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy investment_snapshots_insert_own on public.investment_snapshots for insert to authenticated with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy investment_snapshots_update_own on public.investment_snapshots for update to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id)) with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy investment_snapshots_delete_own on public.investment_snapshots for delete to authenticated using (user_id = auth.uid() and public.can_write_workspace(workspace_id));

drop policy if exists investment_transactions_select_own on public.investment_transactions;
drop policy if exists investment_transactions_insert_own on public.investment_transactions;
drop policy if exists investment_transactions_update_own on public.investment_transactions;
drop policy if exists investment_transactions_delete_own on public.investment_transactions;
create policy investment_transactions_select_own on public.investment_transactions for select to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy investment_transactions_insert_own on public.investment_transactions for insert to authenticated with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy investment_transactions_update_own on public.investment_transactions for update to authenticated using (user_id = auth.uid() and public.is_workspace_member(workspace_id)) with check (user_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy investment_transactions_delete_own on public.investment_transactions for delete to authenticated using (user_id = auth.uid() and public.can_write_workspace(workspace_id));

grant select, insert, update, delete on table public.investment_sources to authenticated;
grant select, insert, update, delete on table public.investment_holdings to authenticated;
grant select, insert, update, delete on table public.investment_snapshots to authenticated;
grant select, insert, update, delete on table public.investment_transactions to authenticated;
