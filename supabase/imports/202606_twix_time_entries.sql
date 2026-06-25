do $$
declare
  target_user_id uuid := '8fb2c762-134b-4986-ace7-52305674e03d';
  target_workspace_id text;
  target_project_id text;
  project_count integer;
begin
  select count(*)
  into project_count
  from public.time_projects
  where lower(trim(name)) = lower('ТВИКС');

  if project_count = 0 then
    raise exception 'Проект «ТВИКС» не найден в public.time_projects';
  end if;

  if project_count > 1 then
    raise exception 'Найдено несколько проектов «ТВИКС». Укажите target_project_id вручную.';
  end if;

  select id, workspace_id
  into target_project_id, target_workspace_id
  from public.time_projects
  where lower(trim(name)) = lower('ТВИКС')
  limit 1;

  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
  ) then
    raise exception 'Профиль % не найден в public.profiles', target_user_id;
  end if;

  insert into public.time_entries (
    id,
    workspace_id,
    project_id,
    user_id,
    date,
    minutes,
    note,
    created_at,
    updated_at
  )
  values
    (
      '4e1d3f2e-b0eb-4523-87ec-390c82e12352',
      target_workspace_id,
      target_project_id,
      target_user_id,
      '2026-06-17',
      150,
      'Делал exchange общедоступной страницей, разбирался и вынес комопненты для (авт и не авт) юзеров',
      '2026-06-17T14:02:49.106212+00:00',
      '2026-06-17T14:02:49.106212+00:00'
    ),
    (
      '7fd653cd-ef33-4820-af1f-d013770a91d6',
      target_workspace_id,
      target_project_id,
      target_user_id,
      '2026-06-16',
      120,
      'Разбирался с сокетами чтобы записи шли в нормальном и правильном порядке',
      '2026-06-16T12:53:58.097856+00:00',
      '2026-06-16T12:53:58.097856+00:00'
    ),
    (
      '4e96bb0c-b65e-4e8c-ae90-240c1a243d66',
      target_workspace_id,
      target_project_id,
      target_user_id,
      '2026-06-11',
      180,
      E'Токен авторизации правил и вспоминал что делал\nправил страницы в профиле (комменты, посты, логи)\nДобавил в статистику межбанк и диплинк',
      '2026-06-11T10:55:55.550139+00:00',
      '2026-06-11T11:52:44.464223+00:00'
    ),
    (
      '9ce9ed4a-91fe-4a07-806c-9b4765c1a349',
      target_workspace_id,
      target_project_id,
      target_user_id,
      '2026-06-09',
      60,
      'Делал пагинацию на таблицы пользаков и историю сделок',
      '2026-06-09T19:39:05.655834+00:00',
      '2026-06-09T19:39:05.655834+00:00'
    )
  on conflict (id) do nothing;

  raise notice 'Импорт завершён: проект %, пространство %, июнь — 8.5 часа',
    target_project_id,
    target_workspace_id;
end
$$;

select
  time_entries.date,
  time_entries.minutes,
  time_entries.note
from public.time_entries
join public.time_projects
  on time_projects.id = time_entries.project_id
where time_entries.user_id = '8fb2c762-134b-4986-ace7-52305674e03d'
  and lower(time_projects.name) = lower('ТВИКС')
  and time_entries.date between '2026-06-01' and '2026-06-30'
order by time_entries.date;
