create table if not exists public.movie_watchlist (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  original_title text not null default '',
  overview text not null default '',
  poster_path text not null default '',
  backdrop_path text not null default '',
  release_date date,
  vote_average numeric not null default 0,
  vote_count integer not null default 0,
  popularity numeric not null default 0,
  genre_ids integer[] not null default '{}',
  planned_event_id text references public.events(id) on delete set null,
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, media_type, tmdb_id)
);

alter table public.movie_watchlist enable row level security;

drop policy if exists "movie_watchlist_select_members" on public.movie_watchlist;
create policy "movie_watchlist_select_members"
on public.movie_watchlist for select
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = movie_watchlist.workspace_id
      and workspace_members.user_id = auth.uid()
  )
);

drop policy if exists "movie_watchlist_insert_members" on public.movie_watchlist;
create policy "movie_watchlist_insert_members"
on public.movie_watchlist for insert
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = movie_watchlist.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

drop policy if exists "movie_watchlist_update_members" on public.movie_watchlist;
create policy "movie_watchlist_update_members"
on public.movie_watchlist for update
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = movie_watchlist.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
)
with check (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = movie_watchlist.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

drop policy if exists "movie_watchlist_delete_members" on public.movie_watchlist;
create policy "movie_watchlist_delete_members"
on public.movie_watchlist for delete
using (
  exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = movie_watchlist.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'member')
  )
);

create index if not exists movie_watchlist_workspace_added_idx
  on public.movie_watchlist (workspace_id, added_at desc);
