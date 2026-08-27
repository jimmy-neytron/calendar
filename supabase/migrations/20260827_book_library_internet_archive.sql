alter table if exists public.book_library
  drop constraint if exists book_library_source_check;

alter table if exists public.book_library
  add constraint book_library_source_check
  check (source in ('internet-archive', 'wikisource', 'google-books', 'open-library', 'gutendex'));

alter table if exists public.book_library
  drop constraint if exists book_library_access_type_check;

alter table if exists public.book_library
  add constraint book_library_access_type_check
  check (access_type in ('public-access', 'public-domain', 'open-license', 'borrow', 'preview', 'catalog'));
