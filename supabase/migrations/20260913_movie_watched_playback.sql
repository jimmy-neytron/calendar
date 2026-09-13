alter table public.movie_watchlist
  add column if not exists watched_at timestamptz,
  add column if not exists kinopoisk_url text not null default '';
