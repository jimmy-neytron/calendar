# Supabase backend

## 1. Применить схему

1. Открой проект `rlfuunewcyeuvuhjwwpn` в Supabase.
2. Перейди в **SQL Editor** → **New query**.
3. Скопируй содержимое `supabase/migrations/202606210001_initial_backend.sql`.
4. Нажми **Run**.

Миграция создаёт профили, пространства, участников, приглашения, календари,
события, идеи, дни рождения, спорт, уведомления и историю действий. Для всех
пользовательских таблиц включён Row Level Security.

После первого входа приложение автоматически создаст личное пространство и
два базовых календаря. Старые данные из localStorage можно перенести кнопкой
**«Перенести старые данные в Supabase»** в настройках.

Если первая миграция уже применена, дополнительно выполни
`supabase/migrations/202606210002_fix_workspace_rls.sql`. Она исправляет
вложенное чтение участников, добавляет RPC `get_my_workspaces` и восстанавливает
профили пользователей, зарегистрированных до исправления.

Для окончательного восстановления уже созданного проекта выполни
`supabase/migrations/202606210003_repair_backend_bootstrap.sql`. Эта миграция
самодостаточна: чинит профили и членство, создаёт безопасный bootstrap
пространства и базовых календарей.

## 2. Настроить Auth

В **Authentication → URL Configuration** укажи:

- Site URL для разработки: `http://localhost:5173`
- Redirect URL: `http://localhost:5173/**`

В **Authentication → Providers → Email** можно оставить подтверждение email
включённым. Тогда после регистрации пользователь сначала подтвердит письмо.

## 3. Переменные окружения

Локальный `.env` уже настроен. Для другого окружения скопируй `.env.example`
и заполни:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Никогда не добавляй `service_role` или secret key во frontend.
