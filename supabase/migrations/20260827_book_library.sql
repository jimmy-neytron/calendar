create table if not exists public.book_library (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  source text not null check (source in ('internet-archive', 'wikisource', 'google-books', 'open-library', 'gutendex')),
  source_id text not null,
  title text not null,
  authors text[] not null default '{}',
  description text not null default '',
  cover_url text not null default '',
  published_year integer,
  language text not null default 'ru',
  subjects text[] not null default '{}',
  isbn text not null default '',
  page_count integer not null default 0 check (page_count >= 0),
  rating numeric not null default 0 check (rating >= 0),
  source_url text not null default '',
  read_url text not null default '',
  access_type text not null default 'catalog' check (access_type in ('public-access', 'public-domain', 'open-license', 'borrow', 'preview', 'catalog')),
  download_urls jsonb not null default '{}'::jsonb,
  available_sources text[] not null default '{}',
  status text not null default 'want-to-read' check (status in ('want-to-read', 'reading', 'read')),
  progress integer not null default 0 check (progress between 0 and 100),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (workspace_id, source, source_id)
);

alter table public.book_library enable row level security;

drop policy if exists "book_library_select_members" on public.book_library;
create policy "book_library_select_members"
on public.book_library for select
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = book_library.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

drop policy if exists "book_library_insert_members" on public.book_library;
create policy "book_library_insert_members"
on public.book_library for insert
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = book_library.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

drop policy if exists "book_library_update_members" on public.book_library;
create policy "book_library_update_members"
on public.book_library for update
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = book_library.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = book_library.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

drop policy if exists "book_library_delete_members" on public.book_library;
create policy "book_library_delete_members"
on public.book_library for delete
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = book_library.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

create index if not exists book_library_workspace_status_idx
  on public.book_library (workspace_id, status, updated_at desc);
