-- Раздел книг удалён из приложения. DROP TABLE CASCADE также удаляет
-- связанные RLS-политики, индексы, ограничения и внешние зависимости.
drop table if exists public.book_library cascade;
