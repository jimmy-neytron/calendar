begin;

create table if not exists public.purchase_wishlist (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '' check (char_length(description) <= 4000),
  category text not null default 'other' check (category in ('tools', 'electronics', 'home', 'clothes', 'hobby', 'other')),
  status text not null default 'wanted' check (status in ('wanted', 'thinking', 'bought')),
  product_url text not null default '' check (char_length(product_url) <= 2048),
  image_url text not null default '' check (char_length(image_url) <= 2048),
  source text not null default '' check (char_length(source) <= 120),
  current_price numeric(14, 2) not null default 0 check (current_price >= 0),
  target_price numeric(14, 2) not null default 0 check (target_price >= 0),
  currency text not null default 'RUB' check (currency ~ '^[A-Z]{3}$'),
  priority smallint not null default 0 check (priority between 0 and 3),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.purchase_wishlist enable row level security;

grant select, insert, update, delete on table public.purchase_wishlist to authenticated;

drop policy if exists purchase_wishlist_select_members on public.purchase_wishlist;
create policy purchase_wishlist_select_members
  on public.purchase_wishlist for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    and public.user_has_subscription_feature(auth.uid(), 'extrasections')
  );

drop policy if exists purchase_wishlist_insert_members on public.purchase_wishlist;
create policy purchase_wishlist_insert_members
  on public.purchase_wishlist for insert to authenticated
  with check (
    public.can_write_workspace(workspace_id)
    and created_by = auth.uid()
    and public.user_has_subscription_feature(auth.uid(), 'extrasections')
  );

drop policy if exists purchase_wishlist_update_members on public.purchase_wishlist;
create policy purchase_wishlist_update_members
  on public.purchase_wishlist for update to authenticated
  using (
    public.can_write_workspace(workspace_id)
    and public.user_has_subscription_feature(auth.uid(), 'extrasections')
  )
  with check (
    public.can_write_workspace(workspace_id)
    and public.user_has_subscription_feature(auth.uid(), 'extrasections')
  );

drop policy if exists purchase_wishlist_delete_members on public.purchase_wishlist;
create policy purchase_wishlist_delete_members
  on public.purchase_wishlist for delete to authenticated
  using (
    public.can_write_workspace(workspace_id)
    and public.user_has_subscription_feature(auth.uid(), 'extrasections')
  );

create index if not exists purchase_wishlist_workspace_status_idx
  on public.purchase_wishlist (workspace_id, status, priority desc, created_at desc);

commit;
