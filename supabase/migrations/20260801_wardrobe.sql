begin;

create table if not exists public.wardrobe_items (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  category text not null check (category in ('top','bottom','outerwear','shoes','accessory','onepiece')),
  color text not null default '#64748b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  seasons text[] not null default '{}',
  brand text not null default '' check (char_length(brand) <= 120),
  size text not null default '' check (char_length(size) <= 40),
  note text not null default '' check (char_length(note) <= 2000),
  image_path text not null default '' check (char_length(image_path) <= 500),
  status text not null default 'available' check (status in ('available','laundry','archived')),
  visibility text not null default 'private' check (visibility in ('private','shared')),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wardrobe_looks (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  item_ids text[] not null default '{}' check (cardinality(item_ids) between 1 and 30),
  occasion text not null default 'everyday' check (occasion in ('everyday','work','outing','sport','home','other')),
  note text not null default '' check (char_length(note) <= 2000),
  visibility text not null default 'private' check (visibility in ('private','shared')),
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wardrobe_items enable row level security;
alter table public.wardrobe_looks enable row level security;
grant select,insert,update,delete on public.wardrobe_items, public.wardrobe_looks to authenticated;

drop policy if exists wardrobe_items_select_visible on public.wardrobe_items;
create policy wardrobe_items_select_visible on public.wardrobe_items for select to authenticated using (public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(),'extrasections') and (owner_id=auth.uid() or visibility='shared'));
drop policy if exists wardrobe_items_insert_owner on public.wardrobe_items;
create policy wardrobe_items_insert_owner on public.wardrobe_items for insert to authenticated with check (public.can_write_workspace(workspace_id) and owner_id=auth.uid() and public.user_has_subscription_feature(auth.uid(),'extrasections'));
drop policy if exists wardrobe_items_update_owner on public.wardrobe_items;
create policy wardrobe_items_update_owner on public.wardrobe_items for update to authenticated using (owner_id=auth.uid() and public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(),'extrasections')) with check (owner_id=auth.uid() and public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(),'extrasections'));
drop policy if exists wardrobe_items_delete_owner on public.wardrobe_items;
create policy wardrobe_items_delete_owner on public.wardrobe_items for delete to authenticated using (owner_id=auth.uid() and public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(),'extrasections'));

drop policy if exists wardrobe_looks_select_visible on public.wardrobe_looks;
create policy wardrobe_looks_select_visible on public.wardrobe_looks for select to authenticated using (public.is_workspace_member(workspace_id) and public.user_has_subscription_feature(auth.uid(),'extrasections') and (owner_id=auth.uid() or visibility='shared'));
drop policy if exists wardrobe_looks_insert_owner on public.wardrobe_looks;
create policy wardrobe_looks_insert_owner on public.wardrobe_looks for insert to authenticated with check (public.can_write_workspace(workspace_id) and owner_id=auth.uid() and public.user_has_subscription_feature(auth.uid(),'extrasections'));
drop policy if exists wardrobe_looks_update_owner on public.wardrobe_looks;
create policy wardrobe_looks_update_owner on public.wardrobe_looks for update to authenticated using (owner_id=auth.uid() and public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(),'extrasections')) with check (owner_id=auth.uid() and public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(),'extrasections'));
drop policy if exists wardrobe_looks_delete_owner on public.wardrobe_looks;
create policy wardrobe_looks_delete_owner on public.wardrobe_looks for delete to authenticated using (owner_id=auth.uid() and public.can_write_workspace(workspace_id) and public.user_has_subscription_feature(auth.uid(),'extrasections'));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('wardrobe-images','wardrobe-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists wardrobe_images_select_members on storage.objects;
create policy wardrobe_images_select_members on storage.objects for select to authenticated using (bucket_id='wardrobe-images' and public.is_workspace_member((storage.foldername(name))[1]));
drop policy if exists wardrobe_images_insert_owner on storage.objects;
create policy wardrobe_images_insert_owner on storage.objects for insert to authenticated with check (bucket_id='wardrobe-images' and public.can_write_workspace((storage.foldername(name))[1]) and (storage.foldername(name))[2]=auth.uid()::text and public.user_has_subscription_feature(auth.uid(),'extrasections'));
drop policy if exists wardrobe_images_delete_owner on storage.objects;
create policy wardrobe_images_delete_owner on storage.objects for delete to authenticated using (bucket_id='wardrobe-images' and (storage.foldername(name))[2]=auth.uid()::text);

create index if not exists wardrobe_items_workspace_owner_idx on public.wardrobe_items(workspace_id,owner_id,status,updated_at desc);
create index if not exists wardrobe_looks_workspace_owner_idx on public.wardrobe_looks(workspace_id,owner_id,updated_at desc);

commit;

