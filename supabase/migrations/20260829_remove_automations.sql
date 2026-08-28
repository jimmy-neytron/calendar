-- Roll back the removed automations module.
-- CASCADE removes policies and indexes that belong to the table.
drop table if exists public.automations cascade;
