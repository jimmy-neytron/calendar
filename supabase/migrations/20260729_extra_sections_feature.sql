alter table public.workspace_features
  add column if not exists extra_sections_enabled boolean not null default true;

update public.workspace_features
set extra_sections_enabled = true
where extra_sections_enabled is null;
