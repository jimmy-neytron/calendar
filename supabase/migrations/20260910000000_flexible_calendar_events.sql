-- Optional scheduling constraints; existing events remain unchanged.
alter table public.events add column if not exists flexible_rule jsonb;
