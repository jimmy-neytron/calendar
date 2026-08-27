# Telegram integration setup

Эта интеграция рассчитана на простой и безопасный MVP:

- фронт только создает временный код и включает/выключает ежедневную сводку;
- `service_role` используется только внутри Edge Functions;
- подключение доступно только пользователям с `subscription_tier = 'pro'`;
- код подключения одноразовый и живет 15 минут;
- ежедневная рассылка идет в 08:00 по Москве, то есть в 05:00 UTC.

## 1. SQL

В Supabase SQL Editor выполните миграцию:

`supabase/migrations/20260706_telegram_integrations.sql`

Она создаст:

- `telegram_connections` - привязанный Telegram chat id пользователя;
- `telegram_link_codes` - временные коды подключения;
- RPC для фронта:
  - `get_my_telegram_integration`
  - `create_telegram_link_code`
  - `set_telegram_digest_enabled`
  - `disconnect_telegram`

## 2. Telegram bot

Создайте бота через `@BotFather` и сохраните:

- bot token;
- username бота без `@`.

Во фронтовом `.env` добавьте:

```env
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
```

После изменения env фронт нужно пересобрать/перезапустить.

## 3. Supabase secrets

В Supabase добавьте secrets для Edge Functions:

```env
TELEGRAM_BOT_TOKEN=123456:telegram-token
TELEGRAM_WEBHOOK_SECRET=random-long-secret
DIGEST_CRON_SECRET=another-random-long-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_URL` обычно доступен в Edge Functions автоматически. Если в вашем проекте его нет, добавьте его тоже.

## 4. Edge Functions через Supabase UI

Создайте две функции:

- `telegram-webhook`
- `telegram-daily-digest`

Вставьте код из файлов:

- `supabase/functions/telegram-webhook/index.ts`
- `supabase/functions/telegram-daily-digest/index.ts`

Для обеих функций отключите JWT verification, потому что:

- Telegram не умеет отправлять Supabase JWT в webhook;
- cron будет защищен отдельным заголовком `x-cron-secret`.

## 5. Telegram webhook

После публикации `telegram-webhook` выполните в браузере или через curl:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

Проверить webhook:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

## 6. Расписание на 08:00 по Москве

08:00 по Москве = 05:00 UTC.

В Supabase SQL Editor можно создать cron-задачу через `pg_cron` + `pg_net`:

```sql
select cron.schedule(
  'telegram-daily-digest-8-msk',
  '0 5 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/telegram-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<DIGEST_CRON_SECRET>'
    ),
    body := '{"source":"cron"}'::jsonb
  );
  $$
);
```

Если `cron` или `net` еще не включены:

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
```

## 7. Как работает подключение

1. Пользователь открывает `/integrations`.
2. Нажимает `Подключить Telegram`.
3. Фронт вызывает `create_telegram_link_code`.
4. Пользователь открывает ссылку вида `https://t.me/your_bot?start=CODE`.
5. Telegram отправляет webhook в `telegram-webhook`.
6. Функция проверяет код, Pro-тариф и сохраняет `telegram_chat_id`.
7. `telegram-daily-digest` каждый день отправляет сводку тем, кто включил интеграцию.

Текст сводки отправляется с `parse_mode: HTML`: разделы и названия выделяются жирным, дополнительная информация — курсивом, а промокоды — моноширинным текстом для удобного копирования. Динамические значения экранируются перед отправкой.

## Купоны в ежедневной сводке

Сводка загружает активные купоны из пространств пользователя и добавляет один компактный блок `Купоны рядом`:

- максимум 3 купона: функция старается взять по одному ближайшему промокоду, QR-коду и штрихкоду, а свободные места заполняет следующими по сроку;
- использованные и истёкшие купоны исключаются;
- если купонов со сроком нет, показывается один бессрочный;
- предложения группируются по магазину;
- промокод выводится целиком;
- QR-коды и штрихкоды генерируются как PNG и отправляются после текста; несколько кодов объединяются в один Telegram-альбом.

Изображения генерируются в памяти Edge Function и не сохраняются в Supabase Storage. Один код отправляется через `sendPhoto`, а от двух до трёх кодов — через `sendMediaGroup`.

## Ручная проверка сводки

Функция поддерживает защищённый тестовый режим. Он отправляет сводку только указанному пользователю и позволяет повторить отправку в тот же день:

```json
{
  "source": "manual-test",
  "targetUserId": "00000000-0000-4000-8000-000000000000",
  "force": true
}
```

Запрос должен содержать тот же заголовок `x-cron-secret`, который использует cron. `force: true` без `targetUserId` отклоняется, поэтому тест не может случайно запустить повторную рассылку всем пользователям. Обычный cron с телом `{"source":"cron"}` продолжает работать без изменений.

Те же параметры можно передать через URL, что удобно для запуска на основе существующей команды cron:

```text
/telegram-daily-digest?targetUserId=00000000-0000-4000-8000-000000000000&force=true
```
