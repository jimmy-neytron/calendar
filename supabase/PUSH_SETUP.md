# Настройка push-напоминаний

1. Применить миграцию:

   ```bash
   supabase db push
   ```

2. Сгенерировать VAPID-ключи:

   ```bash
   pnpm vapid:generate
   ```

3. Добавить `VITE_VAPID_PUBLIC_KEY` в `.env` фронтенда и пересобрать PWA.

4. Добавить секреты Edge Function:

   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
   ```

5. Развернуть функцию:

   ```bash
   supabase functions deploy send-event-reminder-push
   ```

6. В Supabase Dashboard открыть **Database → Webhooks** и создать webhook:

   - таблица: `public.notifications`;
   - событие: `INSERT`;
   - назначение: Edge Function `send-event-reminder-push`;
   - добавить Authorization header с service-role key.

Edge Function сама пропускает уведомления, у которых `payload.type` не равен
`event_reminder`.

Cron создаётся миграцией и запускается каждый час в `00` минут.
