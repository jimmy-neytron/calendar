create table if not exists public.coupons (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  title text not null,
  merchant text not null default '',
  description text not null default '',
  discount_type text not null default 'percent' check (discount_type in ('percent', 'amount', 'text')),
  discount_value numeric not null default 0 check (discount_value >= 0),
  discount_label text not null default '',
  code_type text not null default 'promo' check (code_type in ('qr', 'barcode', 'promo', 'none')),
  code_value text not null default '',
  barcode_format text not null default 'code128' check (barcode_format in ('code128', 'ean13', 'ean8', 'upca')),
  expires_on date,
  terms text not null default '',
  color text not null default '#7c8cf8',
  is_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coupons_workspace_expiry_idx on public.coupons (workspace_id, is_used, expires_on);
alter table public.coupons enable row level security;

drop policy if exists coupons_select_member on public.coupons;
drop policy if exists coupons_insert_writer on public.coupons;
drop policy if exists coupons_update_writer on public.coupons;
drop policy if exists coupons_delete_writer on public.coupons;
create policy coupons_select_member on public.coupons for select to authenticated using (public.is_workspace_member(workspace_id));
create policy coupons_insert_writer on public.coupons for insert to authenticated with check (public.can_write_workspace(workspace_id));
create policy coupons_update_writer on public.coupons for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.can_write_workspace(workspace_id));
create policy coupons_delete_writer on public.coupons for delete to authenticated using (public.can_write_workspace(workspace_id));

grant select, insert, update, delete on table public.coupons to authenticated;
