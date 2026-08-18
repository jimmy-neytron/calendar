-- Проекты и записи учёта времени принадлежат конкретному пользователю,
-- даже если несколько пользователей работают в одном семейном пространстве.
alter table public.time_projects
  add column if not exists owner_id uuid references public.profiles(id) on delete cascade;

drop index if exists public.time_projects_workspace_name_idx;

-- Старый общий проект получает владельца самой ранней записи. Дополнительная
-- сортировка по user_id даёт стабильный результат при одинаковом времени.
update public.time_projects as project
set owner_id = primary_owner.user_id
from (
  select distinct on (entry_owner.project_id)
    entry_owner.project_id,
    entry_owner.user_id
  from (
    select
      entry.project_id,
      entry.user_id,
      min(entry.created_at) as first_entry_at
    from public.time_entries as entry
    group by entry.project_id, entry.user_id
  ) as entry_owner
  order by
    entry_owner.project_id,
    entry_owner.first_entry_at,
    entry_owner.user_id::text
) as primary_owner
where project.id = primary_owner.project_id
  and project.owner_id is null;

-- Для остальных пользователей создаются личные копии проекта. Стабильный id
-- позволяет безопасно повторить миграцию после частично выполненного запуска.
insert into public.time_projects (
  id,
  workspace_id,
  owner_id,
  name,
  color,
  archived,
  created_at,
  updated_at
)
select
  project.id || '--owner--' || entry_owner.user_id::text,
  project.workspace_id,
  entry_owner.user_id,
  project.name,
  project.color,
  project.archived,
  project.created_at,
  project.updated_at
from public.time_projects as project
join (
  select distinct entry.project_id, entry.user_id
  from public.time_entries as entry
) as entry_owner on entry_owner.project_id = project.id
where project.owner_id is not null
  and entry_owner.user_id <> project.owner_id
on conflict (id) do nothing;

update public.time_entries as entry
set project_id = project.id || '--owner--' || entry.user_id::text
from public.time_projects as project
where entry.project_id = project.id
  and project.owner_id is not null
  and entry.user_id <> project.owner_id;

-- Проекты без записей невозможно атрибутировать точнее; они остаются владельцу
-- пространства, который исторически имел полный доступ к этим данным.
update public.time_projects as project
set owner_id = workspace.owner_id
from public.workspaces as workspace
where project.workspace_id = workspace.id
  and project.owner_id is null;

alter table public.time_projects
  alter column owner_id set default auth.uid(),
  alter column owner_id set not null;

create unique index if not exists time_projects_workspace_owner_name_idx
  on public.time_projects (workspace_id, owner_id, lower(name));
create index if not exists time_projects_workspace_owner_active_idx
  on public.time_projects (workspace_id, owner_id, archived, name);
create index if not exists time_entries_workspace_user_date_idx
  on public.time_entries (workspace_id, user_id, date desc, created_at desc);

drop policy if exists time_projects_select_members on public.time_projects;
drop policy if exists time_projects_write_members on public.time_projects;
drop policy if exists time_projects_insert_members on public.time_projects;
drop policy if exists time_projects_update_members on public.time_projects;
drop policy if exists time_projects_delete_members on public.time_projects;
drop policy if exists time_projects_select_own on public.time_projects;
drop policy if exists time_projects_insert_own on public.time_projects;
drop policy if exists time_projects_update_own on public.time_projects;
drop policy if exists time_projects_delete_own on public.time_projects;

create policy time_projects_select_own
  on public.time_projects for select to authenticated
  using (owner_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy time_projects_insert_own
  on public.time_projects for insert to authenticated
  with check (owner_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy time_projects_update_own
  on public.time_projects for update to authenticated
  using (owner_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (owner_id = auth.uid() and public.can_write_workspace(workspace_id));
create policy time_projects_delete_own
  on public.time_projects for delete to authenticated
  using (owner_id = auth.uid() and public.can_write_workspace(workspace_id));

drop policy if exists time_entries_select_members on public.time_entries;
drop policy if exists time_entries_write_members on public.time_entries;
drop policy if exists time_entries_insert_members on public.time_entries;
drop policy if exists time_entries_update_members on public.time_entries;
drop policy if exists time_entries_delete_members on public.time_entries;
drop policy if exists time_entries_select_own on public.time_entries;
drop policy if exists time_entries_insert_own on public.time_entries;
drop policy if exists time_entries_update_own on public.time_entries;
drop policy if exists time_entries_delete_own on public.time_entries;

create policy time_entries_select_own
  on public.time_entries for select to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy time_entries_insert_own
  on public.time_entries for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_write_workspace(workspace_id)
    and exists (
      select 1
      from public.time_projects as project
      where project.id = time_entries.project_id
        and project.workspace_id = time_entries.workspace_id
        and project.owner_id = auth.uid()
    )
  );
create policy time_entries_update_own
  on public.time_entries for update to authenticated
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (
    user_id = auth.uid()
    and public.can_write_workspace(workspace_id)
    and exists (
      select 1
      from public.time_projects as project
      where project.id = time_entries.project_id
        and project.workspace_id = time_entries.workspace_id
        and project.owner_id = auth.uid()
    )
  );
create policy time_entries_delete_own
  on public.time_entries for delete to authenticated
  using (user_id = auth.uid() and public.can_write_workspace(workspace_id));

-- Закрываем обход приватности гардероба через прямой запрос к Storage.
-- Владелец видит все свои изображения, остальные участники — только фото
-- вещей, которые явно отмечены как общие.
drop policy if exists wardrobe_images_select_members on storage.objects;
drop policy if exists wardrobe_images_select_visible on storage.objects;
create policy wardrobe_images_select_visible
  on storage.objects for select to authenticated
  using (
    bucket_id = 'wardrobe-images'
    and public.is_workspace_member((storage.foldername(name))[1])
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or exists (
        select 1
        from public.wardrobe_items as item
        where item.workspace_id = (storage.foldername(name))[1]
          and item.image_path = storage.objects.name
          and item.visibility = 'shared'
      )
    )
  );
