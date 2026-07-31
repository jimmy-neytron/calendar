begin;

alter table public.wardrobe_looks
  add column if not exists layout jsonb not null default '[]'::jsonb;

alter table public.wardrobe_looks
  drop constraint if exists wardrobe_looks_layout_is_array;

alter table public.wardrobe_looks
  add constraint wardrobe_looks_layout_is_array check (jsonb_typeof(layout) = 'array');

commit;
