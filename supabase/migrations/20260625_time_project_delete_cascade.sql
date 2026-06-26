alter table public.time_entries
  drop constraint if exists time_entries_project_id_fkey;

alter table public.time_entries
  add constraint time_entries_project_id_fkey
  foreign key (project_id)
  references public.time_projects(id)
  on delete cascade;
