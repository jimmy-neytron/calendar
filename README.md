# Семейное пространство — v1.9.0

Семейное пространство на Vue 3 с авторизацией, хранением и синхронизацией данных через Supabase. Календарь остаётся главным разделом и связывает общие планы с бюджетом, важными датами, покупками, спортом, идеями и другими областями семейной жизни.

## Возможности

- регистрация и вход через Supabase Auth;
- общие пространства с ролями `owner`, `admin`, `member` и `viewer`;
- приглашения участников по коду;
- календарь в режимах месяца, недели и дня;
- повторяющиеся события, напоминания, участники, комментарии, фильтры и drag & drop;
- Realtime-уведомления о событиях и комментариях;
- бюджетирование с периодами, категориями, регулярными платежами и связью с календарём;
- недельное меню, собственные блюда, необязательный расчёт калорий и список продуктов;
- программы тренировок и отметки выполнения;
- проекты и записи учёта времени;
- идеи, дни рождения, фильмы и сериалы;
- интерактивное семейное дерево на Cytoscape с поиском, фильтрами и JSON-импортом/экспортом;
- журнал активности и аналитика;
- тарифы `free`, `plus` и `pro`, а также функции пространства;
- административный раздел для пользователей, заявок, аналитики и глобальных модальных сообщений;
- Telegram-интеграция с ежедневной сводкой для Pro-пользователей;
- PWA, светлая и тёмная темы, импорт и экспорт данных.

## Технологии

- Vue 3 и Composition API;
- TanStack Vue Query для серверного состояния и кэширования;
- Vue Router;
- Vite;
- Supabase Auth, PostgreSQL, Row Level Security, Realtime, RPC и Edge Functions;
- TypeScript и JavaScript;
- Vitest;
- Chart.js;
- Tiptap;
- TMDB API.

## Supabase

Supabase является основным backend приложения:

- `auth.users` отвечает за учётные записи и сессии;
- `profiles` расширяет пользователя профилем, ролью и тарифом;
- данные приложения хранятся в PostgreSQL и разделяются по `workspace_id`;
- RLS ограничивает доступ участниками пространства и их ролями;
- клиент сохраняет сессию, автоматически обновляет токен и синхронизирует коллекции с backend;
- Realtime используется для доставки уведомлений между устройствами;
- RPC обслуживают операции, которым нужна серверная проверка прав;
- Edge Functions реализуют Telegram webhook и ежедневную сводку.

### Основные таблицы

| Область | Таблицы |
| --- | --- |
| Пользователи и пространства | `profiles`, `workspaces`, `workspace_members`, `workspace_invites`, `workspace_features` |
| Календарь | `calendar_collections`, `events` |
| Семейное дерево | `family_trees` (документ JSONB на пространство) |
| Совместная работа | `notifications`, `activity_entries` |
| Личные разделы | `ideas`, `birthdays`, `movie_watchlist` |
| Спорт | `sport_exercises`, `sport_completions` |
| Бюджет | `budget_months`, `budget_categories`, `budget_recurring_rules`, `budget_payments` |
| Питание | `meal_recipes`, `meal_weeks` |
| Учёт времени | `time_projects`, `time_entries` |
| Приложение и администрирование | `app_releases`, `landing_leads`, `admin_modals`, `admin_user_modal_overrides` |
| Интеграции | `telegram_connections`, `telegram_link_codes` |

Связи строятся вокруг пользователя и пространства: профиль связан с `auth.users`, пользователь входит в пространства через `workspace_members`, а рабочие сущности принадлежат конкретному `workspace_id`. Платежи, дни рождения, идеи и фильмы могут быть связаны с событиями календаря.

## Локальный запуск

Требуется Node.js 24 (минимум 22.18.0) внутри WSL и проект Supabase с применёнными миграциями.

1. Установите зависимости:

   ```bash
   npm install
   ```

2. Создайте `.env` на основе `.env.example`:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

   # Для раздела «Фильмы и сериалы»
   VITE_TMDB_READ_ACCESS_TOKEN=YOUR_TMDB_READ_ACCESS_TOKEN
   # Либо TMDB API v3 key:
   # VITE_TMDB_API_KEY=YOUR_TMDB_API_KEY

   # Для кнопки подключения Telegram
   VITE_TELEGRAM_BOT_USERNAME=your_bot_username
   ```

   Во frontend используется только публичный publishable/anon key. `service_role` нельзя добавлять в `.env` Vite или публиковать в клиентском коде.

3. Запустите приложение:

   ```bash
   npm run dev
   ```

## Подготовка базы данных

SQL находится в каталоге `supabase/migrations`.

- `backend.sql` содержит базовую схему backend;
- датированные миграции добавляют модули бюджета, спорта, учёта времени, уведомлений, подписок, административных функций и интеграций;
- миграции следует применять по дате, не пропуская более ранние зависимости;
- SQL-схема, экспортированная из Supabase только для справки, не должна повторно выполняться поверх рабочей базы.

После применения миграций backend можно проверить скриптами:

```text
supabase/diagnostics/verify_backend.sql
supabase/diagnostics/check_event_reminder.sql
```

Запускайте их в Supabase SQL Editor. Они предназначены для диагностики текущей схемы и логики напоминаний.

## Telegram-интеграция

Интеграция состоит из таблиц и RPC из миграции `20260706_telegram_integrations.sql`, а также двух Edge Functions:

```text
supabase/functions/telegram-webhook/index.ts
supabase/functions/telegram-daily-digest/index.ts
```

Для Edge Functions нужны секреты:

```env
TELEGRAM_BOT_TOKEN=123456:telegram-token
TELEGRAM_WEBHOOK_SECRET=random-long-secret
DIGEST_CRON_SECRET=another-random-long-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Секреты задаются в Supabase и не передаются во frontend. Полная инструкция по webhook, cron-задаче и публикации функций находится в `supabase/functions/README-telegram.md`.

## Команды

```bash
npm run dev         # сервер разработки
npm run build       # production-сборка
npm run preview     # локальный просмотр сборки
npm run test        # тесты Vitest
npm run test:watch  # тесты в watch-режиме
npm run icons:pwa   # генерация PWA-иконок (PowerShell)
```

## Структура проекта

```text
src/
  app/
    api/supabase/       # клиент Supabase и API-слой
    components/         # UI-компоненты по предметным областям
    composables/        # переиспользуемая логика
    modules/            # admin, integrations, full-focus
    pages/              # страницы приложения
    query/              # QueryClient и централизованные ключи серверного кэша
    repositories/       # локальный кэш и синхронизация коллекций
    services/           # backend и внешние сервисы
    stores/             # состояние предметных областей
supabase/
  diagnostics/          # SQL-проверки backend
  functions/            # Supabase Edge Functions
  imports/              # подготовленные импорты данных
  migrations/           # схема и последовательные миграции
```

## Архитектурная документация

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — слои, границы состояния и правила Query.
- [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md) — Node 24, зафиксированные версии и установка в WSL.

## Безопасность

- не коммитьте `.env` и секреты Edge Functions;
- не используйте `SUPABASE_SERVICE_ROLE_KEY` в браузере;
- все новые таблицы workspace-данных должны иметь корректные RLS-политики;
- проверяйте права не только в интерфейсе, но и на уровне PostgreSQL/RPC;
- перед production-деплоем выполните тесты, сборку и диагностические SQL-скрипты.
