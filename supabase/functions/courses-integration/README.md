# Courses integration

Перед деплоем задайте secrets:

```bash
supabase secrets set COURSES_API_BASE_URL=https://YOUR_COURSES_PROJECT.supabase.co/functions/v1/courses-integration
supabase secrets set COURSES_TOKEN_ENCRYPTION_KEY=LONG_RANDOM_SECRET_AT_LEAST_32_CHARS
supabase functions deploy courses-integration
```

Функция календаря проверяет JWT пользователя, членство в пространстве и хранит токен Courses
только в зашифрованном виде. В клиент токен после подключения не возвращается.
