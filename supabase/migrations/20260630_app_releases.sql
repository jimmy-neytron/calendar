create table if not exists public.app_releases (
  id text primary key,
  version text not null,
  release_date_label text not null,
  title text not null,
  icon text not null default 'sparkles',
  summary text not null,
  cards jsonb not null default '[]'::jsonb,
  details jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_releases enable row level security;

drop policy if exists "Authenticated users can read app releases" on public.app_releases;
create policy "Authenticated users can read app releases"
on public.app_releases
for select
to authenticated
using (is_published = true);

insert into public.app_releases (
  id,
  version,
  release_date_label,
  title,
  icon,
  summary,
  cards,
  details,
  sort_order,
  is_published
) values (
  'release-v2',
  'release-v2',
  'Июнь 2026',
  'Рабочие пространства, тарифы и связи календаря',
  'sparkles',
  'Большой релиз по сравнению с master: появились тарифы, управление фичами, локальные напоминания, связи календаря с бюджетом и днями рождения, а также первые unit-тесты.',
  '[
    {
      "title": "Тарифы и доступы",
      "text": "Free, Plus и Pro теперь управляют лимитами пространств и доступом к премиум-разделам.",
      "icon": "star"
    },
    {
      "title": "Календарные связи",
      "text": "Дни рождения и бюджетные платежи получили двустороннюю связь с событиями календаря.",
      "icon": "calendar"
    },
    {
      "title": "Уведомления без лишнего",
      "text": "Push-крон заменен локальными напоминаниями, а realtime-уведомления стали чище.",
      "icon": "activity"
    },
    {
      "title": "Надежнее внутри",
      "text": "Обновлены сторы, синхронизация коллекций, миграции Supabase и добавлены первые тесты календаря.",
      "icon": "settings"
    }
  ]'::jsonb,
  '[
    "Появились тарифы Free, Plus и Pro с лимитами пространств и доступом к премиум-разделам.",
    "Добавлено управление доступностью бюджета и учета времени на уровне рабочего пространства.",
    "Push-уведомления заменены на локальные напоминания о событиях без cron и внешнего push-сервиса.",
    "Уведомления стали чище: добавлена realtime-загрузка и фильтрация допустимых типов.",
    "Дни рождения получили двустороннюю связь с событиями календаря.",
    "Платежи бюджета получили двустороннюю связь с событиями календаря.",
    "Синхронизация коллекций стала стабильнее: связанные сущности мапятся единообразно, а отключенные разделы не пишут лишние операции.",
    "Сторы бюджета, дней рождения, идей, фильмов, уведомлений и календаря обновлены под новые связи и рабочие пространства.",
    "Добавлены первые unit-тесты для calendar store.",
    "Supabase получил новые миграции для подписок, фич пространства, realtime-уведомлений и целостности календарных связей."
  ]'::jsonb,
  200,
  true
)
on conflict (id) do update set
  version = excluded.version,
  release_date_label = excluded.release_date_label,
  title = excluded.title,
  icon = excluded.icon,
  summary = excluded.summary,
  cards = excluded.cards,
  details = excluded.details,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  updated_at = now();
