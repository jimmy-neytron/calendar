begin;

-- Remove only the superseded store-catalog implementation. Meal planning and
-- user shopping tables are deliberately not touched.
drop table if exists public.magnit_catalog_items cascade;
drop table if exists public.magnit_catalog_snapshots cascade;
drop table if exists public.magnit_catalog_crawl_log cascade;
drop table if exists public.magnit_saved_prices cascade;
drop table if exists public.magnit_catalog_sources cascade;
drop function if exists public.claim_magnit_catalog_job();
drop function if exists public.complete_magnit_catalog_job(uuid, boolean, text);

create table public.store_catalog_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  store text not null default 'magnit' check (store in ('magnit')),
  store_code text not null check (char_length(trim(store_code)) between 1 and 80),
  url text not null check (url ~ '^https://'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  enabled boolean not null default true,
  last_synced_at timestamptz,
  next_sync_at timestamptz not null default now(),
  status text not null default 'idle' check (status in ('idle', 'syncing', 'success', 'error')),
  last_error text not null default '',
  product_count integer not null default 0 check (product_count >= 0),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, url)
);

create table public.store_products (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  store text not null default 'magnit' check (store in ('magnit')),
  product_code text not null check (char_length(trim(product_code)) between 1 and 120),
  name text not null check (char_length(trim(name)) between 1 and 300),
  normalized_name text not null,
  image_url text not null default '',
  product_url text not null default '',
  package_amount numeric(12, 3) check (package_amount > 0),
  package_unit text check (package_unit in ('g', 'ml', 'piece')),
  package_is_manual boolean not null default false,
  current_price numeric(12, 2) check (current_price >= 0),
  old_price numeric(12, 2) check (old_price >= 0),
  price_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, store, product_code),
  check ((package_amount is null) = (package_unit is null))
);

create table public.store_source_products (
  source_id uuid not null references public.store_catalog_sources(id) on delete cascade,
  product_id uuid not null references public.store_products(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (source_id, product_id)
);

create table public.store_product_price_history (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.store_products(id) on delete cascade,
  store text not null default 'magnit',
  price numeric(12, 2) not null check (price >= 0),
  old_price numeric(12, 2) check (old_price >= 0),
  received_at timestamptz not null default now()
);

create table public.meal_ingredient_product_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  ingredient_name text not null check (char_length(trim(ingredient_name)) between 1 and 160),
  normalized_ingredient_name text not null,
  ingredient_unit text not null check (ingredient_unit in ('g', 'ml', 'piece')),
  product_id uuid not null references public.store_products(id) on delete cascade,
  package_amount_override numeric(12, 3) check (package_amount_override > 0),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, normalized_ingredient_name, ingredient_unit)
);

create index store_catalog_sources_due_idx on public.store_catalog_sources (next_sync_at) where enabled;
create index store_products_search_idx on public.store_products (workspace_id, normalized_name);
create index store_source_products_product_idx on public.store_source_products (product_id);
create index store_product_price_history_product_received_idx on public.store_product_price_history (product_id, received_at desc);
create index meal_ingredient_product_links_workspace_idx on public.meal_ingredient_product_links (workspace_id);

alter table public.store_catalog_sources enable row level security;
alter table public.store_products enable row level security;
alter table public.store_source_products enable row level security;
alter table public.store_product_price_history enable row level security;
alter table public.meal_ingredient_product_links enable row level security;

create policy store_catalog_sources_admin_all on public.store_catalog_sources for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy store_products_admin_all on public.store_products for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy store_source_products_admin_all on public.store_source_products for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy store_product_price_history_admin_all on public.store_product_price_history for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy meal_ingredient_product_links_admin_all on public.meal_ingredient_product_links for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

grant select, insert, update, delete on public.store_catalog_sources, public.store_products,
  public.store_source_products, public.store_product_price_history, public.meal_ingredient_product_links to authenticated;
grant usage, select on sequence public.store_product_price_history_id_seq to authenticated;

commit;
notify pgrst, 'reload schema';
